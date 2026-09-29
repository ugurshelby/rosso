import { permanentRedirect } from 'next/navigation'

/**
 * `/mood/[key]` → `/playlists/mood/[key]` (308 kalıcı yönlendirme).
 *
 * 🔴 KIRIK ROTA DÜZELTMESİ (2026-08-08, Sahip bildirdi — ölçüldü):
 *    `/playlists/mood/page.tsx:69` kartları `/mood/${key}` adresine
 *    bağlıyordu ama o sayfa **hiç yoktu**. `/mood` yalnız dizin kökünü
 *    yönlendiriyordu; alt rotalar kapsam dışıydı → her mood kartı **404**.
 *
 *    Linkler `/playlists/mood/[key]`'e çevrildi. Bu dosya **eski yer
 *    imleri ve paylaşılmış bağlantılar** için duruyor: kullanıcı 404
 *    aldığı bir adresi kaydetmiş olabilir, artık doğru yere gider.
 */
export default async function MoodKeyRedirect({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  const { key } = await params
  permanentRedirect(`/playlists/mood/${key}`)
}
