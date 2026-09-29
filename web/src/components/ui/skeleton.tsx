import { cn } from '@/lib/cn'
import styles from './skeleton.module.css'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  radius?: string
}

/** Yükleme iskeleti — içeriğin yerini tutar (design.md §7). */
export function Skeleton({ width, height, radius, className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(styles.skeleton, className)}
      aria-hidden
      style={{ width, height, borderRadius: radius, ...style }}
      {...props}
    />
  )
}
