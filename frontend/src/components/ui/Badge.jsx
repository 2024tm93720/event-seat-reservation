import { cn } from '../../lib/utils'

const VARIANTS = {
  default:     'bg-secondary text-secondary-foreground',
  success:     'bg-emerald-50 text-emerald-700 border border-emerald-200',
  destructive: 'bg-red-50 text-red-700 border border-red-200',
  warning:     'bg-amber-50 text-amber-700 border border-amber-200',
  secondary:   'bg-slate-100 text-slate-600 border border-slate-200',
  outline:     'border border-border text-foreground bg-transparent',
  primary:     'bg-indigo-50 text-indigo-700 border border-indigo-200',
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
