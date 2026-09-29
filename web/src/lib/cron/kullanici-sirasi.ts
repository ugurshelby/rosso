/**
 * Kayan kullanıcı sırası — cron'ların 1000 kullanıcıda kesilmeden çalışması.
 *
 * Migration 0342 (`cron_kullanici_sirasi`). Her cron işi kullanıcı başına bir
 * satır tutar: en son ne zaman tamamlandı, şu an kilitli mi. Bu modül bir
 * cron çağrısının gövdesidir:
 *
 *   1. `eszamanlilik` kadar işçi başlar.
 *   2. Her işçi sıradan TEK kullanıcı alır (`cron_sira_al` — en eski
 *      tamamlanan önce, FOR UPDATE SKIP LOCKED ile kilitli).
 *   3. İşler, sonucu yazar (`cron_sira_tamamla` — hata varsa üstel geri
 *      çekilme kilidi), sıradakini alır.
 *   4. Bütçe dolunca YENİ kullanıcı almaz; elindekini bitirir.
 *
 * Yetişemeyen kullanıcı vadesinde kalır ve bir sonraki çağrıda başa geçer —
 * "süre doldu, hep aynı kişiler kesildi" durumu artık oluşmaz. Cron'u sık
 * tetiklemek (0343) kapasiteyi belirler; tek çağrının uzunluğu değil.
 *
 * Çekirdek saf tutuldu (`siraylaIsleCekirdek`): sıra erişimi dışarıdan
 * verilir, testte veritabanı gerekmez.
 */

export interface SiraErisimi {
  /** Vadesi gelmiş, kilitsiz TEK kullanıcıyı kilitleyip döner; yoksa null. */
  al: () => Promise<string | null>
  /** `hata` null → başarı (damga + kilit açılır); dolu → geri çekilme kilidi. */
  tamamla: (userId: string, hata: string | null) => Promise<void>
}

export interface SiraSecenekleri {
  /** Aynı anda kaç kullanıcı işlenir. */
  eszamanlilik: number
  /** Çağrının başladığı an (ms). Bütçe buna göre ölçülür. */
  baslangic: number
  /** Bu süre geçtikten sonra YENİ kullanıcı alınmaz. */
  butceMs: number
  /** Tek kullanıcının işi. Fırlatırsa hata olarak yazılır, tur devam eder. */
  isle: (userId: string) => Promise<void>
  /** Test için saat. */
  simdi?: () => number
}

export interface KullaniciSonucu {
  userId: string
  sonuc: 'tamam' | 'hata'
  hata?: string
}

export interface SiraSonucu {
  islenen: number
  hatali: number
  /** Bütçe dolduğu için durduk — sırada hâlâ vadesi gelmiş kullanıcı olabilir. */
  butceDoldu: boolean
  ayrinti: KullaniciSonucu[]
}

export async function siraylaIsleCekirdek(
  erisim: SiraErisimi,
  secenek: SiraSecenekleri,
): Promise<SiraSonucu> {
  const simdi = secenek.simdi ?? Date.now
  const ayrinti: KullaniciSonucu[] = []
  let butceDoldu = false

  const isci = async (): Promise<void> => {
    for (;;) {
      if (simdi() - secenek.baslangic >= secenek.butceMs) {
        butceDoldu = true
        return
      }
      const userId = await erisim.al()
      if (!userId) return

      try {
        await secenek.isle(userId)
        await erisim.tamamla(userId, null)
        ayrinti.push({ userId, sonuc: 'tamam' })
      } catch (err) {
        const hata = err instanceof Error ? err.message : String(err)
        // Sonucu yazamasak bile tur sürmeli; kilit süresi dolunca kullanıcı
        // kendiliğinden sıraya döner.
        await erisim.tamamla(userId, hata || 'bilinmeyen hata').catch(() => {})
        ayrinti.push({ userId, sonuc: 'hata', hata })
      }
    }
  }

  const isciSayisi = Math.max(Math.floor(secenek.eszamanlilik), 1)
  await Promise.all(Array.from({ length: isciSayisi }, isci))

  return {
    islenen: ayrinti.filter((a) => a.sonuc === 'tamam').length,
    hatali: ayrinti.filter((a) => a.sonuc === 'hata').length,
    butceDoldu,
    ayrinti,
  }
}
