import axios from 'axios'

const make = (base) =>
  axios.create({ baseURL: base, timeout: 15000, headers: { 'Content-Type': 'application/json' } })

export const usersAPI         = make(import.meta.env.VITE_USERS_API_URL         || '/api/users')
export const catalogAPI       = make(import.meta.env.VITE_CATALOG_API_URL       || '/api/catalog')
export const seatingAPI       = make(import.meta.env.VITE_SEATING_API_URL       || '/api/seating')
export const ordersAPI        = make(import.meta.env.VITE_ORDERS_API_URL        || '/api/orders')
export const paymentsAPI      = make(import.meta.env.VITE_PAYMENTS_API_URL      || '/api/payments')
export const notificationsAPI = make(import.meta.env.VITE_NOTIFICATIONS_API_URL || '/api/notifications')

// ── Users ────────────────────────────────────────────────────────────────────
export const loginUser    = (email, password) =>
  usersAPI.post('/v1/users/login', { email, password })
export const registerUser = (data) =>
  usersAPI.post('/v1/users', data)
export const getUser      = (id) =>
  usersAPI.get(`/v1/users/${id}`)

// ── Catalog ──────────────────────────────────────────────────────────────────
export const getEvents    = (params) => catalogAPI.get('/v1/events', { params })
export const getEvent     = (id)     => catalogAPI.get(`/v1/events/${id}`)
export const getEventSeats = (id)    => catalogAPI.get(`/v1/events/${id}/seats`)
export const getVenues    = (params) => catalogAPI.get('/v1/venues', { params })

// ── Seating ──────────────────────────────────────────────────────────────────
export const getSeatAvailability = (eventId) =>
  seatingAPI.get('/v1/seats', { params: { eventId } })
export const reserveSeats = (orderId, userId, seatIds) =>
  seatingAPI.post('/v1/seats/reserve', { orderId, userId, seatIds })
export const releaseSeats = (orderId) =>
  seatingAPI.post('/v1/seats/release', { orderId })
export const allocateSeats = (orderId) =>
  seatingAPI.post('/v1/seats/allocate', { orderId })

// ── Orders ───────────────────────────────────────────────────────────────────
export const placeOrder   = (body)   => ordersAPI.post('/v1/orders', body)
export const getOrder     = (id)     => ordersAPI.get(`/v1/orders/${id}`)
export const getUserOrders = (userId) =>
  ordersAPI.get('/v1/orders', { params: { userId } })
export const getAllOrders  = (params) => ordersAPI.get('/v1/orders/all', { params })
export const getOrderStats = ()      => ordersAPI.get('/v1/orders/stats')
export const cancelOrder  = (id)     => ordersAPI.delete(`/v1/orders/${id}`)
export const confirmOrder = (id)     => ordersAPI.post(`/v1/orders/${id}/confirm`)

// ── Payments ─────────────────────────────────────────────────────────────────
export const chargePayment  = (body) => paymentsAPI.post('/v1/payments/charge', body)
export const refundPayment  = (body) => paymentsAPI.post('/v1/payments/refund', body)
export const getPayment     = (id)   => paymentsAPI.get(`/v1/payments/${id}`)
export const getOrderPayment = (orderId) =>
  paymentsAPI.get(`/v1/payments/order/${orderId}`)
export const getAllPayments  = (params) => paymentsAPI.get('/v1/payments/all', { params })
export const getPaymentStats = ()    => paymentsAPI.get('/v1/payments/stats')
