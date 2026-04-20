const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios');
const client = require('prom-client');
const { v4: uuid } = require('uuid');
const { logger, httpLogger } = require('./logger');

const PORT = 8004;
const CATALOG_URL = process.env.CATALOG_URL || 'http://catalog-service:8002';
const SEATING_URL = process.env.SEATING_URL || 'http://seating-service:8003';
const PAYMENT_URL = process.env.PAYMENT_URL || 'http://payment-service:8005';
const USER_URL = process.env.USER_URL || 'http://user-service:8001';
const NOTIFY_URL = process.env.NOTIFY_URL || 'http://notification-service:8006';

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL || 'mysql://orderusr:pass@order-db:3306/order_db',
  connectionLimit: 10, waitForConnections: true,
});

async function waitDB() {
  for (let i = 0; i < 30; i++) {
    try { await pool.query('SELECT 1'); return; }
    catch { await new Promise(r => setTimeout(r, 2000)); }
  }
}

const register = new client.Registry();
client.collectDefaultMetrics({ register });
const ordersTotal = new client.Counter({ name: 'orders_total', help: 'Total orders placed', labelNames: ['status'], registers: [register] });
const ticketsIssued = new client.Counter({ name: 'tickets_issued_total', help: 'Tickets issued', registers: [register] });

const app = express();
app.use(express.json());
app.use(httpLogger);

app.get('/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', service: 'order-service' }); }
  catch (e) { res.status(503).json({ status: 'unhealthy' }); }
});
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

function ticketCode() {
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rnd = Array.from({length:8}, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random()*36)]).join('');
  return `TKT${ds}-${rnd}`;
}

function newOrderId() {
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return `ORD${ds}-${uuid().slice(0,8).toUpperCase()}`;
}

// POST /v1/orders   header: Idempotency-Key
// body: { userId, eventId, seatIds:[], paymentMethod }
app.post('/v1/orders', async (req, res) => {
  const idemKey = req.header('Idempotency-Key');
  if (!idemKey) return res.status(400).json({ error: 'Idempotency-Key header required' });

  // Check idempotency cache
  const [cached] = await pool.query('SELECT response_body FROM order_idempotency WHERE idempotency_key=?', [idemKey]);
  if (cached.length) {
    logger.info({ cid: req.id, idemKey }, 'idempotent replay');
    return res.json(cached[0].response_body);
  }

  const { userId, eventId, seatIds, paymentMethod = 'UPI' } = req.body;
  if (!userId || !eventId || !Array.isArray(seatIds) || !seatIds.length) {
    return res.status(400).json({ error: 'userId, eventId, seatIds[] required' });
  }

  // 1. Validate event status via Catalog
  let event;
  try {
    const r = await axios.get(`${CATALOG_URL}/v1/events/${eventId}`, { headers: { 'X-Correlation-Id': req.id } });
    event = r.data;
  } catch (e) {
    return res.status(404).json({ error: 'Event not found' });
  }
  if (event.status !== 'ON_SALE') {
    return res.status(409).json({ error: `Event not bookable (status=${event.status})` });
  }

  const orderId = newOrderId();

  // 2. Reserve seats via Seating Service
  let reservation;
  try {
    const r = await axios.post(`${SEATING_URL}/v1/seats/reserve`,
      { orderId, userId, seatIds },
      { headers: { 'X-Correlation-Id': req.id } });
    reservation = r.data;
  } catch (e) {
    const status = e.response?.status || 500;
    return res.status(status).json({ error: 'Seat reservation failed', detail: e.response?.data });
  }

  const subtotal = Number(reservation.subtotal);
  const tax = +(subtotal * 0.05).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  // 3. Persist PENDING order
  await pool.query(
    `INSERT INTO orders (order_id,user_id,event_id,seat_count,subtotal,tax_amount,order_total,order_status,idempotency_key)
     VALUES (?,?,?,?,?,?,?, 'PENDING', ?)`,
    [orderId, userId, eventId, seatIds.length, subtotal, tax, total, idemKey]
  );
  ordersTotal.labels('PENDING').inc();

  // 4. Charge payment
  let payResp;
  try {
    const r = await axios.post(`${PAYMENT_URL}/v1/payments/charge`,
      { orderId, amount: total, method: paymentMethod, userId },
      { headers: { 'Idempotency-Key': `pay-${idemKey}`, 'X-Correlation-Id': req.id } });
    payResp = r.data;
  } catch (e) {
    payResp = e.response?.data || { status: 'FAILED' };
  }

  let finalStatus, tickets = [];
  if (payResp.status === 'SUCCESS') {
    // 5a. Allocate seats permanently
    try {
      await axios.post(`${SEATING_URL}/v1/seats/allocate`, { orderId }, { headers: { 'X-Correlation-Id': req.id } });
    } catch (e) {
      logger.error({ err: e.message }, 'allocation failed despite payment success');
    }
    // 5b. Generate tickets
    for (const sid of seatIds) {
      const code = ticketCode();
      await pool.query(`INSERT INTO tickets (order_id,seat_id,ticket_code) VALUES (?,?,?)`, [orderId, sid, code]);
      tickets.push({ seatId: sid, ticketCode: code });
      ticketsIssued.inc();
    }
    await pool.query(`UPDATE orders SET order_status='CONFIRMED' WHERE order_id=?`, [orderId]);
    finalStatus = 'CONFIRMED';
    ordersTotal.labels('CONFIRMED').inc();

    // 6. Notify (fire-and-forget)
    axios.post(`${NOTIFY_URL}/v1/notifications/send`, {
      userId, orderId, channel: 'EMAIL',
      subject: `Booking confirmed - ${event.title}`,
      body: `Your ${tickets.length} ticket(s) for ${event.title} are confirmed. Total: ₹${total}`
    }, { headers: { 'X-Correlation-Id': req.id } }).catch(e => logger.warn({ err: e.message }, 'notify failed'));
  } else {
    // Release seats on failure
    await axios.post(`${SEATING_URL}/v1/seats/release`, { orderId }, { headers: { 'X-Correlation-Id': req.id } })
      .catch(e => logger.warn({ err: e.message }, 'release failed'));
    await pool.query(`UPDATE orders SET order_status='PAYMENT_FAILED' WHERE order_id=?`, [orderId]);
    finalStatus = 'PAYMENT_FAILED';
    ordersTotal.labels('PAYMENT_FAILED').inc();
  }

  const response = {
    orderId, userId, eventId, seatIds,
    subtotal, tax, total, status: finalStatus,
    payment: payResp, tickets
  };
  await pool.query(`INSERT INTO order_idempotency (idempotency_key, order_id, response_body) VALUES (?,?,?)`,
    [idemKey, orderId, JSON.stringify(response)]);

  res.status(finalStatus === 'CONFIRMED' ? 201 : 402).json(response);
});

