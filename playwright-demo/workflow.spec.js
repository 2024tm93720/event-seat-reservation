// SeatSavvy — Complete Booking Workflow
// Covers: Registration → Event Selection → Seat Selection → Payment → Ticket → Notification

const { test, expect } = require('@playwright/test')
const path = require('path')
const fs   = require('fs')

const BASE = 'http://localhost:3001'
const SS   = (n) => path.join(__dirname, 'screenshots', n)

// unique user for this run
const ts   = Date.now()
const USER = {
  name:     'Priya Sharma',
  email:    `priya.${ts}@seatsavvy.io`,
  phone:    `987654${String(ts).slice(-4)}`,
  password: 'Priya@2024',
}

test.beforeAll(() => {
  fs.mkdirSync(path.join(__dirname, 'screenshots'), { recursive: true })
})

// ── labelled screenshot helper ────────────────────────────────────────────────
async function shot(page, filename, label) {
  await page.evaluate((lbl) => {
    document.getElementById('__lbl__')?.remove()
    const el = Object.assign(document.createElement('div'), { id: '__lbl__', textContent: lbl })
    Object.assign(el.style, {
      position: 'fixed', top: '12px', right: '12px', zIndex: '999999',
      background: 'rgba(79,70,229,0.92)', color: '#fff',
      font: '700 13px/1.4 -apple-system,sans-serif',
      padding: '6px 14px', borderRadius: '20px',
      boxShadow: '0 2px 12px rgba(0,0,0,.35)', pointerEvents: 'none',
    })
    document.body.appendChild(el)
  }, label)
  await page.screenshot({ path: SS(filename), fullPage: false })
}

