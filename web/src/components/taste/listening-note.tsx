import type { DinlemeNotu } from '@/lib/analytics/music-intelligence'
import type { Translator } from '@/lib/i18n/translate'
import styles from './listening-note.module.css'

interface ListeningNoteProps {
  note: DinlemeNotu | null
  t: Translator['t']
}

/**
 * Dinleme notu — Katman B'nin (user_music_intelligence) ekrandaki tek yüzü.
 *
 * `rosso-ai-integration.md` §9 "No-Slop" kuralları BURADA uygulanır:
 *  • AI varlığı fetişleştirilmez — ✨ ikonu, "yapay zekâ" etiketi, "senin için
 *    düşündük" dili YOK. Not, kütüphanenin doğal bir gözlemi gibi durur.
 *  • Sayfa açılışında hesaplama yok — not ayda bir üretilip mühürleniyor,
 *    burada yalnız okunuyor.
 *
 * Not yoksa (AI kapalı / henüz üretilmedi) hiçbir şey çizmez: sayfanın geri
 * kalanı deterministik ve eksiksizdir.
 *
 * Etkileşimsiz bir okuma yüzeyi: tıklanabilir değil, bu yüzden `:active`
 * geri bildirimi ya da hover durumu taşımaz (dashboard-design §3.2-c yalnız
 * tıklanabilir öğeler için).
 */
export function ListeningNote({ note, t }: ListeningNoteProps) {
  if (!note) return null

  return (
    <section className={styles.section} aria-labelledby="dinleme-notu-baslik">
      <div className={`surface-2 ${styles.card}`}>
        <h3 id="dinleme-notu-baslik" className={styles.eyebrow}>
          {t('taste.listeningNote.title')}
        </h3>
        <blockquote className={styles.quote}>
          <p>{note.not}</p>
        </blockquote>
        {note.dokular.length > 0 && (
          <ul className={styles.textures} aria-label={t('taste.listeningNote.texturesAria')}>
            {note.dokular.map((doku, i) => (
              <li key={`${i}-${doku}`} className={styles.texture}>
                {doku}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
