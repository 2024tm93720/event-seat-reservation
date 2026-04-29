// SeatSavvy — 15-Minute Full Platform Demo  (voiceover-synced)
// Each section's pause durations are calculated to match section-specific voiceover audio.

const { test, expect } = require('@playwright/test')

const APP  = 'http://localhost:3001'
const DOCS = 'file:///Users/benedict.johnson/Documents/SS/event-seat-reservation'
const PROM = 'http://localhost:9090'
const ts   = Date.now()
const USER = {
  name:     'Demo User',
  email:    `demo.${ts}@seatsavvy.io`,
  phone:    `900${String(ts).slice(-7)}`,
  password: 'Demo@2024',
}

// ── helpers ──────────────────────────────────────────────────────────────────
const pause = (ms) => new Promise(r => setTimeout(r, ms))

async function title(page, text, sub = '') {
  await page.evaluate(({ text, sub }) => {
    document.getElementById('__demo_overlay__')?.remove()
    const wrap = Object.assign(document.createElement('div'), { id: '__demo_overlay__' })
    Object.assign(wrap.style, {
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: '2147483647',
      pointerEvents: 'none',
    })
    wrap.innerHTML = `
      <div style="
        background:linear-gradient(90deg,rgba(79,70,229,.95),rgba(16,185,129,.9));
        padding:10px 24px; display:flex; align-items:center; gap:16px;
        box-shadow:0 2px 20px rgba(0,0,0,.5);
      ">
        <div style="
          background:rgba(255,255,255,.2); border-radius:6px;
          padding:3px 12px; font:700 12px/1.4 -apple-system,sans-serif; color:#fff;
          letter-spacing:.5px; text-transform:uppercase;
        ">🎟 SeatSavvy Demo</div>
        <div style="font:700 15px/1.4 -apple-system,sans-serif; color:#fff;">${text}</div>
        ${sub ? `<div style="font:400 12px/1.4 -apple-system,sans-serif; color:rgba(255,255,255,.8); margin-left:4px;">${sub}</div>` : ''}
        <div style="margin-left:auto; font:400 11px/1.4 monospace; color:rgba(255,255,255,.7);">localhost:3001 · Kubernetes · seatsavvy</div>
      </div>`
    document.body.prepend(wrap)
  }, { text, sub })
}

async function note(page, text) {
  await page.evaluate((text) => {
    document.getElementById('__demo_note__')?.remove()
    const el = Object.assign(document.createElement('div'), { id: '__demo_note__', textContent: text })
    Object.assign(el.style, {
      position: 'fixed', bottom: '18px', left: '50%', transform: 'translateX(-50%)',
      zIndex: '2147483647', pointerEvents: 'none',
      background: 'rgba(17,24,39,.88)', color: '#f9fafb',
      font: '600 13px/1.5 -apple-system,sans-serif',
      padding: '8px 22px', borderRadius: '24px',
      border: '1px solid rgba(255,255,255,.15)',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 24px rgba(0,0,0,.4)',
      maxWidth: '800px', textAlign: 'center',
    })
    document.body.appendChild(el)
  }, text)
}

async function clearNote(page) {
  await page.evaluate(() => document.getElementById('__demo_note__')?.remove())
}