app.get('/v1/orders/:orderId', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM orders WHERE order_id=?', [req.params.orderId]);
  if (!rows.length) return res.status(404).json({ error: 'Order not found' });
  const [tickets] = await pool.query('SELECT * FROM tickets WHERE order_id=?', [req.params.orderId]);
  res.json({ ...rows[0], tickets });
});

app.get('/v1/orders/:orderId/tickets', async (req, res) => {
  const [tickets] = await pool.query('SELECT * FROM tickets WHERE order_id=?', [req.params.orderId]);
  res.json(tickets);
});

app.post('/v1/orders/:orderId/cancel', async (req, res) => {
  const orderId = req.params.orderId;
  const [rows] = await pool.query('SELECT * FROM orders WHERE order_id=?', [orderId]);
  if (!rows.length) return res.status(404).json({ error: 'Order not found' });
  const order = rows[0];
  if (order.order_status === 'CANCELLED') return res.json({ orderId, status: 'CANCELLED' });

  // Refund if confirmed
  if (order.order_status === 'CONFIRMED') {
    await axios.post(`${PAYMENT_URL}/v1/payments/refund`, { orderId }, { headers: { 'X-Correlation-Id': req.id } })
      .catch(e => logger.warn({ err: e.message }, 'refund failed'));
    await pool.query(`UPDATE tickets SET ticket_status='REFUNDED' WHERE order_id=?`, [orderId]);
  }
  // Release seats
  await axios.post(`${SEATING_URL}/v1/seats/release`, { orderId }, { headers: { 'X-Correlation-Id': req.id } })
    .catch(() => {});
  await pool.query(`UPDATE orders SET order_status='CANCELLED' WHERE order_id=?`, [orderId]);
  ordersTotal.labels('CANCELLED').inc();
  res.json({ orderId, status: 'CANCELLED' });
});

waitDB().then(() => app.listen(PORT, () => logger.info({ port: PORT }, 'order-service started')));
