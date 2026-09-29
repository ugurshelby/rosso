import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { MarketingAtmosphere } from '@/components/marketing/MarketingAtmosphere'
import { CerezTercihi } from '@/components/privacy/cerez-tercihi'
import { gizlilikEpostasi } from '@/lib/iletisim'
import { yerelYol, type Dil } from '@/lib/marketing/dil'
import { GIZLILIK_METNI } from './gizlilik-metni'
import styles from '@/app/(marketing)/privacy/privacy.module.css'

/**
 * Gizlilik / KVKK aydınlatma sayfası — `/privacy` ve `/en/privacy`.
 *
 * Metnin tamamı `gizlilik-metni.ts`te (iki dil tek kaynak); burada yalnız
 * yerleşim var. Sayfanın içindeki tek etkileşimli parça çerez tercihi
 * kutusudur — rıza geri alınabilir olmalı.
 */
export function GizlilikSayfasi({ dil }: { dil: Dil }) {
  const t = GIZLILIK_METNI[dil]
  const gizlilikAdresi = gizlilikEpostasi()

  return (
    <main className={`mkt-page ${styles.wrapper}`}>
      <MarketingAtmosphere />
      <Link href={yerelYol(dil, '/')} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        {t.geri}
      </Link>

      <h1 className={styles.title}>{t.baslik}</h1>
      <p className={styles.guncelleme}>{t.guncelleme}</p>
      <p className={styles.lead}>{t.giris}</p>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t.sorumlu.baslik}</h2>
        <p className={styles.body}>{t.sorumlu.govde}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t.kategoriler.baslik}</h2>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t.kategoriler.sutunlar.veri}</th>
                <th>{t.kategoriler.sutunlar.amac}</th>
                <th>{t.kategoriler.sutunlar.saklama}</th>
              </tr>
            </thead>
            <tbody>
              {t.kategoriler.satirlar.map((satir) => (
                <tr key={satir.veri}>
                  <td>{satir.veri}</td>
                  <td>{satir.amac}</td>
                  <td>{satir.saklama}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t.toplanmayan.baslik}</h2>
        <p className={styles.body}>{t.toplanmayan.govde}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t.cerezler.baslik}</h2>
        <p className={styles.body}>{t.cerezler.govde}</p>
        <CerezTercihi
          metin={t.cerezler}
          className={styles.tercihKutusu}
          durumClassName={styles.tercihDurumu}
          butonlarClassName={styles.tercihButonlari}
          butonClassName={styles.tercihButonu}
          birincilButonClassName={`${styles.tercihButonu} ${styles.tercihButonuBirincil}`}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t.paylasim.baslik}</h2>
        <p className={styles.body}>{t.paylasim.giris}</p>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t.paylasim.sutunlar.taraf}</th>
                <th>{t.paylasim.sutunlar.amac}</th>
                <th>{t.paylasim.sutunlar.yer}</th>
              </tr>
            </thead>
            <tbody>
              {t.paylasim.satirlar.map((satir) => (
                <tr key={satir.taraf}>
                  <td>{satir.taraf}</td>
                  <td>{satir.amac}</td>
                  <td>{satir.yer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.body}>{t.paylasim.yurtDisiNotu}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t.haklar.baslik}</h2>
        <p className={styles.body}>{t.haklar.govde}</p>
        <ul className={styles.liste}>
          {t.haklar.maddeler.map((madde) => (
            <li key={madde}>{madde}</li>
          ))}
        </ul>
        <h3 className={styles.altBaslik}>{t.haklar.silmeBaslik}</h3>
        <p className={styles.body}>{t.haklar.silmeGovde}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>{t.iletisim.baslik}</h2>
        {/*
          ⚠ Sabit `privacy@rosso.app` YAZILMAZ — `rosso.app` bize ait değil
          (bkz. `lib/iletisim.ts`). KVKK başvurusunu yabancı bir şirkete
          yönlendirmek yalnız kırık değil, yasal olarak da yanlış. Adres
          tanımsızsa kullanıcıyı ÇALIŞAN bir yola gönderiyoruz.
        */}
        {gizlilikAdresi ? (
          <p className={styles.body}>
            {t.iletisim.epostaliOnce}
            <a href={`mailto:${gizlilikAdresi}`} className={styles.link}>
              {gizlilikAdresi}
            </a>
            {t.iletisim.epostaliSonra}
          </p>
        ) : (
          <p className={styles.body}>{t.iletisim.epostasiz}</p>
        )}
      </section>
    </main>
  )
}
