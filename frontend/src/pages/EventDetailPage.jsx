import { useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, MapPin, Calendar, Tag, Users, ShoppingCart, X } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { SeatGrid } from '../components/SeatGrid'
import { BookingFlow } from '../components/BookingFlow'
import { useAuth } from '../context/AuthContext'
import { getEvent, getEventSeats, getSeatAvailability, getVenue } from '../lib/api'
import { formatDate, formatDateTime, formatDateLong, formatPrice, EVENT_STATUS_VARIANT, eventGradient } from '../lib/utils'

export function EventDetailPage() {
  const { eventId }           = useParams()
  const navigate              = useNavigate()
  const { user, isLoggedIn }  = useAuth()

  const [selectedSeats, setSelectedSeats] = useState([])
  const [showBooking,   setShowBooking]   = useState(false)
  const [bookingDone,   setBookingDone]   = useState(false)

  // Fetch event details
  const { data: event, isLoading: eventLoading, isError: eventError } = useQuery({
    queryKey: ['event', eventId],
    queryFn:  () => getEvent(eventId).then((r) => r.data),
    enabled:  !!eventId,
  })

  // Fetch seat definitions from catalog
  const { data: seatDefs = [] } = useQuery({
    queryKey: ['eventSeats', eventId],
    queryFn:  () => getEventSeats(eventId).then((r) => r.data),
    enabled:  !!eventId,
    staleTime: 30_000,
  })

  // Fetch venue details
  const { data: venue } = useQuery({
    queryKey: ['venue', event?.venue_id],
    queryFn:  () => getVenue(event.venue_id).then((r) => r.data),
    enabled:  !!event?.venue_id,
    staleTime: 300_000,
  })

  // Fetch live availability from seating service
  const { data: availability = [], refetch: refetchAvailability } = useQuery({
    queryKey: ['seatAvailability', eventId],
    queryFn:  () => getSeatAvailability(eventId).then((r) => r.data),
    enabled:  !!eventId,
    refetchInterval: 15_000,  // refresh every 15s
  })

  // Merge: prefer availability data for status, use catalog for definitions
  // Normalize seat_price to a number (seating service may return it as a string)
  const seats = useMemo(() => {
    const normalize = (s) => ({ ...s, seat_price: parseFloat(s.seat_price) || 0 })
    if (availability.length) {
      return availability.map((a) => {
        const def = seatDefs.find((d) => d.seat_id === a.seat_id) || {}
        return normalize({ ...def, ...a })
      })
    }
    return seatDefs.map((d) => normalize({ ...d, status: 'AVAILABLE' }))
  }, [seatDefs, availability])

  const MAX_SEATS = 5

  const toggleSeat = useCallback((seat) => {
    setSelectedSeats((prev) => {
      if (prev.some((s) => s.seat_id === seat.seat_id)) {
        return prev.filter((s) => s.seat_id !== seat.seat_id)
      }
      if (prev.length >= MAX_SEATS) return prev
      return [...prev, seat]
    })
  }, [])

  const subtotal = selectedSeats.reduce((s, seat) => s + (seat.seat_price || 0), 0)
  const tax      = +(subtotal * 0.05).toFixed(2)
  const total    = +(subtotal + tax).toFixed(2)

  function handleBookingSuccess(order) {
    setBookingDone(true)
    setSelectedSeats([])
    refetchAvailability()
  }

  function closeBooking() {
    setShowBooking(false)
    refetchAvailability()
  }

  if (eventLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (eventError || !event) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-destructive font-medium">Event not found.</p>
        <Button variant="outline" onClick={() => navigate('/')}>Back to Events</Button>
      </div>
    )
  }

  const isOnSale = event.status === 'ON_SALE'

  return (
    <div>
      {/* ── Event Hero ── */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${eventGradient(event.event_type)} py-12`}>
        <div className="pointer-events-none absolute inset-0 bg-black/40" />
        <div className="relative mx-auto max-w-7xl px-4">
          <Button variant="ghost" size="sm"
            className="mb-4 text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant={EVENT_STATUS_VARIANT[event.status] ?? 'secondary'}>
                  {event.status?.replace('_', ' ')}
                </Badge>
                {event.event_type && (
                  <Badge variant="outline" className="border-white/30 text-white bg-white/10">
                    {event.event_type}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">{event.title}</h1>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/80">
                {event.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />{event.city}
                  </span>
                )}
                {event.start_time && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />{formatDateTime(event.start_time)}
                  </span>
                )}
                {event.base_price != null && (
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-4 w-4" />{formatPrice(event.base_price)} onwards
                  </span>
                )}
              </div>
            </div>

            {isOnSale && (
              <div className="hidden lg:flex flex-col items-center gap-1 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm px-6 py-4 text-white text-center">
                <Users className="h-5 w-5 mb-1 opacity-80" />
                <span className="text-2xl font-bold">{seats.filter((s) => s.status === 'AVAILABLE').length}</span>
                <span className="text-xs opacity-70">seats available</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {bookingDone && (
          <div className="mb-6 flex items-center justify-between rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-success text-sm">
            <span className="font-medium">🎉 Booking confirmed! Your tickets have been issued.</span>
            <button onClick={() => setBookingDone(false)} className="text-success/70 hover:text-success"><X className="h-4 w-4" /></button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* ── Seat Map ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Event info card */}
            <Card>
              <CardContent className="py-4 px-5">
                {event.description && (
                  <p className="text-sm text-foreground mb-3">{event.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    {formatDateLong(event.start_time)}
                  </span>
                  {venue && (
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      {venue.name}, {venue.city}{venue.area ? `, ${venue.area}` : ''}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Select Seats</CardTitle>
                {!isOnSale && (
                  <p className="text-sm text-muted-foreground">This event is not currently on sale.</p>
                )}
              </CardHeader>
              <CardContent>
                <SeatGrid
                  seats={seats}
                  selectedSeats={isOnSale ? selectedSeats : []}
                  onToggle={isOnSale ? toggleSeat : () => {}}
                />
              </CardContent>
            </Card>
          </div>

          {/* ── Booking Panel ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {isOnSale ? (
                <Card className="shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShoppingCart className="h-5 w-5" />
                      Order Summary
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {selectedSeats.length} / {MAX_SEATS} seats selected
                    </p>
                  </CardHeader>
                  <CardContent>
                    {selectedSeats.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        Click available seats on the map to select them.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {/* Seat line items */}
                        <div className="space-y-2">
                          {selectedSeats.map((s) => (
                            <div key={s.seat_id} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                {s.section || 'General'} — {s.seat_label || s.seat_number || `Seat ${s.seat_id}`}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{formatPrice(s.seat_price)}</span>
                                <button onClick={() => toggleSeat(s)}
                                  className="text-muted-foreground hover:text-destructive transition-colors">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Price breakdown */}
                        <div className="border-t border-border pt-3 space-y-1.5 text-sm">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal</span>
                            <span>{formatPrice(subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Tax (5%)</span>
                            <span>{formatPrice(tax)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-base pt-1 border-t border-border mt-1">
                            <span>Total</span>
                            <span className="text-primary">{formatPrice(total)}</span>
                          </div>
                        </div>

                        {isLoggedIn ? (
                          <>
                            <Button className="w-full h-11 text-base rounded-xl" onClick={() => setShowBooking(true)}>
                              Pay {formatPrice(total)}
                            </Button>
                            <p className="text-center text-xs text-muted-foreground">
                              Seats reserved for 15 minutes
                            </p>
                          </>
                        ) : (
                          <div className="text-center space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Sign in to complete your booking
                            </p>
                            <Link to="/login">
                              <Button className="w-full h-11 text-base rounded-xl">Sign In to Book</Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-6 text-center">
                    <p className="text-sm font-medium">
                      {event.status === 'SOLD_OUT' ? 'This event is sold out.' : 'Tickets unavailable.'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Check back later for availability.</p>
                  </CardContent>
                </Card>
              )}

              {/* Event info card */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Event Details</CardTitle></CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    {[
                      { label: 'Event ID',   value: `#${event.event_id}` },
                      { label: 'Venue ID',   value: `#${event.venue_id}` },
                      { label: 'Status',     value: event.status?.replace('_', ' ') },
                      { label: 'Ends',       value: formatDate(event.end_time) },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="font-medium">{value || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* ── Booking Modal ── */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeBooking} />
          <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-background p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <BookingFlow
              event={event}
              selectedSeats={selectedSeats}
              userId={user?.userId}
              onClose={closeBooking}
              onSuccess={handleBookingSuccess}
            />
          </div>
        </div>
      )}
    </div>
  )
}
