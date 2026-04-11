import { cn } from '@/lib/utils'
import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef } from 'react'

const inputBase = 'w-full bg-[#f2f4f6] border border-transparent rounded-[12px] px-4 text-[#1a1c1c] placeholder-[#a3a3a3] outline-none transition-all focus:border-[#10b981] focus:bg-white'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-[11px] text-[#3c4a42] tracking-[0.5px] uppercase mb-2 font-medium">{label}</label>}
      <input
        ref={ref}
        className={cn(inputBase, 'py-3', error && 'border-red-400', className)}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-[11px] text-[#3c4a42] tracking-[0.5px] uppercase mb-2 font-medium">{label}</label>}
      <textarea
        ref={ref}
        className={cn(inputBase, 'py-3 resize-none', error && 'border-red-400', className)}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Array<{ value: string; label: string }>
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs text-slate-400 mb-1.5 font-500">{label}</label>}
      <select
        ref={ref}
        className={cn(inputBase, 'py-3 appearance-none', error && 'border-red-500/60', className)}
        style={{ background: 'rgba(255,255,255,0.05)' }}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} style={{ background: '#1e293b' }}>{o.label}</option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  )
)
Select.displayName = 'Select'
