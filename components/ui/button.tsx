import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base = 'relative inline-flex items-center justify-center font-600 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden'

    const variants = {
      primary:   'bg-[#10b981] text-white hover:bg-[#059669] active:bg-[#047857]',
      secondary: 'bg-[#f2f4f6] text-[#1a1c1c] border border-[#e8e8e8] hover:bg-[#e8e8e8]',
      danger:    'bg-[#ef4444] text-white hover:bg-[#dc2626] active:bg-[#b91c1c]',
      ghost:     'text-[#3c4a42] hover:text-[#1a1c1c] hover:bg-[#f2f4f6]',
      outline:   'border border-[#10b981] text-[#10b981] hover:bg-[#f0fdf4]',
    }

    const sizes = {
      sm: 'text-xs px-3 py-1.5',
      md: 'text-sm px-4 py-2.5',
      lg: 'text-base px-6 py-3.5',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            처리중...
          </span>
        ) : children}
      </button>
    )
  }
)
Button.displayName = 'Button'
