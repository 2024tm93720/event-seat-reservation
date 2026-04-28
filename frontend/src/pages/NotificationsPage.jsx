import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell, Mail, CheckCircle, XCircle, Clock, Ticket, X, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { getUserNotifications } from '../lib/api'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function statusVariant(status) {
  if (status === 'SENT')   return 'success'
  if (status === 'FAILED') return 'destructive'
  return 'warning'
}

function statusIcon(status) {
  if (status === 'SENT')   return <CheckCircle className="h-3.5 w-3.5" />
  if (status === 'FAILED') return <XCircle className="h-3.5 w-3.5" />
  return <Clock className="h-3.5 w-3.5" />
}

// ── Email preview modal ───────────────────────────────────────────────────────
function EmailPreviewModal({ notification: n, onClose }) {
  const hasHtml = n.body && n.body.trim().startsWith('<')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-background shadow-2xl overflow-hidden">

        {/* Modal header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-primary flex-shrink-0" />
              <Badge variant={statusVariant(n.status)} className="gap-1 text-[10px]">
                {statusIcon(n.status)} {n.status}
              </Badge>
            </div>
            <p className="text-sm font-semibold leading-snug">{n.subject}</p>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              {n.order_id && n.order_id !== '0' && (
                <span className="flex items-center gap-1">
                  <Ticket className="h-3 w-3" /> Order #{n.order_id}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {timeAgo(n.created_at)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Email content */}
        <div className="flex-1 overflow-auto bg-gray-100">
          {hasHtml ? (
            <iframe
              srcDoc={n.body}
              title="Email preview"
              className="w-full border-0"
              style={{ minHeight: '520px', height: '100%' }}
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="p-6 text-sm text-muted-foreground whitespace-pre-wrap">
              {n.body || 'No content available.'}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Notification row card ─────────────────────────────────────────────────────
function NotificationCard({ notification: n, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/40 hover:border-primary/30 transition-all group"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
        <Mail className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground leading-snug">{n.subject}</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge variant={statusVariant(n.status)} className="text-[10px] gap-1">
              {statusIcon(n.status)} {n.status}
            </Badge>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {n.order_id && n.order_id !== '0' && (
            <span className="flex items-center gap-1">
              <Ticket className="h-3.5 w-3.5" /> Order #{n.order_id}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {timeAgo(n.created_at)}
          </span>
          <span className="capitalize">{n.channel?.toLowerCase()}</span>
        </div>
      </div>
    </button>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Bell className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold text-foreground">No notifications yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You'll receive a confirmation email here after every successful booking.
        </p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function NotificationsPage() {
  const { user } = useAuth()
  const [selected, setSelected] = useState(null)

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.userId],
    queryFn:  () => getUserNotifications(user.userId).then((r) => r.data),
    enabled:  !!user?.userId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const sentCount   = notifications.filter((n) => n.status === 'SENT').length
  const failedCount = notifications.filter((n) => n.status === 'FAILED').length

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              Notifications
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Click any notification to view the email
            </p>
          </div>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              <Badge variant="success" className="gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> {sentCount} sent
              </Badge>
              {failedCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3.5 w-3.5" /> {failedCount} failed
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground font-medium">
              {isLoading ? 'Loading…' : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border border-border">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))
            ) : notifications.length === 0 ? (
              <EmptyState />
            ) : (
              notifications.map((n) => (
                <NotificationCard
                  key={n.notification_id}
                  notification={n}
                  onClick={() => setSelected(n)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview modal */}
      {selected && (
        <EmailPreviewModal notification={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
