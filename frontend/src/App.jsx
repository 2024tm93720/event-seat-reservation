import { Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { EventsPage }      from './pages/EventsPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { OrdersPage }      from './pages/OrdersPage'
import { AdminPage }       from './pages/AdminPage'
import { LoginPage }       from './pages/LoginPage'

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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Layout><EventsPage /></Layout>} />
      <Route path="/events/:eventId" element={<Layout><EventDetailPage /></Layout>} />
      <Route path="/orders" element={<Layout><OrdersPage /></Layout>} />
      <Route path="/admin" element={<Layout><AdminPage /></Layout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