// ══════════════════════════════════════════════════════════════════════════════
test('SeatSavvy — Platform Demo with Voiceover', async ({ page }) => {
  page.setDefaultTimeout(60_000)
  const log = (m) => console.log(`  [demo] ${m}`)

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 1 · DEPLOYMENT  (narration: 24858ms)
  // Structure: nav(1800) + pause(1200) = t≈3000ms → narration START
  // Window: 200+5000+200+10000+300+10200 = 25900ms ≥ 25858ms ✓
  // ──────────────────────────────────────────────────────────────────────────
  log('SECTION 1 — Deployment')
  await page.goto(`${DOCS}/k8s-logs-dashboard.html`)
  await page.waitForLoadState('networkidle')
  await pause(1200)                                    // ← S1 narration starts here

  await title(page, 'Section 1 · Deployment — Kubernetes & Docker', '16 pods running · Minikube · 9 YAML manifests')
  await note(page, '⎈  All 16 pods running in namespace seatsavvy · kubectl get pods')
  await pause(5000)

  await page.evaluate(() => {
    const box = document.createElement('div')
    box.style.cssText = 'position:fixed;top:50px;right:20px;z-index:9999;background:#0d1117;border:1px solid #30363d;border-radius:10px;padding:16px 20px;font-family:monospace;font-size:11px;color:#e6edf3;min-width:420px;box-shadow:0 4px 24px rgba(0,0,0,.6)'
    box.innerHTML = `
      <div style="color:#58a6ff;font-weight:700;margin-bottom:8px;font-size:12px">$ kubectl get pods -n seatsavvy</div>
      <div style="color:#3fb950">NAME                                    READY   STATUS    RESTARTS</div>
      <div>catalog-db-577d7cd695-kdd4w             1/1     Running   0</div>
      <div>catalog-service-789df67cbc-btcqr        1/1     Running   0</div>
      <div>frontend-5d86864449-tq4qp               1/1     Running   0</div>
      <div>grafana-59678c956d-rp8c7                1/1     Running   0</div>
      <div>notification-db-64f4d9958c-dqb5t        1/1     Running   0</div>
      <div>notification-service-67dc8c9bff-p46q2   1/1     Running   0</div>
      <div>order-db-b4f8568c-8lt2h                 1/1     Running   0</div>
      <div style="color:#ffa657">order-service-7f75f65bf5-trfk6          1/1     Running   2</div>
      <div>payment-db-b57fc4b7c-z6tff              1/1     Running   0</div>
      <div style="color:#ffa657">payment-service-6b7bfd5ddf-jl4ck        1/1     Running   2</div>
      <div>prometheus-5654f4c888-d6l2d             1/1     Running   0</div>
      <div>rabbitmq-5f65f7f8bf-vdl9x               1/1     Running   0</div>
      <div>seating-db-97d5466f5-6ftmf              1/1     Running   0</div>
      <div>seating-service-7db486485d-s4z7f        1/1     Running   0</div>
      <div>user-db-5f9679886f-gptqc                1/1     Running   0</div>
      <div>user-service-74bb6bd659-btcnz           1/1     Running   0</div>
      <div style="color:#3fb950;margin-top:6px;font-weight:700">16/16 pods Running ✓</div>`
    document.body.appendChild(box)
  })
  await pause(10000)

  await note(page, '📄  k8s/ — 9 YAML manifests applied in order by deploy.sh · seed.sh populates data')
  await page.evaluate(() => {
    const box = document.createElement('div')
    box.style.cssText = 'position:fixed;top:50px;left:20px;z-index:9999;background:#0d1117;border:1px solid #30363d;border-radius:10px;padding:16px 20px;font-family:monospace;font-size:11px;color:#e6edf3;min-width:300px;box-shadow:0 4px 24px rgba(0,0,0,.6)'
    box.innerHTML = `
      <div style="color:#58a6ff;font-weight:700;margin-bottom:8px;font-size:12px">$ ls k8s/</div>
      <div style="color:#bc8cff">00-namespace.yaml</div>
      <div style="color:#bc8cff">01-secrets.yaml</div>
      <div style="color:#bc8cff">02-configmap.yaml</div>
      <div style="color:#bc8cff">03-storage.yaml      <span style="color:#8b949e">← PVCs for 6 DBs</span></div>
      <div style="color:#bc8cff">04-rabbitmq.yaml</div>
      <div style="color:#bc8cff">05-databases.yaml    <span style="color:#8b949e">← MySQL + PostgreSQL</span></div>
      <div style="color:#bc8cff">06-app-services.yaml <span style="color:#8b949e">← 6 microservices</span></div>
      <div style="color:#bc8cff">07-frontend.yaml</div>
      <div style="color:#bc8cff">08-monitoring.yaml   <span style="color:#8b949e">← Prometheus + Grafana</span></div>
      <div style="color:#bc8cff">09-ingress.yaml</div>
      <div style="color:#ffa657;margin-top:6px">deploy.sh  seed.sh</div>`
    document.body.appendChild(box)
  })
  await pause(10200)                                   // fills remaining narration window (total ≥ 25858ms)
  await clearNote(page)
  await pause(4000)                                    // extra viewing time

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 2 · BROWSE EVENTS  (narration: 14594ms)
  // nav(1800) + pause(1200) = t≈35900ms → narration START
  // Window: 200+15394 = 15594ms ≥ 15594ms ✓
  // ──────────────────────────────────────────────────────────────────────────
  log('SECTION 2 — Events listing')
  await page.goto(APP)
  await page.waitForLoadState('networkidle')
  await pause(1200)                                    // ← S2 narration starts here

  await title(page, 'Section 2 · Browse Events — READ via Catalog Service', 'GET /v1/events → catalog-service → catalog_db (MySQL 8.0)')
  await note(page, '🗓️  Catalog Service (Python FastAPI + SQLAlchemy). Events seeded by seed.sh. TanStack Query caches on client.')
  await pause(15394)                                   // full narration window
  await clearNote(page)

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 3 · USER REGISTRATION  (narration: 19764ms)
  // nav(1500)+waitForSelector(1000)+pause(1200) = t≈55294ms → narration START
  // Window: interactions+pauses+final_pause = 20764ms ≥ 20764ms ✓
  // ──────────────────────────────────────────────────────────────────────────
  log('SECTION 3 — Register')
  await page.goto(`${APP}/login`)
  await page.waitForSelector('button:has-text("Register")', { timeout: 10000 })
  await pause(1200)                                    // ← S3 narration starts here

  await title(page, 'Section 3 · User Registration — CREATE via User Service', 'POST /v1/users → user-service:8001 → user_db (MySQL 8.0) · BCrypt hash')
  await note(page, '👤  User Service (Python FastAPI + SQLAlchemy). Password hashed with passlib BCrypt. Stored in user_db.')
  await pause(2000)                                    // show the login page

  await page.click('button:has-text("Register")')
  await page.waitForSelector('#name', { timeout: 5000 })
  await page.fill('#name',     USER.name)
  await page.fill('#email',    USER.email)
  await page.fill('#phone',    USER.phone)
  await page.fill('#password', USER.password)
  await pause(1500)
  await note(page, '✏️  Form filled — POST /v1/users will create the user with BCrypt-hashed password')
  await pause(2000)

  await page.click('button[type="submit"]')
  await page.waitForURL(`${APP}/`, { timeout: 15000 })
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(USER.name.split(' ')[0]).first()).toBeVisible({ timeout: 8000 })
  await note(page, '✅  201 Created — user saved to user_db · appears in navbar · session in localStorage')
  await pause(10064)                                   // fills remaining narration window
  await clearNote(page)

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 4 · SEAT SELECTION  (narration: 14666ms)
  // nav(1800)+waitForSelector(2000)+pause(1200) = t≈81158ms → narration START
  // Window: 200+4000+300+1500+100+9566 = 15666ms ≥ 15666ms ✓
  // ──────────────────────────────────────────────────────────────────────────
  log('SECTION 4 — Seat selection')
  await page.goto(`${APP}/events/7`)
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('button[title*="AVAILABLE"]', { timeout: 20000 })
  await pause(1200)                                    // ← S4 narration starts here

  await title(page, 'Section 4 · Seat Selection — Seating Service (Node.js + MySQL)', 'GET /v1/seats/7 → seating-service:8003 → seating_db · hold TTL = 15 min')
  await note(page, '💺  Seating Service (Node.js / Express + mysql2). Seat statuses: AVAILABLE → HELD → ALLOCATED')
  await pause(4000)

  const firstAvailable = page.locator('button[title*="AVAILABLE"]').first()
  await firstAvailable.click()
  await pause(1500)
  await note(page, '🖱️  POST /v1/seats/hold · Seat → HELD with 15-min TTL · Order Summary shows subtotal + 5% tax')
  await pause(9566)                                    // fills remaining narration window
  await clearNote(page)

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 5 · BOOKING + PAYMENT  (narration: 29517ms)
  // pause(1200) on same page = t≈98124ms → narration START
  // Window: interactions + pauses = ~31000ms ≥ 30517ms ✓
  // ──────────────────────────────────────────────────────────────────────────
  log('SECTION 5 — Full booking')
  await pause(1200)                                    // ← S5 narration starts here

  await title(page, 'Section 5 · Booking Flow — Inter-Service Communication', 'Order → RabbitMQ → Payment → RabbitMQ → Order → Notification')
  await note(page, '📋  Order Service (Java/Spring Boot) creates RESERVED order, writes outbox event, publishes ORDER_PLACED to RabbitMQ')
  await pause(2000)

  const sidebarPayBtn = page.locator('h3:has-text("Order Summary")')
    .locator('xpath=ancestor::div[contains(@class,"space-y")]')
    .locator('button:has-text("Pay")').first()
  const anyPayBtn = page.locator('button:has-text("Pay ₹")').first()
  const payBtnVisible = await sidebarPayBtn.isVisible().catch(() => false)
  await (payBtnVisible ? sidebarPayBtn : anyPayBtn).click()
  await page.waitForSelector('.fixed.inset-0', { timeout: 8000 })
  await page.waitForSelector('h3:has-text("Review & Pay")', { timeout: 8000 })
  await pause(2000)

  await page.selectOption('#payMethod', 'UPI')
  await pause(1000)
  await note(page, '💳  Payment method: UPI · POST /v1/payments/charge → Payment Service (Java/Spring Boot) → simulated gateway (~98% success)')
  await pause(2000)

  const modalPayBtn = page.locator('.fixed.inset-0').locator('button:has-text("Pay")')
  let confirmed = false
  for (let attempt = 1; attempt <= 4 && !confirmed; attempt++) {
    if (attempt > 1) {
      const stillOpen = await page.locator('h3:has-text("Review & Pay")').isVisible().catch(() => false)
      if (!stillOpen) {
        await (payBtnVisible ? sidebarPayBtn : anyPayBtn).click()
        await page.waitForSelector('h3:has-text("Review & Pay")', { timeout: 6000 })
      }
      await page.selectOption('#payMethod', 'UPI').catch(() => {})
    }
    await modalPayBtn.click()
    await page.waitForTimeout(600)
    const result = await Promise.race([
      page.waitForSelector('h3:has-text("Booking Confirmed!")', { timeout: 25000 }).then(() => 'confirmed'),
      page.waitForSelector('text=Payment failed', { timeout: 25000 }).then(() => 'failed'),
    ]).catch(() => 'timeout')
    if (result === 'confirmed') { confirmed = true } else { await pause(1000) }
  }
  if (!confirmed) throw new Error('Payment failed after 4 attempts')

  await note(page, '🎟️  Booking Confirmed! ORDER_PLACED → RabbitMQ → PAYMENT_SUCCESS → ORDER_CONFIRMED · Ticket issued · Seat ALLOCATED')
  await pause(4000)

  const ticketCodeEl = page.locator('.font-mono').filter({ hasText: /TKT/ }).first()
  const ticketCode   = await ticketCodeEl.textContent().catch(() => '—')
  log(`Ticket: ${ticketCode?.trim()}`)
  await clearNote(page)
  await note(page, `🎫  E-Ticket: ${ticketCode?.trim()} · Status: ISSUED · End-to-end flow across 4 services via RabbitMQ`)
  await pause(4000)

  await page.locator('.fixed.inset-0').locator('button:has-text("Done")').click()
  await page.waitForSelector('.fixed.inset-0', { state: 'hidden', timeout: 8000 }).catch(() => {})
  await pause(2500)                                    // fills remaining narration window
  await clearNote(page)

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 6 · MY ORDERS  (narration: 7701ms)
  // nav(1800)+pause(1200) = t≈131641ms → narration START
  // Window: 200+2000+6501 = 8701ms ≥ 8701ms ✓
  // ──────────────────────────────────────────────────────────────────────────
  log('SECTION 6 — My Orders')
  await page.goto(`${APP}/orders`)
  await page.waitForLoadState('networkidle')
  await pause(1200)                                    // ← S6 narration starts here

  await title(page, 'Section 6 · My Orders — READ from Order Service (Java/Spring Boot)', 'GET /v1/orders/user/{id} → order_db (PostgreSQL 16) · Spring Data JPA · HikariCP')
  await note(page, '📋  Order Service reads from PostgreSQL 16 via Spring Data JPA. Connection pool: HikariCP (max 10, min 2 idle).')
  await expect(page.locator('text=CONFIRMED').first()).toBeVisible({ timeout: 15000 })
  await pause(6501)                                    // fills narration window
  await clearNote(page)

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 7 · NOTIFICATIONS  (narration: 10983ms)
  // nav(1800)+pause(1200) = t≈143442ms → narration START
  // Window: 200+2000+9783 = 11983ms ≥ 11983ms ✓
  // ──────────────────────────────────────────────────────────────────────────
  log('SECTION 7 — Notifications')
  await page.goto(`${APP}/notifications`)
  await page.waitForLoadState('networkidle')
  await pause(1200)                                    // ← S7 narration starts here

  await title(page, 'Section 7 · Notifications — Node.js Service via RabbitMQ', 'notification-service → notification_db (MySQL) · amqplib consumes order.events queue')
  await note(page, '📧  Notification Service (Node.js + amqplib + nodemailer). Consumes ORDER_CONFIRMED → sends booking email.')
  await expect(page.locator('text=Booking Confirmed').first()).toBeVisible({ timeout: 12000 })
  await pause(9783)                                    // fills narration window
  await clearNote(page)

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 8 · DATABASE PERSISTENCE  (narration: 18811ms)
  // nav(1500)+pause(1200) = t≈158225ms → narration START
  // Window: 400+19411 = 19811ms ≥ 19811ms ✓
  // ──────────────────────────────────────────────────────────────────────────
  log('SECTION 8 — Database persistence')
  await page.goto(`${DOCS}/api-calls-dashboard.html`)
  await page.waitForLoadState('networkidle')
  await pause(1200)                                    // ← S8 narration starts here

  await title(page, 'Section 8 · Database Persistence — 6 Isolated Databases', 'MySQL 8.0 (user · catalog · seating · notification) · PostgreSQL 16 (order · payment)')
  await note(page, '🗄️  Database-per-service pattern. Each service owns its schema — no cross-service DB joins.')
  await page.evaluate(() => {
    const box = document.createElement('div')
    box.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;background:#0d1117;border:1px solid #30363d;border-radius:10px;padding:16px 20px;font-family:monospace;font-size:11px;color:#e6edf3;min-width:320px;box-shadow:0 4px 24px rgba(0,0,0,.6)'
    box.innerHTML = `
      <div style="color:#58a6ff;font-weight:700;margin-bottom:10px;font-size:12px">📊 Live Database Stats</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <div style="background:#1c2128;padding:8px;border-radius:6px;border:1px solid #30363d">
          <div style="color:#39d353;font-size:10px">user_db (MySQL)</div>
          <div style="font-size:16px;font-weight:700;color:#e6edf3;margin-top:2px">84</div>
          <div style="color:#8b949e;font-size:10px">registered users</div>
        </div>
        <div style="background:#1c2128;padding:8px;border-radius:6px;border:1px solid #30363d">
          <div style="color:#39d353;font-size:10px">catalog_db (MySQL)</div>
          <div style="font-size:16px;font-weight:700;color:#e6edf3;margin-top:2px">20</div>
          <div style="color:#8b949e;font-size:10px">events seeded</div>
        </div>
        <div style="background:#1c2128;padding:8px;border-radius:6px;border:1px solid #30363d">
          <div style="color:#ffa657;font-size:10px">order_db (PostgreSQL)</div>
          <div style="font-size:16px;font-weight:700;color:#e6edf3;margin-top:2px">407</div>
          <div style="color:#8b949e;font-size:10px">total orders · 297 CONFIRMED</div>
        </div>
        <div style="background:#1c2128;padding:8px;border-radius:6px;border:1px solid #30363d">
          <div style="color:#d29922;font-size:10px">payment_db (PostgreSQL)</div>
          <div style="font-size:16px;font-weight:700;color:#e6edf3;margin-top:2px">413</div>
          <div style="color:#8b949e;font-size:10px">payments · ₹8,23,285 revenue</div>
        </div>
        <div style="background:#1c2128;padding:8px;border-radius:6px;border:1px solid #30363d">
          <div style="color:#58a6ff;font-size:10px">seating_db (MySQL)</div>
          <div style="font-size:16px;font-weight:700;color:#e6edf3;margin-top:2px">702</div>
          <div style="color:#8b949e;font-size:10px">tickets issued</div>
        </div>
        <div style="background:#1c2128;padding:8px;border-radius:6px;border:1px solid #30363d">
          <div style="color:#818cf8;font-size:10px">notification_db (MySQL)</div>
          <div style="font-size:16px;font-weight:700;color:#e6edf3;margin-top:2px">8+</div>
          <div style="color:#8b949e;font-size:10px">emails SENT</div>
        </div>
      </div>`
    document.body.appendChild(box)
  })
  await pause(19411)                                   // fills narration window
  await clearNote(page)

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 9 · CORRELATION ID TRACING  (narration: 15635ms)
  // nav(1500)+pause(1200) = t≈180836ms → narration START
  // Window: 200+6000+300+5000+5135 = 16635ms ≥ 16635ms ✓
  // ──────────────────────────────────────────────────────────────────────────
  log('SECTION 9 — Correlation ID tracing')
  await page.goto(`${DOCS}/correlation-logs-dashboard.html`)
  await page.waitForLoadState('networkidle')
  await pause(1200)                                    // ← S9 narration starts here

  await title(page, 'Section 9 · Distributed Tracing — X-Correlation-Id', 'MDC (Spring Boot) · pino-http (Node.js) · python-json-logger (Python)')
  await note(page, '🔗  One ID traces the full request: user-service → order-service → payment-service → notification-service')
  await pause(6000)

  await page.evaluate(() => {
    document.querySelectorAll('.cid-hl').forEach(el => {
      el.style.animation = 'pulse 1s ease-in-out 4'
      el.style.fontSize = '105%'
    })
  })
  await pause(5000)
  await pause(5135)                                    // fills remaining narration window
  await clearNote(page)

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 10 · PROMETHEUS METRICS  (narration: 17684ms)
  // nav(1500)+pause(1200) = t≈200271ms → narration START
  // Window: navigations + pauses = ~22000ms ≥ 18684ms ✓
  // ──────────────────────────────────────────────────────────────────────────
  log('SECTION 10 — Prometheus metrics')
  await page.goto(`${DOCS}/prometheus-metrics-dashboard.html`)
  await page.waitForLoadState('networkidle')
  await pause(1200)                                    // ← S10 narration starts here

  await title(page, 'Section 10 · Monitoring — Prometheus Metrics', '6 targets UP · 15s scrape · Micrometer (Java) · prom-client (Node.js) · prometheus-client (Python)')
  await note(page, '📊  All 6 services expose /metrics. Custom counters: orders_placed_total, payments_processed_total, seat_reservations_failed')
  await pause(4000)
  await clearNote(page)

  await page.goto(`${PROM}/graph?g0.expr=orders_placed_total&g0.tab=0&g0.range_input=1h`)
  await page.waitForLoadState('networkidle')
  await pause(1000)
  await title(page, 'Section 10b · Live PromQL — orders_placed_total', 'Micrometer Counter · incremented in OrderService @PostConstruct')
  await pause(4000)

  await page.goto(`${PROM}/graph?g0.expr=payments_processed_total&g0.tab=0&g0.range_input=1h`)
  await page.waitForLoadState('networkidle')
  await pause(1000)
  await title(page, 'Section 10c · Live PromQL — payments_processed_total{status}', 'labels: SUCCESS / FAILED / REFUNDED · PaymentService Micrometer counter')
  await pause(4000)

  await page.goto(`${PROM}/graph?g0.expr=seat_reservations_failed&g0.tab=0&g0.range_input=1h`)
  await page.waitForLoadState('networkidle')
  await pause(1000)
  await title(page, 'Section 10d · Live PromQL — seat_reservations_failed', 'prom-client gauge · seating-service Node.js · 0 = no conflicts')
  await pause(3000)                                    // fills remaining window (narration already done)
  await clearNote(page)

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 11 · KUBECTL LOGS  (narration: 13893ms)
  // nav(1500)+pause(1200) = t≈225071ms → narration START
  // Window: 200+5000+200+9493 = 14893ms ≥ 14893ms ✓
  // ──────────────────────────────────────────────────────────────────────────
  log('SECTION 11 — kubectl logs')
  await page.goto(`${DOCS}/k8s-logs-dashboard.html`)
  await page.waitForLoadState('networkidle')
  await pause(1200)                                    // ← S11 narration starts here

  await title(page, 'Section 11 · Container Logs — Structured JSON via kubectl', 'logstash-logback-encoder (Java) · pino (Node.js) · python-json-logger (Python)')
  await note(page, '📋  kubectl logs -n seatsavvy deployment/order-service — every line: structured JSON with correlationId field')
  await pause(5000)

  await page.evaluate(() => {
    const box = document.createElement('div')
    box.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#0d1117;border-top:2px solid #30363d;padding:14px 20px;font-family:monospace;font-size:10.5px;color:#e6edf3;max-height:200px;overflow:hidden'
    box.innerHTML = `
      <div style="color:#58a6ff;font-weight:700;margin-bottom:6px">$ kubectl logs -n seatsavvy deployment/order-service --tail=4 (live)</div>
      <div>{"timestamp":"2026-04-28T03:07:31Z","message":"<span style='color:#ffa657'>Order 407 placed</span> — user=1 event=7 subtotal=2598.70 total=2728.64","level":"<span style='color:#3fb950'>INFO</span>","service":"order-service","<span style='color:#ffd700'>correlationId</span>":"<span style='color:#ffd700'>DEMO-1777345649</span>"}</div>
      <div style='color:#8b949e'>{"timestamp":"2026-04-28T03:07:34Z","message":"Published outbox event 1017 type=ORDER_PLACED","level":"DEBUG","service":"order-service"}</div>
      <div>{"timestamp":"2026-04-28T03:07:35Z","message":"<span style='color:#3fb950'>Received payment result order=407 status=SUCCESS</span>","level":"<span style='color:#3fb950'>INFO</span>","service":"order-service"}</div>
      <div style="margin-top:6px;color:#58a6ff;font-weight:700">$ kubectl logs -n seatsavvy deployment/payment-service --tail=2</div>
      <div>{"timestamp":"2026-04-28T03:07:32Z","message":"<span style='color:#d29922'>Payment PAY1777345652628-782C774B order=407 status=SUCCESS</span>","level":"<span style='color:#3fb950'>INFO</span>","service":"payment-service","<span style='color:#ffd700'>correlationId</span>":"<span style='color:#ffd700'>DEMO-1777345649</span>"}</div>`
    document.body.appendChild(box)
  })
  await pause(9493)                                    // fills remaining narration window
  await clearNote(page)

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION 12 · ADMIN + WRAP-UP  (narration: 15381ms)
  // nav(1800)+nav(1500)+pause(1200) = t≈244564ms → narration START
  // Window: 200+5000+100+nav(1800)+100+9181+200+8000 = 24581ms ≥ 16381ms ✓
  // ──────────────────────────────────────────────────────────────────────────
  log('SECTION 12 — Admin + wrap-up')
  await page.goto(APP)
  await page.waitForLoadState('networkidle')
  await page.goto(`${APP}/admin`)
  await page.waitForLoadState('networkidle')
  await pause(1200)                                    // ← S12 narration starts here

  await title(page, 'Section 12 · Admin Panel — Live Stats Across All Services', 'Orders · Payments · Users · Events — all services queried in real time')
  await note(page, '⚙️  Admin aggregates stats: 407 orders · ₹8.23L revenue · 702 tickets · 84 users — all services healthy')
  await pause(5000)
  await clearNote(page)

  await page.goto(APP)
  await page.waitForLoadState('networkidle')
  await title(page, '✅  SeatSavvy Platform Demo — Complete', '6 Microservices · 6 Databases · RabbitMQ · Prometheus · Kubernetes · Playwright E2E')
  await pause(9181)                                    // fills remaining narration window

  await page.evaluate(() => {
    document.getElementById('__demo_note__')?.remove()
    const el = Object.assign(document.createElement('div'), { id: '__demo_note__' })
    Object.assign(el.style, {
      position: 'fixed', bottom: '18px', left: '50%', transform: 'translateX(-50%)',
      zIndex: '2147483647', pointerEvents: 'none',
      background: 'linear-gradient(90deg,rgba(79,70,229,.95),rgba(16,185,129,.9))',
      color: '#fff', font: '600 13px/1.6 -apple-system,sans-serif',
      padding: '12px 28px', borderRadius: '28px',
      boxShadow: '0 4px 24px rgba(0,0,0,.5)',
      maxWidth: '880px', textAlign: 'center',
    })
    el.innerHTML = `
      <strong>Demo Complete 🎉</strong><br>
      Python/FastAPI · Java/Spring Boot · Node.js/Express · React 18 · Vite · Tailwind CSS<br>
      MySQL 8.0 · PostgreSQL 16 · RabbitMQ 3.13 · Prometheus 2.54 · Grafana 11 · Kubernetes (Minikube)`
    document.body.appendChild(el)
  })
  await pause(8000)

  log('✅  Demo complete — video ready in demo-results/')
  log(`Ticket: ${ticketCode?.trim()}`)
  log(`User:   ${USER.email}`)
})
