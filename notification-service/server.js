const express    = require('express')
const mysql      = require('mysql2/promise')
const amqp       = require('amqplib')
const axios      = require('axios')
const nodemailer = require('nodemailer')
const client     = require('prom-client')
const { v4: uuid } = require('uuid')
const pino       = require('pino')
const pinoHttp   = require('pino-http')

const logger = pino({ level: 'info', base: { service: 'notification-service' } })

// ── Config ────────────────────────────────────────────────────────────────────
const RABBIT_URL     = process.env.RABBIT_URL      || 'amqp://guest:guest@rabbitmq:5672'
const ORDER_SVC      = process.env.ORDER_SVC_URL   || 'http://order-service:8965'
const USER_SVC       = process.env.USER_SVC_URL    || 'http://user-service:8001'
const CATALOG_SVC    = process.env.CATALOG_SVC_URL || 'http://catalog-service:8002'
const QUEUE          = 'order.events'
const OVERRIDE_EMAIL = process.env.OVERRIDE_EMAIL  || 'deenbenny@gmail.com'
const SMTP_USER      = process.env.SMTP_USER
const SMTP_PASS      = process.env.SMTP_PASS

// ── DB ────────────────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL || 'mysql://notify:pass@notification-db:3306/notification_db',
  connectionLimit: 5,
})

// ── Nodemailer ────────────────────────────────────────────────────────────────
const transporter = SMTP_USER && SMTP_PASS
  ? nodemailer.createTransport({ service: 'gmail', auth: { user: SMTP_USER, pass: SMTP_PASS } })
  : null

if (!transporter) logger.warn('SMTP_USER/SMTP_PASS not set — emails will be logged only')

// ── Prometheus ────────────────────────────────────────────────────────────────
const register = new client.Registry()
client.collectDefaultMetrics({ register })
const notifSent = new client.Counter({
  name: 'notifications_sent_total',
  help: 'Total notifications sent',
  labelNames: ['channel', 'status'],
  registers: [register],
})

// ── Email HTML template ───────────────────────────────────────────────────────
function buildEmailHtml({ userName, orderId, eventTitle, eventCity, startTime, seats, tickets, orderTotal }) {
  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0)
  const fmtDate = (s) => s
    ? new Date(s).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

  const seatRows = (seats || []).map((s) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151">
        ${s.section || 'General'} — ${s.seatLabel || s.seat_label || s.seatId || s.seat_id}
      </td>
      <td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;color:#374151">
        ${fmt(s.seatPrice || s.seat_price)}
      </td>
    </tr>`).join('')

  const ticketRows = (tickets || []).map((t) => `
    <tr><td style="padding:6px 0">
      <div style="background:#f5f3ff;border:1px dashed #c4b5fd;border-radius:8px;padding:10px 16px;font-family:monospace;font-size:14px;font-weight:700;color:#4f46e5;letter-spacing:1.5px">
        🎟&nbsp; ${t.ticketCode}
      </div>
    </td></tr>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#f3f4f6">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)">

  <tr><td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 48px;text-align:center">
    <p style="margin:0 0 6px;font-size:26px;font-weight:800;color:#fff">🎫 SeatSavvy</p>
    <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.8);font-weight:500">Booking Confirmed ✓</p>
  </td></tr>

  <tr><td style="padding:36px 48px 0">
    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827">Hi ${userName || 'there'} 👋</p>
    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.7">
      Your booking is confirmed and your e-tickets are ready. Show the ticket code(s) below at the venue entrance.
    </p>
  </td></tr>

  <tr><td style="padding:24px 48px 0">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border-radius:12px;border:1px solid #e0e7ff">
      <tr><td style="padding:20px 24px">
        <p style="margin:0 0 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280">Order Summary</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px">
          <tr>
            <td style="color:#6b7280;padding-bottom:8px">Order ID</td>
            <td style="font-weight:700;color:#111827;text-align:right;padding-bottom:8px">#${orderId}</td>
          </tr>
          ${eventTitle ? `<tr>
            <td style="color:#6b7280;padding-bottom:8px">Event</td>
            <td style="font-weight:700;color:#111827;text-align:right;padding-bottom:8px">${eventTitle}</td>
          </tr>` : ''}
          ${eventCity ? `<tr>
            <td style="color:#6b7280;padding-bottom:8px">City</td>
            <td style="font-weight:700;color:#111827;text-align:right;padding-bottom:8px">${eventCity}</td>
          </tr>` : ''}
          ${startTime ? `<tr>
            <td style="color:#6b7280;padding-bottom:8px">Date</td>
            <td style="font-weight:700;color:#111827;text-align:right;padding-bottom:8px">${fmtDate(startTime)}</td>
          </tr>` : ''}
        </table>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:24px 48px 0">
    <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280">Seats</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${seatRows}
      <tr>
        <td style="padding:12px 8px 0;font-weight:700;font-size:15px;color:#111827">Total Paid</td>
        <td style="padding:12px 8px 0;font-weight:800;font-size:16px;color:#4f46e5;text-align:right">${fmt(orderTotal)}</td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="padding:24px 48px 0">
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280">Your E-Tickets</p>
    <table width="100%" cellpadding="0" cellspacing="0">${ticketRows}</table>
  </td></tr>

  <tr><td style="padding:36px 48px;margin-top:8px;border-top:1px solid #f0f0f0;text-align:center">
    <p style="margin:0 0 4px;font-size:12px;color:#9ca3af">Present this email or ticket code at the venue entrance.</p>
    <p style="margin:0;font-size:12px;color:#9ca3af">© ${new Date().getFullYear()} SeatSavvy · Event Ticketing &amp; Seat Reservation</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`
}

// ── Send email ────────────────────────────────────────────────────────────────
async function sendConfirmationEmail({ toEmail, userName, order, event }) {
  const subject = `Booking Confirmed! 🎟️ Order #${order.orderId}${event ? ` — ${event.title}` : ''}`
  const html    = buildEmailHtml({
    userName,
    orderId:    order.orderId,
    eventTitle: event?.title,
    eventCity:  event?.city,
    startTime:  event?.start_time,
    seats:      order.seats,
    tickets:    order.tickets,
    orderTotal: order.orderTotal,
  })

  const recipient = OVERRIDE_EMAIL || toEmail

  if (transporter) {
    await transporter.sendMail({ from: `"SeatSavvy" <${SMTP_USER}>`, to: recipient, subject, html })
    logger.info({ to: recipient, orderId: order.orderId }, 'Confirmation email sent')
  } else {
    logger.info({ to: recipient, subject, tickets: order.tickets?.map((t) => t.ticketCode) }, 'EMAIL LOG (no SMTP configured)')
  }

  return { recipient, subject, html }
}

