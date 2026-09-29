import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * Kullanıcının Spotify token'ı BEĞENİ YAZMA iznine sahip mi?
 *
 * ⚠ Neden tarihe bakıyoruz, token'a değil: verilen izinler DB'de saklanmıyor
 * (`platform_connections`'ta `scope` kolonu YOK). Öğrenmenin tek yolu Spotify'a
 * istek atmak — bunu her sayfa açılışında yapmak §4.2'ye aykırı (boşuna dış
 * API trafiği) ve sayfayı yavaşlatır.
 *
 * Elimizdeki kesin bilgi yeter: `user-library-modify` izni scope listesine
 * **2026-08-05'te** eklendi. O andan önce kurulan HER bağlantıda bu izin yok —
 * canlıda ölçüldü (2026-08-05, iki aktif token: `user-library-read` VAR,
 * `user-library-modify` YOK). Sonra bağlananlarda ise var.
 *
 * Yanılma yönü güvenli: eski bir bağlantı zaten çalışmıyor, kullanıcıyı
 * yeniden bağlanmaya çağırmak doğru. Yeni bağlanan biri yanlışlıkla uyarı
 * görmez çünkü tarihi eşiğin üstünde.
 */

/** `user-library-modify` scope'unun eklendiği an (UTC). */
const IZIN_EKLENME_ANI = Date.parse('2026-08-05T00:00:00Z')

export async function begeniYazmaIzniVarMi(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('platform_connections')
    .select('connected_at')
    .eq('user_id', userId)
    .eq('platform', 'spotify')
    .eq('is_active', true)
    .maybeSingle()

  if (!data?.connected_at) return false
  return Date.parse(data.connected_at) >= IZIN_EKLENME_ANI
}
