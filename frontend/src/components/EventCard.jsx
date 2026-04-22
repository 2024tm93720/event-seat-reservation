import { Link } from 'react-router-dom'
import { MapPin, Calendar, Tag } from 'lucide-react'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { formatDate, formatPrice, eventGradient, EVENT_STATUS_VARIANT } from '../lib/utils'

export function EventCard({ event }) {
  const isOnSale = event.status === 'ON_SALE'

  return (
    <Link to={`/events/${event.event_id}`} className="group block">
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        {/* Image / gradient placeholder */}
        <div className={`aspect-[16/9] bg-gradient-to-br ${eventGradient(event.event_type)} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
          {/* Event type label */}
          <div className="absolute bottom-3 left-3">
            <Badge variant="secondary" className="bg-black/40 text-white border-white/20 backdrop-blur-sm">
              {event.event_type || 'Event'}
            </Badge>
          </div>
          {/* Status badge */}
          <div className="absolute top-3 right-3">
            <Badge variant={EVENT_STATUS_VARIANT[event.status] ?? 'secondary'}>
              {event.status?.replace('_', ' ')}
            </Badge>
          </div>
          {/* Decorative circles */}
          <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -top-4 -left-4 h-16 w-16 rounded-full bg-white/10" />
        </div>

        {/* Body */}
        <div className="p-4">
          <h3 className="mb-2 line-clamp-1 text-base font-semibold leading-snug group-hover:text-primary transition-colors">
            {event.title}
          </h3>

          <div className="space-y-1.5 text-xs text-muted-foreground">
            {event.city && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="line-clamp-1">{event.city}</span>
              </div>
            )}
            {event.start_time && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{formatDate(event.start_time)}</span>
              </div>
            )}
            {event.base_price != null && (
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-medium text-foreground">
                  {formatPrice(event.base_price)}
                </span>
                <span className="text-muted-foreground">onwards</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-center justify-end">
            {isOnSale ? (
              <Button size="sm" className="h-7 px-3 text-xs">
                Book Now
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                {event.status === 'SOLD_OUT' ? 'Sold Out' : 'Unavailable'}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
