import { Skeleton } from '@/components/ui/skeleton'

/** Sanatçı detay — avatar + başlık + stat bento + top şarkılar iskeleti (G2). */
export default function ArtistLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '8px 0' }}>
      {/* Hero: kapak + başlık */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Skeleton height="200px" width="200px" radius="50%" style={{ flexShrink: 0 }} />
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

      {/* Top şarkılar listesi */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Skeleton height="0.9rem" width="9rem" radius="4px" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Skeleton height="40px" width="40px" radius="8px" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Skeleton height="0.85rem" width={`${65 - i * 5}%`} radius="4px" />
              <Skeleton height="0.65rem" width="30%" radius="4px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
