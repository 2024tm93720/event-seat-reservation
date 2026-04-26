import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Ticket, Search, ShoppingBag } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { OrderCard } from '../components/OrderCard'
import { OrderCardSkeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../context/AuthContext'
import { getUserOrders, getOrderPayment, cancelOrder } from '../lib/api'

function OrderWithPayment({ order, onCancel }) {
  const { data: payment } = useQuery({
    queryKey: ['payment-order', order.orderId],
    queryFn:  () => getOrderPayment(order.orderId).then((r) => r.data).catch(() => null),
    staleTime: 60_000,
    retry: false,
  })
  return <OrderCard order={order} payment={payment} onCancel={onCancel} />
}

export function OrdersPage() {
  const { user, isLoggedIn } = useAuth()
  const navigate             = useNavigate()
  const queryClient          = useQueryClient()

  const [uidInput, setUidInput] = useState(user?.userId ? String(user.userId) : '')
  const [lookupId, setLookupId] = useState(user?.userId ? String(user.userId) : '')
  const [cancelError, setCancelError] = useState(null)

  useEffect(() => {
    if (user?.userId) {
      setUidInput(String(user.userId))
      setLookupId(String(user.userId))
    }
  }, [user?.userId])

  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ['orders', lookupId],
    queryFn:  () => getUserOrders(lookupId).then((r) => r.data),
    enabled:  !!lookupId,
    staleTime: 30_000,
  })

  async function handleCancel(orderId) {
    setCancelError(null)
    try {
      await cancelOrder(orderId)
      queryClient.invalidateQueries({ queryKey: ['orders', lookupId] })
    } catch (err) {
      setCancelError(err?.response?.data?.message || 'Could not cancel order.')
    }
  }

  const sorted = [...orders].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Orders</h1>
        <p className="mt-1 text-muted-foreground">View your booking history and tickets</p>
      </div>

      {/* User ID lookup */}
      {!isLoggedIn && (
        <div className="mb-6 rounded-xl border border-border bg-muted/30 p-4">
          <p className="mb-3 text-sm font-medium">Enter your User ID to view orders</p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="User ID…"
              value={uidInput}
              onChange={(e) => setUidInput(e.target.value)}
              className="max-w-[160px]"
            />
            <Button variant="outline" size="sm"
              onClick={() => setLookupId(uidInput)}
              disabled={!uidInput}>
              <Search className="h-4 w-4" /> Load
            </Button>
          </div>
        </div>
      )}

      {cancelError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {cancelError}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <OrderCardSkeleton key={i} />)}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="py-12 text-center">
          <p className="text-destructive font-medium">Failed to load orders.</p>
          <p className="mt-1 text-sm text-muted-foreground">Make sure the order service is running on port 8965.</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && lookupId && sorted.length === 0 && (
        <div className="py-16 text-center">
          <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="font-medium">No orders found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoggedIn ? "You haven't placed any orders yet." : `No orders found for user #${lookupId}.`}
          </p>
          <Link to="/"><Button variant="outline" size="sm" className="mt-4">Browse Events</Button></Link>
        </div>
      )}

      {/* No lookup yet */}
      {!isLoading && !lookupId && !isLoggedIn && (
        <div className="py-16 text-center">
          <Ticket className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Enter a user ID above to view orders.</p>
        </div>
      )}

      {/* Orders list */}
      {!isLoading && sorted.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground mb-2">
            {sorted.length} order{sorted.length !== 1 ? 's' : ''} found
          </p>
          {sorted.map((order) => (
            <OrderWithPayment key={order.orderId} order={order} onCancel={handleCancel} />
          ))}
        </div>
      )}
    </div>
  )
}
