import { cn, getStatusStyle } from '@/lib/utils'
import type { OrderStatus, DeliveryStatus } from '@/lib/types'
import { ORDER_STATUS_CONFIG, DELIVERY_STATUS_CONFIG } from '@/lib/types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'outline'
  color?: string
  className?: string
}

export function Badge({ children, color = 'gray', className }: BadgeProps) {
  const style = getStatusStyle(color)
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-600 border',
      style.bg, style.text, style.border,
      className
    )}>
      {children}
    </span>
  )
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = ORDER_STATUS_CONFIG[status]
  return (
    <Badge color={config.color}>
      {config.icon} {config.label}
    </Badge>
  )
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const config = DELIVERY_STATUS_CONFIG[status]
  return (
    <Badge color={config.color}>
      {config.icon} {config.label}
    </Badge>
  )
}
