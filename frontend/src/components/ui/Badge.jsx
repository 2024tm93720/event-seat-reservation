import { cn } from '../../lib/utils'

const VARIANTS = {
  default:     'bg-secondary text-secondary-foreground',
  success:     'bg-success/15 text-success border border-success/30',
  destructive: 'bg-destructive/15 text-destructive border border-destructive/30',
  warning:     'bg-warning/15 text-warning border border-warning/30',
  secondary:   'bg-secondary text-muted-foreground border border-border',
  outline:     'border border-border text-foreground bg-transparent',
  primary:     'bg-primary/10 text-primary border border-primary/30',
}

export function Badge({ children, variant = 'default', className }) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
      VARIANTS[variant] ?? VARIANTS.default,
      className,
    )}>
      {children}
    </span>
  )
}
