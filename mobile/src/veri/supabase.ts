import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'
import { ortamOku } from '@/ortam'
import { guvenliDepo } from './guvenliDepo'

let istemci: SupabaseClient | null = null

/**
 * Tek Supabase istemcisi (mimari M4/M6). Kurulum eksikse null: ekranlar
 * "kurulum eksik" gösterir, boş adrese istek atılmaz.
 */
export function supabase(): SupabaseClient | null {
  if (istemci) return istemci
  const { ortam, eksik } = ortamOku()
  if (eksik.includes('supabaseUrl') || eksik.includes('supabaseAnonKey')) return null
  istemci = createClient(ortam.supabaseUrl, ortam.supabaseAnonKey, {
    auth: {
      storage: guvenliDepo,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
  // Uygulama öndeyken token'ı yenile, arkadayken durdur (Supabase RN kalıbı).
  AppState.addEventListener('change', (durum) => {
    if (durum === 'active') istemci?.auth.startAutoRefresh()
    else istemci?.auth.stopAutoRefresh()
  })
  return istemci
}
