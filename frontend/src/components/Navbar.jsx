import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Ticket, LogOut, User, LayoutDashboard, Bell } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { getUserNotifications } from '../lib/api'
import { Button } from './ui/Button'
import { cn } from '../lib/utils'

export function Navbar() {
  const { user, logout, isLoggedIn, isAdmin } = useAuth()
  const navigate = useNavigate()

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.userId],
    queryFn:  () => getUserNotifications(user.userId).then((r) => r.data),
    enabled:  !!user?.userId,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  const unreadCount = notifications.filter((n) => n.status === 'SENT').length

  const linkClass = ({ isActive }) =>
    cn(
      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
      isActive
        ? 'bg-accent text-accent-foreground'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
    )

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm group-hover:opacity-90 transition-opacity">
            <Ticket className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight">SeatSavvy</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <NavLink to="/" className={linkClass} end>Events</NavLink>
          {isLoggedIn && (
            <NavLink to="/orders" className={linkClass}>My Orders</NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              <span className="flex items-center gap-1.5">
                <LayoutDashboard className="h-3.5 w-3.5" />
                Admin
              </span>
            </NavLink>
          )}
        </nav>

        {/* Auth area */}
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              {/* Notifications bell */}
              <NavLink
                to="/notifications"
                className={({ isActive }) =>
                  cn('relative flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                  )
                }
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>

              {/* Profile */}
              <Link
                to="/profile"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-1 hover:bg-accent/50"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user.name}</span>
              </Link>

              {/* Logout */}
              <Button variant="ghost" size="icon" onClick={() => { logout(); navigate('/login') }} title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate('/login')}>Sign In</Button>
          )}
        </div>
      </div>
    </header>
  )
}
