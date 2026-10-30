/**
 * Supabase e-posta bağlantısından dönüş (spec §2 "derin bağlantı", mimari M6).
 * `rosso://giris#access_token=…&refresh_token=…&type=signup` (implicit akış) ya da
 * `rosso://giris?code=…` (PKCE). Hata: `#error=…&error_description=…`.
 */
export type DonusSonucu =
  | { tur: 'oturum'; accessToken: string; refreshToken: string; olay: string | null }
  | { tur: 'kod'; kod: string }
  | { tur: 'hata'; mesaj: string }
  | { tur: 'yok' }

function parametreler(url: string): URLSearchParams {
  const birlesik = new URLSearchParams()
  const soru = url.indexOf('?')
  const diyez = url.indexOf('#')
  if (soru >= 0) {
    const son = diyez > soru ? diyez : url.length
    new URLSearchParams(url.slice(soru + 1, son)).forEach((v, k) => birlesik.set(k, v))
  }
  if (diyez >= 0) new URLSearchParams(url.slice(diyez + 1)).forEach((v, k) => birlesik.set(k, v))
  return birlesik
}

export function donusuCoz(url: string | null | undefined): DonusSonucu {
  if (!url) return { tur: 'yok' }
  const p = parametreler(url)
  const hata = p.get('error_description') ?? p.get('error')
  if (hata) return { tur: 'hata', mesaj: hata.replace(/\+/g, ' ') }
  const accessToken = p.get('access_token')
  const refreshToken = p.get('refresh_token')
  if (accessToken && refreshToken) return { tur: 'oturum', accessToken, refreshToken, olay: p.get('type') }
  const kod = p.get('code')
  if (kod) return { tur: 'kod', kod }
  return { tur: 'yok' }
}
