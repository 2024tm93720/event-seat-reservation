export function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatDateTime(str) {
  if (!str) return '—'
  return new Date(str).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatPrice(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(amount)
}

export const EVENT_STATUS_VARIANT = {
  ON_SALE:  'success',
  SOLD_OUT: 'destructive',
  CANCELLED:'secondary',
}

export const ORDER_STATUS_VARIANT = {
  CONFIRMED:     'success',
  RESERVED:      'warning',
  PENDING:       'warning',
  PAYMENT_FAILED:'destructive',
  CANCELLED:     'secondary',
  REJECTED:      'destructive',
}

export const PAYMENT_STATUS_VARIANT = {
  SUCCESS:  'success',
  FAILED:   'destructive',
  PENDING:  'warning',
  REFUNDED: 'secondary',
}

export const EVENT_GRADIENTS = {
  MUSIC:       'from-violet-500 via-purple-600 to-indigo-700',
  SPORTS:      'from-emerald-400 via-teal-500 to-green-700',
  THEATRE:     'from-amber-400 via-orange-500 to-red-600',
  COMEDY:      'from-sky-400 via-blue-500 to-cyan-600',
  CONFERENCE:  'from-slate-500 via-gray-600 to-zinc-700',
  FESTIVAL:    'from-rose-400 via-pink-500 to-fuchsia-600',
  DANCE:       'from-fuchsia-400 via-purple-500 to-violet-600',
  EXHIBITION:  'from-teal-400 via-cyan-500 to-sky-600',
  CONCERT:     'from-violet-400 via-purple-500 to-pink-600',
  OPERA:       'from-amber-600 via-yellow-500 to-orange-500',
}

export function eventGradient(type) {
  return EVENT_GRADIENTS[(type || '').toUpperCase()] || 'from-indigo-400 via-violet-500 to-purple-600'
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

// Generate a temp orderId for seat reservation before the real order is placed
export function tempOrderId() {
  return 'TEMP-' + Math.random().toString(36).slice(2, 10).toUpperCase()
}
