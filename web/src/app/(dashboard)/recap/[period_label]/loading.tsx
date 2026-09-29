import { Skeleton } from '@/components/ui/skeleton'

/** Recap dönem detayı — başlık + story kart ızgarası iskeleti (G2). */
export default function RecapPeriodLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', padding: '8px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Skeleton height="0.75rem" width="5rem" radius="4px" />
        <Skeleton height="2.25rem" width="14rem" radius="8px" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={i === 0 ? '18rem' : '12rem'} radius="16px" />
        ))}
      </div>
    </div>
  )
}
