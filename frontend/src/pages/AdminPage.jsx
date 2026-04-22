import { useQuery } from '@tanstack/react-query'
import {
  BarChart3, ShoppingCart, CreditCard, CheckCircle,
  XCircle, Clock, RefreshCw, Ticket, TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { getOrderStats, getPaymentStats, getAllOrders, getAllPayments } from '../lib/api'
import {
  formatPrice, formatDateTime,
  ORDER_STATUS_VARIANT, PAYMENT_STATUS_VARIANT,
} from '../lib/utils'

function StatCard({ icon: Icon, label, value, sub, color = 'primary' }) {
  const colors = {
    primary:     'bg-primary/10 text-primary',
    success:     'bg-success/10 text-success',
    destructive: 'bg-destructive/10 text-destructive',
    warning:     'bg-warning/10 text-warning',
    muted:       'bg-muted text-muted-foreground',
  }
  return (
    <Card>
      <CardContent className="p-5 flex items-start gap-4">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${colors[color] ?? colors.primary}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className="mt-0.5 text-2xl font-bold">{value ?? '—'}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function StatSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 flex items-start gap-4">
        <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminPage() {
  const { data: orderStats, isLoading: osLoading, refetch: refetchOS } = useQuery({
    queryKey: ['orderStats'],
    queryFn:  () => getOrderStats().then((r) => r.data),
    staleTime: 30_000,
  })

  const { data: payStats, isLoading: psLoading, refetch: refetchPS } = useQuery({
    queryKey: ['payStats'],
    queryFn:  () => getPaymentStats().then((r) => r.data),
    staleTime: 30_000,
  })

  const { data: recentOrders, isLoading: roLoading, refetch: refetchRO } = useQuery({
    queryKey: ['allOrders', 0],
    queryFn:  () => getAllOrders({ page: 0, size: 10 }).then((r) => r.data),
    staleTime: 30_000,
  })

  const { data: recentPayments, isLoading: rpLoading, refetch: refetchRP } = useQuery({
    queryKey: ['allPayments', 0],
    queryFn:  () => getAllPayments({ page: 0, size: 10 }).then((r) => r.data),
    staleTime: 30_000,
  })

  function refetchAll() { refetchOS(); refetchPS(); refetchRO(); refetchRP() }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Admin Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">Live stats and recent activity</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetchAll}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* ── Order Stats ── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Orders</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {osLoading ? Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />) : [
            { icon: ShoppingCart, label: 'Total',        value: orderStats?.total,        color: 'primary' },
            { icon: CheckCircle,  label: 'Confirmed',    value: orderStats?.confirmed,    color: 'success' },
            { icon: Clock,        label: 'Reserved',     value: orderStats?.reserved,     color: 'warning' },
            { icon: XCircle,      label: 'Failed',       value: orderStats?.paymentFailed,color: 'destructive' },
            { icon: XCircle,      label: 'Cancelled',    value: orderStats?.cancelled,    color: 'muted' },
            { icon: Ticket,       label: 'Tickets',      value: orderStats?.totalTickets, color: 'primary' },
          ].map((s) => <StatCard key={s.label} {...s} />)}
        </div>
      </section>

      {/* ── Payment Stats ── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Payments</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {psLoading ? Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />) : [
            { icon: CreditCard,  label: 'Total',     value: payStats?.total,    color: 'primary' },
            { icon: CheckCircle, label: 'Successful',value: payStats?.success,  color: 'success' },
            { icon: XCircle,     label: 'Failed',    value: payStats?.failed,   color: 'destructive' },
            { icon: Clock,       label: 'Pending',   value: payStats?.pending,  color: 'warning' },
            {
              icon: TrendingUp,
              label: 'Revenue',
              value: formatPrice(payStats?.totalRevenue),
              color: 'success',
              sub: `${payStats?.refunded ?? 0} refunded`,
            },
          ].map((s) => <StatCard key={s.label} {...s} />)}
        </div>
      </section>

      {/* ── Tables ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">ID</th>
                    <th className="px-4 py-2.5 text-left font-medium">User</th>
                    <th className="px-4 py-2.5 text-left font-medium">Total</th>
                    <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    <th className="px-4 py-2.5 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {roLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        {Array.from({ length: 5 }).map((__, j) => (
                          <td key={j} className="px-4 py-2.5">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : recentOrders?.orders?.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">No orders yet</td></tr>
                  ) : (
                    recentOrders?.orders?.map((o) => (
                      <tr key={o.orderId} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs">#{o.orderId}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">#{o.userId}</td>
                        <td className="px-4 py-2.5 font-semibold">{formatPrice(o.orderTotal)}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant={ORDER_STATUS_VARIANT[o.orderStatus] ?? 'secondary'} className="text-[10px]">
                            {o.orderStatus?.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(o.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-primary" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-left font-medium">Ref</th>
                    <th className="px-4 py-2.5 text-left font-medium">Order</th>
                    <th className="px-4 py-2.5 text-left font-medium">Amount</th>
                    <th className="px-4 py-2.5 text-left font-medium">Method</th>
                    <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rpLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        {Array.from({ length: 5 }).map((__, j) => (
                          <td key={j} className="px-4 py-2.5"><Skeleton className="h-4 w-full" /></td>
                        ))}
                      </tr>
                    ))
                  ) : recentPayments?.payments?.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">No payments yet</td></tr>
                  ) : (
                    recentPayments?.payments?.map((p) => (
                      <tr key={p.paymentId} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs truncate max-w-[100px]" title={p.reference}>{p.reference?.slice(-8)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">#{p.orderId}</td>
                        <td className="px-4 py-2.5 font-semibold">{formatPrice(p.amount)}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.method?.replace('_', ' ')}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant={PAYMENT_STATUS_VARIANT[p.status] ?? 'secondary'} className="text-[10px]">
                            {p.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
