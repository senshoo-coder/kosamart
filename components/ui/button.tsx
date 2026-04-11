import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base = 'relative inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]'

    const variants = {
      primary:   'bg-[#006c49] text-white hover:brightness-110 shadow-lg shadow-[#006c49]/10',
      secondary: 'bg-[#eceef0] text-[#006c49] hover:bg-[#e6e8ea]',
      danger:    'bg-[#ffdad6] text-[#93000a] hover:bg-[#ffb4ab]',
      ghost:     'text-[#3c4a42] hover:text-[#191c1e] hover:bg-[#f2f4f6]',
      outline:   'ring-1 ring-[#bbcabf]/20 bg-[#f2f4f6] text-[#006c49] hover:bg-[#eceef0]',
    }

    const sizes = {
      sm: 'text-xs px-3 py-1.5',
      md: 'text-sm px-4 py-2.5',
      lg: 'text-base px-6 py-4 font-bold',
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
            <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            처리중...
          </span>
        ) : children}
      </button>
    )
  }
)
Button.displayName = 'Button'
