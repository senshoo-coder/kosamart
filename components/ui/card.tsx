import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'glass' | 'elevated'
  onClick?: () => void
}

export function Card({ children, className, variant = 'default', onClick }: CardProps) {
  const variants = {
    default: 'bg-white/5 border border-white/8 backdrop-blur-xl',
    glass:   'bg-white/5 border border-white/8 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]',
    elevated:'bg-gradient-to-b from-white/8 to-white/3 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]',
  }

  return (
    <div
      className={cn('rounded-2xl', variants[variant], onClick && 'cursor-pointer hover:border-emerald-500/30 transition-all', className)}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-5 pt-5 pb-3', className)}>{children}</div>
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-5 pb-5', className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('font-700 text-white text-base', className)}>{children}</h3>
}
