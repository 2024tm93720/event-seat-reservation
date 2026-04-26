import { cn, formatPrice } from '../lib/utils'

function SeatButton({ seat, isSelected, onToggle }) {
  const { status, seat_label, seat_number, seat_price } = seat
  const available = status === 'AVAILABLE'
  const held      = status === 'HELD'
  const allocated = status === 'ALLOCATED'

  const cls = isSelected
    ? 'seat-selected'
    : available
      ? 'seat-available'
      : held
        ? 'seat-held'
        : 'seat-allocated'

  return (
    <button
      title={`${seat_label || seat_number} — ${formatPrice(seat_price)} — ${status}`}
      disabled={!available && !isSelected}
      onClick={() => available || isSelected ? onToggle(seat) : null}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded text-[10px] font-semibold select-none',
        cls,
      )}
    >
      {(seat_label || String(seat_number || '')).slice(-2)}
    </button>
  )
}

export function SeatGrid({ seats = [], selectedSeats, onToggle }) {
  if (!seats.length) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        No seat data available for this event.
      </div>
    )
  }

  // Group by section
  const sections = seats.reduce((acc, seat) => {
    const key = seat.section || 'General'
    if (!acc[key]) acc[key] = []
    acc[key].push(seat)
    return acc
  }, {})

  const availableCount = seats.filter((s) => s.status === 'AVAILABLE').length
  const selectedIds    = new Set(selectedSeats.map((s) => s.seat_id))

  return (
    <div className="space-y-6">
      {/* Stage */}
      <div className="text-center">
        <div className="mx-auto mb-1 h-2 w-1/3 rounded-full bg-gradient-to-r from-primary/30 via-primary/60 to-primary/30" />
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Stage</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {[
          { cls: 'seat-available', label: `Available (${availableCount})` },
          { cls: 'seat-selected',  label: 'Selected' },
          { cls: 'seat-held',      label: 'Held' },
          { cls: 'seat-allocated', label: 'Taken' },
        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn('h-4 w-4 rounded text-[8px]', cls)} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Sections */}
      {Object.entries(sections).map(([section, sectionSeats]) => {
        const minPrice = Math.min(...sectionSeats.map((s) => s.seat_price || 0))
        const maxPrice = Math.max(...sectionSeats.map((s) => s.seat_price || 0))
        const priceLabel =
          minPrice === maxPrice ? formatPrice(minPrice) : `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`

        return (
          <div key={section}>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">{section}</h4>
              <span className="text-xs text-muted-foreground">{priceLabel}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sectionSeats.map((seat) => (
                <SeatButton
                  key={seat.seat_id}
                  seat={seat}
                  isSelected={selectedIds.has(seat.seat_id)}
                  onToggle={onToggle}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
