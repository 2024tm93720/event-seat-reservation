import { useState, useEffect, useRef } from 'react'
import { CheckCircle, XCircle, Loader2, CreditCard, Ticket, ArrowRight, X } from 'lucide-react'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { Select, Label } from './ui/Input'
import { Spinner } from './ui/Spinner'
import { formatPrice, tempOrderId } from '../lib/utils'
import { reserveSeats, placeOrder, getOrder, releaseSeats, allocateSeats } from '../lib/api'

const PAYMENT_METHODS = [
  { value: 'UPI',          label: 'UPI' },
  { value: 'CREDIT_CARD',  label: 'Credit Card' },
  { value: 'DEBIT_CARD',   label: 'Debit Card' },
  { value: 'WALLET',       label: 'Wallet' },
  { value: 'NET_BANKING',  label: 'Net Banking' },
]

const STEPS = ['select', 'review', 'processing', 'done']

export function BookingFlow({ event, selectedSeats, userId, onClose, onSuccess }) {
  const [step, setStep]             = useState('review')    // review | processing | done
  const [payMethod, setPayMethod]   = useState('UPI')
  const [error, setError]           = useState(null)
  const [order, setOrder]           = useState(null)
  const [reservation, setReservation] = useState(null)
  const [tempId]                    = useState(tempOrderId)
  const pollRef                     = useRef(null)

  const subtotal = selectedSeats.reduce((sum, s) => sum + (s.seat_price || 0), 0)
  const tax      = +(subtotal * 0.05).toFixed(2)
  const total    = +(subtotal + tax).toFixed(2)

  // Reserve seats when the modal opens
  useEffect(() => {
    if (!selectedSeats.length) return
    reserveSeats(tempId, userId, selectedSeats.map((s) => s.seat_id))
      .then((r) => setReservation(r.data))
      .catch(() => {
        setError('Could not hold selected seats. Please try again.')
      })
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  function handleCancel() {
    releaseSeats(tempId).catch(() => {})
    onClose?.()
  }

  async function handleConfirmPayment() {
    setError(null)
    setStep('processing')
    try {
      // Place the order (async — returns RESERVED immediately)
      const orderBody = {
        userId,
        eventId: event.event_id,
        seats: selectedSeats.map((s) => ({
          seatId:    s.seat_id,
          seatLabel: s.seat_label || s.seat_number || String(s.seat_id),
          section:   s.section   || 'General',
          seatPrice: s.seat_price,
        })),
        idempotencyKey: tempId,
      }
      const { data: placed } = await placeOrder(orderBody)
      setOrder(placed)

      // Poll for payment result
      pollRef.current = setInterval(async () => {
        try {
          const { data: updated } = await getOrder(placed.orderId)
          setOrder(updated)
          if (updated.orderStatus === 'CONFIRMED') {
            clearInterval(pollRef.current)
            await allocateSeats(tempId).catch(() => {})
            setStep('done')
            onSuccess?.(updated)
          } else if (['PAYMENT_FAILED', 'CANCELLED', 'REJECTED'].includes(updated.orderStatus)) {
            clearInterval(pollRef.current)
            await releaseSeats(tempId).catch(() => {})
            setError(`Payment ${updated.orderStatus.replace('_', ' ').toLowerCase()}. Please try again.`)
            setStep('review')
          }
        } catch {
          // keep polling
        }
      }, 2500)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to place order. Please try again.')
      setStep('review')
    }
  }

  if (step === 'done' && order) {
    return (
      <div className="flex flex-col items-center gap-5 py-8 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
          <CheckCircle className="h-9 w-9 text-success" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Booking Confirmed!</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your tickets have been issued. Enjoy the show!
          </p>
        </div>
        <div className="w-full rounded-xl border border-border bg-muted/40 p-4 text-left space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order ID</span>
            <span className="font-mono font-semibold">#{order.orderId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Paid</span>
            <span className="font-bold">{formatPrice(order.orderTotal)}</span>
          </div>
          <div className="space-y-1.5 pt-1 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tickets</p>
            {order.tickets?.map((t) => (
              <div key={t.ticketId} className="flex items-center gap-2 text-xs">
                <Ticket className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="font-mono">{t.ticketCode}</span>
                <Badge variant="success" className="ml-auto">ISSUED</Badge>
              </div>
            ))}
          </div>
        </div>
        <Button className="w-full" onClick={onClose}>Done</Button>
      </div>
    )
  }

  if (step === 'processing') {
    return (
      <div className="flex flex-col items-center gap-5 py-12 px-4 text-center">
        <Spinner size="lg" />
        <div>
          <h3 className="text-lg font-semibold">Processing Payment…</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This usually takes a few seconds. Please don't close this window.
          </p>
        </div>
        {order && (
          <p className="text-xs text-muted-foreground">
            Order #{order.orderId} · Status: {order.orderStatus}
          </p>
        )}
      </div>
    )
  }

  // review step
  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Review & Pay</h3>
        <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Selected seats */}
      <div>
        <p className="mb-2 text-sm font-semibold">Selected Seats ({selectedSeats.length})</p>
        <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
          {selectedSeats.map((s) => (
            <div key={s.seat_id} className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
              <span>{s.section || 'General'} · {s.seat_label || s.seat_number || s.seat_id}</span>
              <span className="font-semibold">{formatPrice(s.seat_price)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Tax (5%)</span><span>{formatPrice(tax)}</span>
        </div>
        <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-1">
          <span>Total</span><span>{formatPrice(total)}</span>
        </div>
      </div>

      {/* Payment method */}
      <div className="space-y-1.5">
        <Label htmlFor="payMethod">Payment Method</Label>
        <Select id="payMethod" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </Select>
      </div>

      {/* CTA */}
      <Button className="w-full gap-2" onClick={handleConfirmPayment}>
        <CreditCard className="h-4 w-4" />
        Pay {formatPrice(total)}
        <ArrowRight className="h-4 w-4 ml-auto" />
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Payment is simulated (~80% success rate for demo)
      </p>
    </div>
  )
}
