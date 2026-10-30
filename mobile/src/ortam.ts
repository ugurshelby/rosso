import Constants from 'expo-constants'

/**
 * Derleme anında gelen arka uç ayarları (app.config.ts `extra`). Eksikse
 * uygulama açılır ama "kurulum eksik" ekranı gösterir; boş adrese istek atmaz.
 */
export interface Ortam {
  supabaseUrl: string
  supabaseAnonKey: string
  webUrl: string
}

type Ekstra = Partial<Ortam> | undefined

export function ortamOku(ekstra: Ekstra = Constants.expoConfig?.extra as Ekstra): {
  ortam: Ortam
  eksik: (keyof Ortam)[]
} {
  const ortam: Ortam = {
    supabaseUrl: (ekstra?.supabaseUrl ?? '').trim().replace(/\/+$/, ''),
    supabaseAnonKey: (ekstra?.supabaseAnonKey ?? '').trim(),
    webUrl: (ekstra?.webUrl ?? '').trim().replace(/\/+$/, ''),
  }
  const eksik = (Object.keys(ortam) as (keyof Ortam)[]).filter((k) => !ortam[k])
  return { ortam, eksik }
}
