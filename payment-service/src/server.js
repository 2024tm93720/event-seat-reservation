const express = require('express');
const mysql = require('mysql2/promise');
const client = require('prom-client');
const { v4: uuid } = require('uuid');
const { logger, httpLogger } = require('./logger');

const PORT = 8005;
const FAILURE_RATE = parseFloat(process.env.PAYMENT_FAILURE_RATE || '0.10'); // 10% simulated fail

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL || 'mysql://payment:pass@payment-db:3306/payment_db',
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
const paymentsTotal = new client.Counter({ name: 'payments_total', help: 'Total payment attempts', labelNames: ['status'], registers: [register] });
const paymentsFailedTotal = new client.Counter({ name: 'payments_failed_total', help: 'Total failed payments', registers: [register] });
const refundsTotal = new client.Counter({ name: 'refunds_total', help: 'Total refunds', registers: [register] });

const app = express();
app.use(express.json());
app.use(httpLogger);

app.get('/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', service: 'payment-service' }); }
  catch { res.status(503).json({ status: 'unhealthy' }); }
});
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

function paymentRef() {
  const d = new Date();
  const ds = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return `PAY${ds}-${uuid().slice(0,8).toUpperCase()}`;
}
function paymentId() {
  return `PAY${Date.now()}${Math.floor(Math.random()*1000)}`;
}

// POST /v1/payments/charge   header: Idempotency-Key
app.post('/v1/payments/charge', async (req, res) => {
  const idemKey = req.header('Idempotency-Key');
  if (!idemKey) return res.status(400).json({ error: 'Idempotency-Key header required' });

  const [cached] = await pool.query('SELECT response_body FROM payment_idempotency WHERE idempotency_key=?', [idemKey]);
  if (cached.length) {
    logger.info({ cid: req.id, idemKey }, 'idempotent payment replay');
    return res.json(cached[0].response_body);
  }

  const { orderId, amount, method = 'UPI' } = req.body;
  if (!orderId || amount == null) return res.status(400).json({ error: 'orderId, amount required' });

  paymentsTotal.labels('PENDING').inc();
  const pid = paymentId();
  await pool.query(
    `INSERT INTO payments (payment_id, order_id, amount, method, status, reference) VALUES (?,?,?,?,?,?)`,
    [pid, orderId, amount, method, 'PENDING', paymentRef()]
  );

  // Simulated gateway
  const success = Math.random() > FAILURE_RATE;
  const newStatus = success ? 'SUCCESS' : 'FAILED';
  await pool.query(`UPDATE payments SET status=? WHERE payment_id=?`, [newStatus, pid]);
  paymentsTotal.labels(newStatus).inc();
  if (!success) paymentsFailedTotal.inc();

  const response = { paymentId: pid, orderId, amount, method, status: newStatus };
  await pool.query(
    `INSERT INTO payment_idempotency (idempotency_key, payment_id, response_body) VALUES (?,?,?)`,
    [idemKey, pid, JSON.stringify(response)]
  );

  logger.info({ cid: req.id, orderId, paymentId: pid, status: newStatus }, 'payment processed');
  res.status(success ? 200 : 402).json(response);
});

// POST /v1/payments/refund  { orderId }
app.post('/v1/payments/refund', async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'orderId required' });
  const [rows] = await pool.query(`SELECT payment_id, amount FROM payments WHERE order_id=? AND status='SUCCESS'`, [orderId]);
  if (!rows.length) return res.status(404).json({ error: 'No successful payment found' });
  await pool.query(`UPDATE payments SET status='REFUNDED' WHERE order_id=? AND status='SUCCESS'`, [orderId]);
  refundsTotal.inc();
  res.json({ orderId, refunded: rows });
});

app.get('/v1/payments/:paymentId', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM payments WHERE payment_id=?', [req.params.paymentId]);
  if (!rows.length) return res.status(404).json({ error: 'Payment not found' });
  res.json(rows[0]);
});

waitDB().then(() => app.listen(PORT, () => logger.info({ port: PORT }, 'payment-service started')));
