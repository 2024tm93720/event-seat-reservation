import { useQuery } from '@tanstack/react-query'
import { User, Mail, Phone, MapPin, ShieldCheck, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { getUser, getUserOrders } from '../lib/api'

function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-semibold truncate">{value || '—'}</p>
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { user } = useAuth()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user', user?.userId],
    queryFn:  () => getUser(user.userId).then((r) => r.data),
    enabled:  !!user?.userId,
    staleTime: 60_000,
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['userOrders', user?.userId],
    queryFn:  () => getUserOrders(user.userId).then((r) => r.data),
    enabled:  !!user?.userId,
    staleTime: 30_000,
  })

  const initials = (profile?.name || user?.name || '')
    .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)

  const confirmedOrders = orders.filter((o) => o.orderStatus === 'CONFIRMED').length
  const totalOrders     = orders.length

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      {/* Avatar + name header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold select-none">
              {initials || <User className="h-7 w-7" />}
            </div>
            <div className="min-w-0">
              {isLoading ? (
                <>
                  <Skeleton className="h-6 w-40 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </>
              ) : (
                <>
                  <h1 className="text-xl font-bold truncate">{profile?.name}</h1>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={profile?.role === 'admin' ? 'primary' : 'secondary'} className="text-xs">
                      {profile?.role === 'admin' ? (
                        <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Admin</span>
                      ) : 'User'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">ID #{profile?.user_id}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile details */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {isLoading ? (
            <div className="space-y-4 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <Field icon={User}   label="Full Name"  value={profile?.name} />
              <Field icon={Mail}   label="Email"      value={profile?.email} />
              <Field icon={Phone}  label="Phone"      value={profile?.phone} />
              <Field icon={MapPin} label="City"       value={profile?.city} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Order summary */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Booking Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-2xl font-bold">{totalOrders}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Orders</p>
            </div>
            <div className="rounded-lg bg-success/10 p-4 text-center">
              <p className="text-2xl font-bold text-success">{confirmedOrders}</p>
              <p className="text-xs text-muted-foreground mt-1">Confirmed</p>
            </div>
          </div>
          <Link to="/orders" className="mt-4 block">
            <Button variant="outline" className="w-full gap-2">
              <ShoppingBag className="h-4 w-4" />
              View My Orders
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
