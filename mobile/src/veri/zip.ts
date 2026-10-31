import * as FileSystem from 'expo-file-system/legacy'
import { ortamOku } from '@/ortam'
import { api } from './api'
import { supabase } from './supabase'
import type { SecilenDosya } from './bicim'

export { EN_BUYUK_ZIP, zipKontrol, type SecilenDosya } from './bicim'

/**
 * Mobilden ZIP (mimari M8, spec §9.7): web'in hattının aynısı —
 * `/api/export/upload` → imzalı adrese doğrudan yükleme (Vercel'den geçmez) →
 * `/api/export/queue` → worker. İlerleme gerçek baytlardan; sahte yüzde yok.
 */

export type ZipAsamasi = { asama: 'hazirlaniyor' } | { asama: 'yukleniyor'; yuzde: number } | { asama: 'kuyrukta'; jobId: string }

export async function zipYukle(d: SecilenDosya, bildir: (a: ZipAsamasi) => void): Promise<string> {
  bildir({ asama: 'hazirlaniyor' })
  const { jobId, signedUrl } = await api<{ jobId: string; signedUrl: string }>('/api/export/upload', {
    yontem: 'POST',
    govde: { fileName: d.ad, fileSize: d.boyut, fileType: 'application/zip' },
  })

  const oturum = (await supabase()?.auth.getSession())?.data.session
  const gorev = FileSystem.createUploadTask(
    signedUrl,
    d.uri,
    {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Content-Type': 'application/zip',
        'x-upsert': 'true',
        apikey: ortamOku().ortam.supabaseAnonKey,
        ...(oturum ? { Authorization: `Bearer ${oturum.access_token}` } : {}),
      },
    },
    (p) => {
      const toplam = p.totalBytesExpectedToSend || d.boyut
      bildir({ asama: 'yukleniyor', yuzde: toplam > 0 ? Math.min(100, Math.round((p.totalBytesSent / toplam) * 100)) : 0 })
    },
  )
  const sonuc = await gorev.uploadAsync()
  if (!sonuc || sonuc.status < 200 || sonuc.status >= 300) {
    throw new Error(`Yükleme tamamlanmadı (${sonuc?.status ?? 'bağlantı'})`)
  }

  await api<{ jobId: string }>('/api/export/queue', { yontem: 'POST', govde: { jobId } })
  bildir({ asama: 'kuyrukta', jobId })
  return jobId
}
