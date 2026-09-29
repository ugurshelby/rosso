'use client'

import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import styles from './button.module.css'

// FAZ PERF-P3 (2026-07-24): framer-motion (`motion/react`) SÖKÜLDÜ. Button tek
// bir efekt (`whileTap` basma animasyonu) için 136KB framer runtime'ını TÜM
// dashboard katmanına sokuyordu (ölçüldü: taste route'unda %99 boşta chunk'ın
// kök nedeni bu ortak bileşendi). Basma animasyonu zaten button.module.css'te
// `:active { scale }` olarak vardı — framer'ın eklediği tek fark minik spring'ti,
// saf CSS `:active` ile görsel olarak eşdeğer + `prefers-reduced-motion` korunur.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
}

const sizeClass: Record<ButtonSize, string | undefined> = {
  sm: styles.sm,
  md: undefined,
  lg: styles.lg,
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, loading, className, type = 'button', disabled, children, ...props }, ref) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          styles.base,
          styles[variant],
          sizeClass[size],
          fullWidth && styles.fullWidth,
          className
        )}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <Loader2
            size={14}
            className={styles.spinner}
            aria-hidden
          />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
