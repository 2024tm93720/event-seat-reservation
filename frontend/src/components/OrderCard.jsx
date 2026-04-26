import { useState } from 'react'
import { ChevronDown, ChevronUp, Ticket, CreditCard } from 'lucide-react'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { formatDateTime, formatPrice, ORDER_STATUS_VARIANT, PAYMENT_STATUS_VARIANT, eventGradient } from '../lib/utils'

export function OrderCard({ order, payment, onCancel, onViewTickets }) {
  const [expanded, setExpanded] = useState(false)

  const statusVariant  = ORDER_STATUS_VARIANT[order.orderStatus] ?? 'secondary'
  const payVariant     = payment ? (PAYMENT_STATUS_VARIANT[payment.status] ?? 'secondary') : null

  const canCancel = ['RESERVED', 'PENDING'].includes(order.orderStatus)

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Color bar / mini visual */}
        <div className={`sm:w-2 h-1 sm:h-auto bg-gradient-to-b from-primary/60 to-primary/30 flex-shrink-0`} />

        <div className="flex-1 p-5">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            {/* Event thumbnail */}
            {order.eventId && (
              <div className={`hidden sm:flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${eventGradient()}`}>
                <Ticket className="h-6 w-6 text-white/80" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground font-mono">#{order.orderId}</span>
                <Badge variant={statusVariant}>{order.orderStatus?.replace('_', ' ')}</Badge>
                {payment && <Badge variant={payVariant}>{payment.status}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                Event #{order.eventId} · {order.seatCount} seat{order.seatCount !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDateTime(order.createdAt)}
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold text-foreground">{formatPrice(order.orderTotal)}</p>
              <p className="text-xs text-muted-foreground">
                {formatPrice(order.subtotal)} + {formatPrice(order.taxAmount)} tax
              </p>
            </div>
          </div>

          {/* Tickets (collapsed) */}
          {order.tickets?.length > 0 && (
            <button
              className="mt-3 flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setExpanded((v) => !v)}
            >
              <span className="flex items-center gap-1.5">
                <Ticket className="h-3.5 w-3.5" />
                {order.tickets.length} ticket{order.tickets.length !== 1 ? 's' : ''} issued
              </span>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}

          {expanded && order.tickets?.length > 0 && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {order.tickets.map((t) => (
                <div key={t.ticketId}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs">
                  <Ticket className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="font-mono text-foreground">{t.ticketCode}</span>
                  <Badge variant={t.ticketStatus === 'ISSUED' ? 'success' : 'secondary'} className="ml-auto text-[10px]">
                    {t.ticketStatus}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Payment info */}
          {payment && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" />
              <span>{payment.method?.replace('_', ' ')} · {payment.reference}</span>
            </div>
          )}

          {/* Actions */}
          {canCancel && (
            <div className="mt-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => onCancel?.(order.orderId)}
                className="text-destructive hover:bg-destructive/10 border-destructive/30">
                Cancel Order
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
