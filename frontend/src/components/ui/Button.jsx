import { cn } from '../../lib/utils'

const BASE = 'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]'

const VARIANTS = {
  default:  'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
  outline:  'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
  ghost:    'hover:bg-accent hover:text-accent-foreground',
  secondary:'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive:'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
  link:     'text-primary underline-offset-4 hover:underline',
}

const SIZES = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4',
  lg: 'h-10 px-6 text-base',
  icon:'h-9 w-9',
}

export function Button({ children, variant = 'default', size = 'md', className, ...props }) {
  return (
    <button
      className={cn(BASE, VARIANTS[variant] ?? VARIANTS.default, SIZES[size] ?? SIZES.md, className)}
      {...props}
    >
      {children}
    </button>
  )
}