// ── Save to DB ────────────────────────────────────────────────────────────────
async function saveNotification({ userId, orderId, subject, body, status }) {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, order_id, channel, subject, body, status)
       VALUES (?, ?, 'EMAIL', ?, ?, ?)`,
      [userId || 0, String(orderId || 0), subject, body, status],
    )
  } catch (err) {
    logger.error({ err: err.message }, 'DB insert failed')
  }
}

// ── RabbitMQ consumer ─────────────────────────────────────────────────────────
async function startConsumer() {
  for (let attempt = 1; ; attempt++) {
    try {
      logger.info({ attempt }, 'Connecting to RabbitMQ…')
      const conn    = await amqp.connect(RABBIT_URL)
      const channel = await conn.createChannel()
      await channel.assertQueue(QUEUE, { durable: true })
      channel.prefetch(1)
      logger.info({ queue: QUEUE }, 'RabbitMQ consumer ready')

      channel.consume(QUEUE, async (msg) => {
        if (!msg) return
        let payload
        try { payload = JSON.parse(msg.content.toString()) } catch {
          channel.ack(msg); return
        }

        const { orderId } = payload
        if (!orderId) { channel.ack(msg); return }

        try {
          const { data: order } = await axios.get(`${ORDER_SVC}/v1/orders/${orderId}`)

          if (order.orderStatus !== 'CONFIRMED') {
            channel.ack(msg); return           // skip PAYMENT_FAILED etc.
          }

          let userName = 'there', userEmail = OVERRIDE_EMAIL
          try {
            const { data: user } = await axios.get(`${USER_SVC}/v1/users/${order.userId}`)
            userName  = user.name  || userName
            userEmail = user.email || userEmail
          } catch { /* non-fatal */ }

          let event = null
          try {
            const { data } = await axios.get(`${CATALOG_SVC}/v1/events/${order.eventId}`)
            event = data
          } catch { /* non-fatal */ }

          const { recipient, subject, html } = await sendConfirmationEmail({ toEmail: userEmail, userName, order, event })

          await saveNotification({ userId: order.userId, orderId, subject, body: html, status: 'SENT' })
          notifSent.labels('EMAIL', 'SENT').inc()

        } catch (err) {
          logger.error({ err: err.message, orderId }, 'Failed to process order event')
          notifSent.labels('EMAIL', 'FAILED').inc()
          await saveNotification({ userId: 0, orderId, subject: `Order #${orderId} confirmation`, body: err.message, status: 'FAILED' })
        }

        channel.ack(msg)
      })

      conn.on('close', () => { logger.warn('RabbitMQ closed — reconnecting…'); setTimeout(startConsumer, 5000) })
      conn.on('error', (e) => logger.error({ err: e.message }, 'RabbitMQ error'))
      return

    } catch (err) {
      logger.warn({ attempt, err: err.message }, 'RabbitMQ not ready — retrying in 5s')
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
}

// ── Express ───────────────────────────────────────────────────────────────────
const app = express()
app.use(express.json())
app.use(pinoHttp({ logger, genReqId: (req) => req.headers['x-correlation-id'] || uuid() }))

app.get('/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', service: 'notification-service' }) }
  catch { res.status(503).json({ status: 'unhealthy' }) }
})

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})

app.post('/v1/notifications/send', async (req, res) => {
  const { userId, orderId, channel = 'EMAIL', subject, body } = req.body
  if (!userId || !subject || !body) return res.status(400).json({ error: 'userId, subject, body required' })
  await saveNotification({ userId: Number(userId), orderId, subject, body, status: 'SENT' })
  notifSent.labels(channel, 'SENT').inc()
  res.status(201).json({ status: 'SENT' })
})

app.get('/v1/notifications', async (req, res) => {
  const { userId, limit = 50 } = req.query
  const [rows] = userId
    ? await pool.query(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        [String(userId), Number(limit)],
      )
    : await pool.query(
        'SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?',
        [Number(limit)],
      )
  res.json(rows)
})

app.listen(8006, () => logger.info('Notification Service listening on :8006'))
startConsumer()
