'use client'

import { useEffect, useState } from 'react'
import { TICKER_ARALIK_MS, tickerSatirlari, type TickerSatiri } from '@/lib/export/export-stage-ticker'
import type { ExportJobState } from '@/lib/export/use-export-progress'
import styles from './processing-ticker.module.css'

/**
 * İşleme ekranındaki dönen durum satırı.
 *
 * ─── ANİMASYON KARARLARI (`animate` skill sırasıyla) ───────────────────────
 *
 * 1. ANİMASYON OLMALI MI? Frekans: NADİR / ilk-kez — kullanıcı ZIP'i yılda
 *    birkaç kez yükler. Skill'in tablosunda bu "delight budget" katmanı.
 *    Ve asıl gerekçe dekoratif değil: bekleyiş ÖLÇÜLDÜ ve 46 dakikaya kadar
 *    çıkabiliyor (bkz. `export-stage-ticker.ts`). Hareketsiz bir ekranda o
 *    süre "sistem dondu" diye okunur.
 *
 * 2. AMAÇ: **state indication** — sistemin hâlâ çalıştığını ve o anda NE
 *    yaptığını okunur kılmak. "Looks cool" değil; ekranın canlı olduğunu
 *    kanıtlayan tek sinyal bu.
 *
 * 3. ARAÇ: CSS `@keyframes` (`opacity` + `transform`), Motion DEĞİL.
 *    En ucuz araç yeter kuralı: iki metin arasında geçiş için spring/JS
 *    gereksiz. Üstelik bu ekran arka planda ağ trafiği + Realtime aboneliği
 *    döndürüyor; CSS animasyonu ana iş parçacığından bağımsız çalışır
 *    (`animate` skill: "must stay smooth while the page is busy loading").
 *
 * 4. ÖZELLİKLER: yalnız `opacity` ve `transform`. Satır uzunlukları farklı
 *    olduğu için kapsayıcıya sabit `min-height` verildi — metin değişimi
 *    LAYOUT KAYDIRMAZ (`review-animations` 7. standart: layout özelliği
 *    animasyonu yasak; burada layout hiç değişmiyor).
 *
 * 5. EASING/SÜRE: `--ease-out` (`cubic-bezier(0, 0, 0.2, 1)`), **180 ms**.
 *    Giriş/çıkış → `ease-out` (skill tablosu). 300 ms tavanının altında.
 *    `ease-in` KULLANILMADI: kullanıcının baktığı anı geciktirir.
 *
 * 6. KESİNTİ: burada keyframes MEŞRU, çünkü `review-animations`'ın yasağı
 *    "hızlı tetiklenen, mevcut değerinden yeniden hedeflenmesi gereken"
 *    öğeler için. Bu satır her seferinde YENİ bir element olarak mount
 *    ediliyor (React `key`) — geri alınacak bir "mevcut değer" yok, tek
 *    yönlü bir giriş var. Aralık da 2,6 sn: "rapidly triggered" değil.
 *    Transition burada yanlış araç olurdu: elementin başlangıç değeri
 *    olmadığı için hiç oynamazdı (`@starting-style` gerekirdi).
 *
 * 7. REDUCED MOTION: hareket kalkar, ÇAPRAZ GEÇİŞ kalır (skill: "fewer and
 *    gentler, not zero"). Bilgi kaybolmuyor, yalnız kayma gidiyor.
 */
export function ProcessingTicker({ job }: { job: ExportJobState | null }) {
  const [gecenSaniye, setGecenSaniye] = useState(0)
  const [indeks, setIndeks] = useState(0)

  // Kuyrukta ne kadar beklediğimiz metni değiştiriyor — saniyeyi say.
  useEffect(() => {
    if (!job?.created_at) return
    const basla = new Date(job.created_at).getTime()
    const tik = () => setGecenSaniye(Math.max(0, Math.round((Date.now() - basla) / 1000)))
    tik()
    const id = setInterval(tik, 5_000)
    return () => clearInterval(id)
  }, [job?.created_at])

  const satirlar: TickerSatiri[] = tickerSatirlari(job, gecenSaniye)

  /*
   * Gerçek aşama değişince (queued → processing) sıra başa döner. Bu bir
   * "reset" değil bir SÖZLEŞME: dönen satır her zaman içinde bulunduğumuz
   * aşamanın satırı olmalı, önceki aşamanın kalıntısı ekranda kalmamalı.
   *
   * RENDER SIRASINDA ayarlanıyor, `useEffect` içinde DEĞİL. React'in
   * "önceki render'dan bilgi saklama" deseni bu; effect'le yapıldığında
   * eski indeksle bir kare çizilir (önceki aşamanın satırı bir an görünür)
   * ve `react-hooks/set-state-in-effect` kuralı da haklı olarak uyarır.
   */
  const [oncekiDurum, setOncekiDurum] = useState(job?.status)
  if (job?.status !== oncekiDurum) {
    setOncekiDurum(job?.status)
    setIndeks(0)
  }

  useEffect(() => {
    if (satirlar.length <= 1) return
    const id = setInterval(() => {
      setIndeks((i) => (i + 1) % satirlar.length)
    }, TICKER_ARALIK_MS)
    return () => clearInterval(id)
  }, [satirlar.length])

  if (satirlar.length === 0) return null

  const aktif = satirlar[Math.min(indeks, satirlar.length - 1)]

  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      {/*
        `key` ile yeniden mount: CSS `@starting-style` yerine React'in
        remount'u kullanılıyor çünkü satır İÇERİĞİ değişiyor, sınıfı değil.
        Her satır kendi giriş geçişini oynatır.
      */}
      <span key={`${aktif.etiket}-${indeks}`} className={styles.satir}>
        <span className={styles.etiket}>{aktif.etiket}…</span>
        <span className={styles.aciklama}>{aktif.aciklama}</span>
      </span>
    </div>
  )
}
