import { forwardRef } from 'react'
import { cn } from '@/lib/cn'
import styles from './input.module.css'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ invalid, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(styles.input, invalid && styles.invalid, className)}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
