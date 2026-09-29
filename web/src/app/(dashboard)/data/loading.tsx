import { Skeleton } from '@/components/ui/skeleton'

/** Data — yükleme kartı + platform bağlantıları + geçmiş listesi iskeleti (G2). */
export default function DataLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', padding: '8px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Skeleton height="0.75rem" width="4rem" radius="4px" />
        <Skeleton height="2rem" width="12rem" radius="8px" />
      </div>
      {/* Yükleme/drop kartı */}
      <Skeleton height="11rem" width="100%" radius="16px" />
      {/* Platform kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height="6rem" radius="12px" />
        ))}
      </div>
      {/* Geçmiş satırları */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Skeleton height="0.9rem" width="8rem" radius="4px" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height="3.5rem" width="100%" radius="10px" />
        ))}
      </div>
    </div>
  )
}
