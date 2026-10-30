import { ortamOku } from '@/ortam'
import { supabase } from './supabase'

/** Web API hatası: gövdedeki `{ error }` + durum kodu (docs/mobile/api.md "Hata biçimi"). */
export class ApiHatasi extends Error {
  constructor(
    readonly durum: number,
    mesaj: string,
    readonly tekrarSaniye?: number,
  ) {
    super(mesaj)
    this.name = 'ApiHatasi'
  }
}

type Yontem = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export interface ApiBaglami {
  webUrl: string
  token: () => Promise<string | null>
  yenile: () => Promise<string | null>
  fetch?: typeof fetch
}

function varsayilanBaglam(): ApiBaglami {
  const istemci = supabase()
  return {
    webUrl: ortamOku().ortam.webUrl,
    token: async () => (await istemci?.auth.getSession())?.data.session?.access_token ?? null,
    yenile: async () => (await istemci?.auth.refreshSession())?.data.session?.access_token ?? null,
  }
}

/**
 * Web rotasına Bearer ile istek. 401'de oturumu bir kez yeniler ve tekrar dener;
 * yine 401 ise `ApiHatasi(401)` (ekran girişe döner).
 */
export async function api<T>(
  yol: string,
  secenek: { yontem?: Yontem; govde?: unknown } = {},
  baglam: ApiBaglami = varsayilanBaglam(),
): Promise<T> {
  const f = baglam.fetch ?? fetch
  const gonder = async (token: string | null) =>
    f(`${baglam.webUrl}${yol}`, {
      method: secenek.yontem ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(secenek.govde !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: secenek.govde !== undefined ? JSON.stringify(secenek.govde) : undefined,
    })

  let yanit = await gonder(await baglam.token())
  if (yanit.status === 401) {
    const yeni = await baglam.yenile()
    if (yeni) yanit = await gonder(yeni)
  }
  const metin = await yanit.text()
  let govde: unknown = null
  try {
    govde = metin ? JSON.parse(metin) : null
  } catch {
    govde = null
  }
  if (!yanit.ok) {
    const mesaj =
      govde && typeof govde === 'object' && 'error' in govde && typeof govde.error === 'string'
        ? govde.error
        : `HTTP ${yanit.status}`
    const tekrar = Number(yanit.headers.get('retry-after'))
    throw new ApiHatasi(yanit.status, mesaj, Number.isFinite(tekrar) && tekrar > 0 ? tekrar : undefined)
  }
  return govde as T
}
