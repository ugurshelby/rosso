import { forwardRef, useId } from 'react'
import { cn } from '@/lib/cn'
import styles from './toggle.module.css'

export interface ToggleProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Erişilebilirlik için zorunlu — görünür label yoksa aria-label kullanılır. */
  label: string
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ label, className, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    return (
      <span className={cn(styles.switch, className)}>
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          role="switch"
          className={styles.toggle}
          aria-label={label}
          {...props}
        />
        <label htmlFor={inputId} className={styles.slider}>
          <span className="sr-only">{label}</span>
        </label>
      </span>
    )
  }
)

Toggle.displayName = 'Toggle'
