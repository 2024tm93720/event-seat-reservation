import { Link } from 'react-router-dom'
import { MapPin, Calendar, Tag } from 'lucide-react'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { formatDate, formatPrice, eventGradient, eventImage, eventTypeBadge, EVENT_STATUS_VARIANT } from '../lib/utils'
import { cn } from '../lib/utils'

export function EventCard({ event }) {
  const isOnSale = event.status === 'ON_SALE'
  const imgSrc = eventImage(event.event_type)

  return (
    <Link to={`/events/${event.event_id}`} className="group block">
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        {/* Event image with gradient fallback */}
        <div className={`aspect-[16/9] bg-gradient-to-br ${eventGradient(event.event_type)} relative overflow-hidden`}>
          {imgSrc && (
            <img
              src={imgSrc}
              alt={event.event_type}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10 group-hover:from-black/50 transition-colors" />
          {/* Event type label */}
          <div className="absolute bottom-3 left-3">
            <span className={cn(
              'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold backdrop-blur-sm',
              eventTypeBadge(event.event_type),
            )}>
              {event.event_type || 'Event'}
            </span>
          </div>
          {/* Status badge */}
          <div className="absolute top-3 right-3">
            <Badge variant={EVENT_STATUS_VARIANT[event.status] ?? 'secondary'}>
              {event.status?.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <h3 className="mb-2 line-clamp-1 text-base font-semibold leading-snug group-hover:text-primary transition-colors">
            {event.title}
          </h3>

          <div className="space-y-2 text-sm text-muted-foreground">
            {event.city && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="line-clamp-1">{event.city}</span>
              </div>
            )}
            {event.start_time && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>{formatDate(event.start_time)}</span>
              </div>
            )}
            {event.base_price != null && (
              <div className="flex items-center gap-1.5">
                <Tag className="h-4 w-4 flex-shrink-0" />
                <span className="text-base font-bold text-foreground">
                  {formatPrice(event.base_price)}
                </span>
                <span className="text-sm text-muted-foreground">onwards</span>
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
