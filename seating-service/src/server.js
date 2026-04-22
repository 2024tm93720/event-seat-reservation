const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const client = require('prom-client');
const { v4: uuid } = require('uuid');
const { logger, httpLogger } = require('./logger');

const PORT = 8003;
const HOLD_TTL_MIN = parseInt(process.env.HOLD_TTL_MIN || '15');

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL || 'mysql://seating:pass@seating-db:3306/seating_db',
  connectionLimit: 10,
  enableKeepAlive: true,
  waitForConnections: true,
});

// Wait for DB
async function waitDB() {
  for (let i = 0; i < 30; i++) {
    try { await pool.query('SELECT 1'); logger.info({ i }, 'DB connected'); return; }
    catch (e) { logger.warn({ i, err: e.message }, 'DB not ready'); await new Promise(r => setTimeout(r, 2000)); }
  }
}

// Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const seatReservationsTotal = new client.Counter({ name: 'seat_reservations_total', help: 'Total seat reservations attempted', registers: [register] });
const seatReservationsFailed = new client.Counter({ name: 'seat_reservations_failed', help: 'Failed seat reservations', registers: [register] });
const seatHoldsActive = new client.Gauge({ name: 'seat_holds_active', help: 'Currently active seat holds', registers: [register] });

const app = express();
app.use(cors());
app.use(express.json());
app.use(httpLogger);

app.get('/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', service: 'seating-service' }); }
  catch (e) { res.status(503).json({ status: 'unhealthy', error: e.message }); }
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Cleanup expired holds (called each request and via interval)
async function cleanupExpired(conn) {
  const c = conn || pool;
  await c.query(`UPDATE seat_status s
                 JOIN seat_holds h ON h.seat_id=s.seat_id
                 SET s.status='AVAILABLE'
                 WHERE h.expires_at < NOW() AND s.status='HELD'`);
  await c.query(`DELETE FROM seat_holds WHERE expires_at < NOW()`);
}
setInterval(() => cleanupExpired().catch(e => logger.error({ err: e.message }, 'cleanup error')), 60000);

// GET /v1/seats?eventId=...
app.get('/v1/seats', async (req, res) => {
  const eventId = req.query.eventId;
  if (!eventId) return res.status(400).json({ error: 'eventId required' });
  await cleanupExpired();
  const [rows] = await pool.query('SELECT * FROM seat_status WHERE event_id=? ORDER BY seat_id', [eventId]);
  res.json(rows);
});

// POST /v1/seats/reserve  { orderId, userId, seatIds:[] }
app.post('/v1/seats/reserve', async (req, res) => {
  const { orderId, userId, seatIds } = req.body;
  if (!orderId || !userId || !Array.isArray(seatIds) || !seatIds.length) {
    return res.status(400).json({ error: 'orderId, userId, seatIds[] required' });
  }
  seatReservationsTotal.inc();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await cleanupExpired(conn);

    // Lock rows, check availability
    const [rows] = await conn.query(
      `SELECT seat_id, status, seat_price FROM seat_status WHERE seat_id IN (?) FOR UPDATE`,
      [seatIds]
    );
    if (rows.length !== seatIds.length) {
      await conn.rollback();
      seatReservationsFailed.inc();
      return res.status(404).json({ error: 'Some seats not found' });
    }
    const unavailable = rows.filter(r => r.status !== 'AVAILABLE').map(r => r.seat_id);
    if (unavailable.length) {
      await conn.rollback();
      seatReservationsFailed.inc();
      return res.status(409).json({ error: 'Seats not available', seatIds: unavailable });
    }

    // Insert holds + flip status
    const expiresAt = new Date(Date.now() + HOLD_TTL_MIN * 60000);
    for (const seatId of seatIds) {
      await conn.query(
        `INSERT INTO seat_holds (seat_id, order_id, user_id, expires_at) VALUES (?,?,?,?)`,
        [seatId, orderId, userId, expiresAt]
      );
      await conn.query(`UPDATE seat_status SET status='HELD' WHERE seat_id=?`, [seatId]);
    }
    await conn.commit();
    seatHoldsActive.inc(seatIds.length);

    const total = rows.reduce((s, r) => s + Number(r.seat_price), 0);
    res.status(201).json({
      orderId, seatIds,
      expiresAt: expiresAt.toISOString(),
      subtotal: total,
      seats: rows.map(r => ({ seatId: r.seat_id, price: Number(r.seat_price) }))
    });
  } catch (e) {
    await conn.rollback();
    seatReservationsFailed.inc();
    logger.error({ err: e.message }, 'reserve failed');
    res.status(500).json({ error: e.message });
  } finally { conn.release(); }
});

// POST /v1/seats/release  { orderId }
app.post('/v1/seats/release', async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId required' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [holds] = await conn.query(`SELECT seat_id FROM seat_holds WHERE order_id=?`, [orderId]);
    const ids = holds.map(h => h.seat_id);
    if (ids.length) {
      await conn.query(`UPDATE seat_status SET status='AVAILABLE' WHERE seat_id IN (?) AND status='HELD'`, [ids]);
      await conn.query(`DELETE FROM seat_holds WHERE order_id=?`, [orderId]);
      seatHoldsActive.dec(ids.length);
    }
    await conn.commit();
    res.json({ orderId, released: ids });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally { conn.release(); }
});

// POST /v1/seats/allocate  { orderId } -> permanent allocation after payment success
app.post('/v1/seats/allocate', async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId required' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [holds] = await conn.query(`SELECT seat_id, user_id FROM seat_holds WHERE order_id=?`, [orderId]);
    if (!holds.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'No active holds for order' });
    }
    for (const h of holds) {
      await conn.query(`INSERT INTO seat_allocations (seat_id, order_id, user_id) VALUES (?,?,?)`,
        [h.seat_id, orderId, h.user_id]);
      await conn.query(`UPDATE seat_status SET status='ALLOCATED' WHERE seat_id=?`, [h.seat_id]);
    }
    await conn.query(`DELETE FROM seat_holds WHERE order_id=?`, [orderId]);
    await conn.commit();
    seatHoldsActive.dec(holds.length);
    res.json({ orderId, allocated: holds.map(h => h.seat_id) });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally { conn.release(); }
});

waitDB().then(() => app.listen(PORT, () => logger.info({ port: PORT }, 'seating-service started')));
