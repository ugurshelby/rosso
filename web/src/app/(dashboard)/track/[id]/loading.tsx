import { Skeleton } from '@/components/ui/skeleton'

/** Track detay — büyük kapak + başlık + stat bento + timeline iskeleti (G2). */
export default function TrackLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '8px 0' }}>
      {/* Hero: kapak + başlık */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Skeleton height="200px" width="200px" radius="12px" style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: '220px' }}>
          <Skeleton height="0.75rem" width="4rem" radius="4px" />
          <Skeleton height="2.25rem" width="70%" radius="8px" />
          <Skeleton height="1rem" width="10rem" radius="4px" />
        </div>
      </div>

      {/* Stat bento */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height="5rem" radius="12px" />
        ))}
      </div>

      {/* Dinleme timeline'ı */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Skeleton height="0.9rem" width="9rem" radius="4px" />
        <Skeleton height="10rem" width="100%" radius="12px" />
      </div>
    </div>
  )
}
