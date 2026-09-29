import { Skeleton } from '@/components/ui/skeleton'

/** Otomasyon ayarları — form/liste iskeleti (G2). */
export default function AutomationsLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '8px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Skeleton height="0.75rem" width="5rem" radius="4px" />
        <Skeleton height="2rem" width="13rem" radius="8px" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} height="4.5rem" width="100%" radius="12px" />
      ))}
    </div>
  )
}
