import { ImageResponse } from 'next/og'
import { ROSSO_MARK_DATA_URI } from './opengraph-image-mark'

/**
 * Sosyal paylaşım görseli — WhatsApp, X, LinkedIn, Slack önizlemesi.
 *
 * ─── Neden kod, neden statik PNG değil ──────────────────────────────────
 * Statik dosya marka renkleri değişince sessizce eskir; kimse `public/`
 * içindeki bir PNG'yi güncellemeyi hatırlamaz. Burada renkler koddaki
 * marka değerlerinden geliyor.
 *
 * ⚠ `oklch()` KULLANILAMAZ: Satori (Next'in OG motoru) yalnız sınırlı bir
 * CSS altkümesini anlar, oklch onlardan biri değil. Bu yüzden Deep Violet
 * (`oklch(59.9% 0.230 286.2)`) sRGB karşılığıyla YAZILDI — değer
 * değişirse burası da elle güncellenmeli, o yüzden not düşülüyor.
 *
 * Boyut 1200×630: tüm büyük platformların beklediği oran (1.91:1). Daha
 * küçüğü ölçeklenirken bulanıklaşır.
 */
export const runtime = 'edge'
export const alt = 'Rosso — your musical identity'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Deep Violet (`--accent`) sRGB karşılığı — bkz. yukarıdaki not. */
const MOR = '#6d3ff0'
const ZEMIN = '#0a0a0f'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          background: ZEMIN,
          // Sol üstten gelen mor ışık — landing'deki atmosfer dokunuşunun
          // sadeleştirilmiş hâli.
          backgroundImage: `radial-gradient(ellipse 70% 60% at 18% 0%, ${MOR}38, transparent 62%)`,
          padding: '0 88px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 26,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori yalnız <img> anlıyor, next/image çalışmıyor */}
          <img src={ROSSO_MARK_DATA_URI} width={40} height={40} alt="" />
          <div
            style={{
              display: 'flex',
              fontSize: 34,
              letterSpacing: 14,
              color: '#8f8fa8',
            }}
          >
            ROSSO
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 62,
            color: '#8f8fa8',
            lineHeight: 1.25,
          }}
        >
          Spotify shows what you listened to.
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 78,
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.2,
            marginTop: 8,
            /*
             * ⚠ `gap` — dize içi boşluk DEĞİL. Satori flex düzeninde
             * span'lerin baş/son boşluklarını kırpıyor: `<span>Rosso </span>`
             * yazınca çıktı "Rossoseni" oluyordu (ölçüldü 2026-08-21).
             * `&nbsp;` ise ters yönde hata veriyordu — fazladan geniş boşluk.
             * `gap` ikisinden de bağımsız, öngörülebilir aralık verir.
             */
            gap: 20,
          }}
        >
          <span>Rosso</span>
          <span style={{ color: MOR }}>tells</span>
          <span>who you are.</span>
        </div>

        {/* Alt şerit: marka çizgisi — logosuz da olsa tanınır bir imza. */}
        <div
          style={{
            display: 'flex',
            width: 190,
            height: 7,
            marginTop: 40,
            borderRadius: 4,
            background: MOR,
          }}
        />
      </div>
    ),
    size,
  )
}
