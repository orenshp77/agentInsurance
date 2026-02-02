import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-2">{label}</label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-3 rounded-xl bg-background-secondary border
                     ${error ? 'border-error' : 'border-primary/30'}
                     focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none
                     text-foreground placeholder-foreground-muted transition-all ${className}`}
          {...props}
        />
        {error && <p className="text-error text-sm mt-1">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
