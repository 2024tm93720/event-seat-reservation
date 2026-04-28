import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Ticket, SlidersHorizontal, MapPin } from 'lucide-react'
import { EventCard } from '../components/EventCard'
import { EventCardSkeleton } from '../components/ui/Skeleton'
import { Input, Select } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { getEvents, getVenues } from '../lib/api'
import { cn } from '../lib/utils'

const STATUSES = ['ALL', 'ON_SALE', 'SOLD_OUT', 'CANCELLED']

export function EventsPage() {
  const [search,    setSearch]    = useState('')
  const [status,    setStatus]    = useState('ALL')
  const [eventType, setEventType] = useState('ALL')
  const [venueId,   setVenueId]   = useState('ALL')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['events'],
    queryFn:  () => getEvents({ limit: 100 }).then((r) => r.data),
    staleTime: 60_000,
  })

  const { data: venues = [] } = useQuery({
    queryKey: ['venues'],
    queryFn:  () => getVenues().then((r) => r.data),
    staleTime: 5 * 60_000,
  })

  const eventTypes = useMemo(() => {
    if (!data) return []
    return ['ALL', ...new Set(data.map((e) => e.event_type).filter(Boolean))]
  }, [data])

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((e) => {
      if (status !== 'ALL' && e.status !== status) return false
      if (eventType !== 'ALL' && e.event_type !== eventType) return false
      if (venueId !== 'ALL' && String(e.venue_id) !== venueId) return false
      if (search && ![e.title, e.city, e.event_type].some(
        (f) => f?.toLowerCase().includes(search.toLowerCase()),
      )) return false
      return true
    })
  }, [data, status, eventType, venueId, search])

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-4 py-16 text-center">
        {/* Radial gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.12),transparent_65%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(99,102,241,0.25),transparent_55%)]" />

        <div className="relative mx-auto max-w-3xl">
          {/* Badge pill */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
            <Ticket className="h-3.5 w-3.5" />
            Event Ticketing &amp; Seat Reservation
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Find &amp; Book Your<br />
            <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
              Perfect Seats
            </span>
          </h1>

          <p className="mt-4 text-base text-white/70 sm:text-lg">
            Browse events, select your seats, and book tickets — all in one place.
          </p>
        </div>
      </section>

      {/* ── Filters ── */}
      <div className="sticky top-16 z-40 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-col gap-3">
            {/* Row 1: Search + Venue */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search events…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Venue filter */}
              <div className="relative max-w-xs w-full sm:w-56">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Select
                  className="pl-9"
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                >
                  <option value="ALL">All Venues</option>
                  {venues.map((v) => (
                    <option key={v.venue_id} value={String(v.venue_id)}>
                      {v.name} — {v.city}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Row 2: Status + Event type pills */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={cn(
                      'whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      status === s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white text-muted-foreground border border-border hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200',
                    )}
                  >
                    {s === 'ALL' ? 'All' : s.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-border hidden sm:block" />

              {/* Event type filter */}
              {eventTypes.length > 2 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {eventTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setEventType(t)}
                      className={cn(
                        'whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        eventType === t
                          ? 'bg-foreground text-background'
                          : 'bg-white text-muted-foreground border border-border hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200',
                      )}
                    >
                      {t === 'ALL' ? 'All Types' : t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Events Grid ── */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {isError && (
          <div className="py-16 text-center">
            <p className="text-destructive font-medium">Failed to load events.</p>
            <p className="mt-1 text-sm text-muted-foreground">Make sure the catalog service is running on port 8002.</p>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="py-16 text-center">
            <SlidersHorizontal className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No events match your filters</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting the search or status filter.</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSearch(''); setStatus('ALL'); setEventType('ALL'); setVenueId('ALL') }}>
              Clear filters
            </Button>
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {filtered.length} event{filtered.length !== 1 ? 's' : ''} found
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((event) => <EventCard key={event.event_id} event={event} />)}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
