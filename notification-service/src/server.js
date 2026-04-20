const express = require('express');
const mysql = require('mysql2/promise');
const client = require('prom-client');
const { logger, httpLogger } = require('./logger');

const PORT = 8006;
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL || 'mysql://notify:pass@notification-db:3306/notification_db',
  connectionLimit: 5, waitForConnections: true,
});
async function waitDB() {
  for (let i = 0; i < 30; i++) {
    try { await pool.query('SELECT 1'); return; }
    catch { await new Promise(r => setTimeout(r, 2000)); }
  }
}

const register = new client.Registry();
client.collectDefaultMetrics({ register });
const notifSent = new client.Counter({ name: 'notifications_sent_total', help: 'Total notifications sent', labelNames: ['channel'], registers: [register] });

const app = express();
app.use(express.json());
app.use(httpLogger);

app.get('/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', service: 'notification-service' }); }
  catch { res.status(503).json({ status: 'unhealthy' }); }
});
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.post('/v1/notifications/send', async (req, res) => {
  const { userId, orderId, channel = 'EMAIL', subject, body } = req.body;
  if (!userId || !subject || !body) return res.status(400).json({ error: 'userId, subject, body required' });
  // Simulated send (logs only)
  logger.info({ cid: req.id, userId, orderId, channel, subject }, 'NOTIFICATION DISPATCHED');
  await pool.query(
    `INSERT INTO notifications (user_id, order_id, channel, subject, body, status) VALUES (?,?,?,?,?,'SENT')`,
    [userId, orderId || null, channel, subject, body]
  );
  notifSent.labels(channel).inc();
  res.status(201).json({ status: 'SENT', userId, channel });
});

app.get('/v1/notifications', async (req, res) => {
  const userId = req.query.userId;
  const q = userId
    ? await pool.query('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50', [userId])
    : await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
  res.json(q[0]);
});

waitDB().then(() => app.listen(PORT, () => logger.info({ port: PORT }, 'notification-service started')));
