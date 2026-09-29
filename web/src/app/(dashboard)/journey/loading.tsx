import { Skeleton } from '@/components/ui/skeleton'

/** Journey — yıl kapağı + yatay timeline + anlatı blokları iskeleti (G2). */
export default function JourneyLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '8px 0' }}>
      {/* Yıl kapağı */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Skeleton height="0.75rem" width="7rem" radius="4px" />
        <Skeleton height="3rem" width="16rem" radius="8px" />
        <Skeleton height="1rem" width="24rem" radius="4px" />
      </div>

      {/* Yatay yıl timeline'ı */}
      <div style={{ display: 'flex', gap: '12px', overflow: 'hidden' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height="4.5rem" width="8rem" radius="12px" style={{ flexShrink: 0 }} />
        ))}
      </div>

      {/* Anlatı blokları */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Skeleton height="0.9rem" width="9rem" radius="4px" />
          <Skeleton height="6rem" width="100%" radius="12px" />
        </div>
      ))}
    </div>
  )
}