// ═════════════════════════════════════════════════════════════════════════════
test('SeatSavvy — complete booking workflow', async ({ page }) => {

  // ── STEP 1: Browse events (landing page) ───────────────────────────────────
  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
  await shot(page, '01-landing-events.png', 'Step 1 · Browse Events')

  // ── STEP 2: Login page ─────────────────────────────────────────────────────
  await page.goto(`${BASE}/login`)
  await page.waitForSelector('button:has-text("Register")', { timeout: 8000 })
  await shot(page, '02-login-page.png', 'Step 2 · Sign In / Register')

  // Switch to Register tab
  await page.click('button:has-text("Register")')
  await page.waitForSelector('#name', { timeout: 5000 })
  await shot(page, '03-register-tab.png', 'Step 2b · Register Tab Active')

  // ── STEP 3: Register new user ──────────────────────────────────────────────
  await page.fill('#name',     USER.name)
  await page.fill('#email',    USER.email)
  await page.fill('#phone',    USER.phone)
  await page.fill('#password', USER.password)
  await shot(page, '04-register-filled.png', 'Step 3 · Registration Form')

  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE}/`, { timeout: 15000 })
  await page.waitForLoadState('networkidle')
  // Confirm user name appears in navbar
  await expect(page.getByText(USER.name.split(' ')[0]).first()).toBeVisible({ timeout: 8000 })
  await shot(page, '05-registered-logged-in.png', 'Step 3 · Registered & Logged In ✓')

  // ── STEP 4: Navigate to event detail (Live Festival 7 — Pune, ON_SALE) ─────
  await page.goto(`${BASE}/events/7`)
  await page.waitForLoadState('networkidle')
  // Wait for seat grid to fully render (seats have title attrs)
  await page.waitForSelector('button[title*="AVAILABLE"]', { timeout: 15000 })
  await shot(page, '06-event-detail.png', 'Step 4 · Event Detail — Live Festival 7')

  // ── STEP 5: Select a seat ──────────────────────────────────────────────────
  // Seat buttons: title = "R01-S07 — ₹2,598.70 — AVAILABLE"
  // Pick first AVAILABLE seat (non-disabled)
  const firstAvailable = page.locator('button[title*="AVAILABLE"]').first()
  await firstAvailable.waitFor({ state: 'visible', timeout: 8000 })
  await firstAvailable.click()
  await page.waitForTimeout(600)
  await shot(page, '07-seat-selected.png', 'Step 5 · Seat Selected (highlighted blue)')

  // Order Summary card should now show price breakdown
  await expect(page.locator('h3:has-text("Order Summary")')).toBeVisible({ timeout: 5000 })
  await shot(page, '08-order-summary-card.png', 'Step 5 · Order Summary with Subtotal + Tax')

  // ── STEP 6: Open Booking Modal ─────────────────────────────────────────────
  // The sidebar shows "Pay ₹XXXX" button when seat(s) are selected
  // Scope to the sidebar card area to avoid ambiguity
  const sidebarPayBtn = page.locator('h3:has-text("Order Summary")')
    .locator('xpath=ancestor::div[contains(@class,"space-y")]')
    .locator('button:has-text("Pay")')
    .first()
  // Fallback: any button with "Pay ₹" text
  const anyPayBtn = page.locator('button:has-text("Pay ₹")').first()

  const payBtnVisible = await sidebarPayBtn.isVisible().catch(() => false)
  await (payBtnVisible ? sidebarPayBtn : anyPayBtn).click()

  // Wait for the modal overlay to appear (fixed inset-0 z-50)
  await page.waitForSelector('.fixed.inset-0', { timeout: 8000 })
  await page.waitForSelector('h3:has-text("Review & Pay")', { timeout: 8000 })
  await shot(page, '09-booking-modal-review.png', 'Step 6 · Booking Modal — Review & Pay')

  // ── STEP 7: Choose UPI payment and confirm ─────────────────────────────────
  await page.selectOption('#payMethod', 'UPI')
  await page.waitForTimeout(300)
  await shot(page, '10-payment-method-upi.png', 'Step 7 · Payment Method — UPI')

  // Scope Pay button to modal (inside .fixed overlay)
  const modalPayBtn = page.locator('.fixed.inset-0').locator('button:has-text("Pay")')

  // Retry up to 3x for the ~80% success rate
  let confirmed = false
  for (let attempt = 1; attempt <= 3 && !confirmed; attempt++) {
    if (attempt > 1) {
      // Payment failed — modal may still be open with error. Re-select method and retry.
      const stillReview = await page.locator('h3:has-text("Review & Pay")').isVisible().catch(() => false)
      if (!stillReview) {
        // Modal closed — reopen
        await (payBtnVisible ? sidebarPayBtn : anyPayBtn).click()
        await page.waitForSelector('h3:has-text("Review & Pay")', { timeout: 6000 })
      }
      await page.selectOption('#payMethod', 'UPI').catch(() => {})
    }

    await modalPayBtn.click()
    await page.waitForTimeout(400)
    await shot(page, `10b-processing-attempt-${attempt}.png`, `Step 7 · Processing Payment… (attempt ${attempt})`)

    // Wait up to 25s for either confirmed or failed
    const result = await Promise.race([
      page.waitForSelector('h3:has-text("Booking Confirmed!")', { timeout: 25000 }).then(() => 'confirmed'),
      page.waitForSelector('text=Payment failed', { timeout: 25000 }).then(() => 'failed'),
    ]).catch(() => 'timeout')

    if (result === 'confirmed') {
      confirmed = true
    } else {
      console.log(`  Attempt ${attempt}: payment ${result} — retrying…`)
      await page.waitForTimeout(800)
    }
  }

  if (!confirmed) throw new Error('Payment failed 3 consecutive times — check payment-service')

  // ── STEP 8: Booking Confirmed + E-Ticket ──────────────────────────────────
  await shot(page, '11-booking-confirmed.png', 'Step 8 · Booking Confirmed! ✓')

  // Capture the ticket code
  const ticketCodeEl = page.locator('.font-mono').filter({ hasText: /TKT/ }).first()
  const ticketCode   = await ticketCodeEl.textContent().catch(() => '(see screenshot)')
  console.log('\n  🎟  Ticket code:', ticketCode?.trim())

  await shot(page, '12-ticket-code.png', 'Step 8 · E-Ticket Code — ISSUED')

  // Click "Done" to close the modal
  await page.locator('.fixed.inset-0').locator('button:has-text("Done")').click()
  await page.waitForSelector('.fixed.inset-0', { state: 'hidden', timeout: 6000 }).catch(() => {})
  await page.waitForTimeout(500)
  await shot(page, '13-back-to-event-allocated.png', 'Step 8 · Seat Now ALLOCATED (grey)')

  // ── STEP 9: My Orders page ─────────────────────────────────────────────────
  await page.goto(`${BASE}/orders`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500)
  await shot(page, '14-orders-page.png', 'Step 9 · My Orders')

  // Most recent order should show CONFIRMED + our event
  await expect(page.locator('text=CONFIRMED').first()).toBeVisible({ timeout: 12000 })
  await shot(page, '15-order-confirmed-with-ticket.png', 'Step 9 · Order CONFIRMED + Ticket Code')

  // ── STEP 10: Notifications page ───────────────────────────────────────────
  await page.goto(`${BASE}/notifications`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  await shot(page, '16-notifications-page.png', 'Step 10 · Notifications')

  // Booking confirmation email notification should be present
  await expect(page.locator('text=Booking Confirmed').first()).toBeVisible({ timeout: 12000 })
  await shot(page, '17-notification-email-sent.png', 'Step 10 · Email Notification — SENT ✓')

  // ── FINAL: User profile ────────────────────────────────────────────────────
  await page.goto(`${BASE}/profile`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)
  await shot(page, '18-user-profile.png', `Complete · ${USER.name}'s Profile`)

  console.log('\n  ✅  Full workflow complete!')
  console.log(`  User  : ${USER.email}`)
  console.log(`  Ticket: ${ticketCode?.trim()}`)
  console.log(`  Screenshots → playwright-demo/screenshots/`)
})
