import { cn } from '../../lib/utils'

export function Card({ children, className, ...props }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card text-card-foreground shadow-sm', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return <div className={cn('flex flex-col gap-1.5 p-5', className)}>{children}</div>
}

export function CardTitle({ children, className }) {
  return <h3 className={cn('text-base font-semibold leading-tight', className)}>{children}</h3>
}

export function CardContent({ children, className }) {
  return <div className={cn('p-5 pt-0', className)}>{children}</div>
}

export function CardFooter({ children, className }) {
  return <div className={cn('flex items-center p-5 pt-0', className)}>{children}</div>
}
