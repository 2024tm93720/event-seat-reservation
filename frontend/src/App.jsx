import { Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { EventsPage }      from './pages/EventsPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { OrdersPage }      from './pages/OrdersPage'
import { ProfilePage }           from './pages/ProfilePage'
import { NotificationsPage }     from './pages/NotificationsPage'
import { AdminPage }       from './pages/AdminPage'
import { LoginPage }       from './pages/LoginPage'
import { useAuth }         from './context/AuthContext'

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>{children}</main>
      <footer className="mt-16 border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SeatSavvy — Event Ticketing &amp; Seat Reservation
      </footer>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function AdminRoute({ children }) {
  const { isLoggedIn, isAdmin } = useAuth()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Layout><EventsPage /></Layout>} />
      <Route path="/events/:eventId" element={<Layout><EventDetailPage /></Layout>} />
      <Route path="/orders"  element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
      <Route path="/profile"       element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
