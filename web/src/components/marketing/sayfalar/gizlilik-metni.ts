import type { Dil } from '@/lib/marketing/dil'

/**
 * Gizlilik / KVKK aydınlatma metni — iki dilin tek kaynağı (2026-09-22).
 *
 * ─── Neden yeniden yazıldı ──────────────────────────────────────────────
 * Denetimde üç şey bulundu:
 *  1. Sayfa tamamen İNGİLİZCEYDİ, oysa site Türkçeye geçti ve hedef kitle
 *     Türkiye. KVKK aydınlatma yükümlülüğü "anlaşılır" olmayı şart koşar;
 *     kullanıcının konuşmadığı bir dildeki metin aydınlatma sayılmaz.
 *  2. Yalnız GDPR anılıyordu. Yürürlükteki yerel yasa 6698 sayılı KVKK.
 *  3. Sayım EKSİKTİ: mood etiketleri ve ölçüm (Vercel Analytics) metinde hiç
 *     geçmiyordu. (2026-09-25: sosyal katman kapatıldı; ilgili satırlar "eski veri"
 *     olarak tek satıra indi, BYOC Client ID/Secret satırı eklendi.)
 *     Eksik sayım, yanlış sayımla aynı kapıya çıkar.
 *
 * ⚠ Bu metin KODDAN DOĞRULANARAK yazıldı, varsayımla değil: veri kategorileri
 * `lib/account/data-export.ts` ve canlı şemadan, AI'a gidenler
 * `lib/ai/gemini-client.ts` `buildPrompt`'tan, saklama süreleri
 * `lib/services/account-purge.ts` (30 gün) ve `cleanup_old_logs` (30 gün)
 * fonksiyonlarından. Bir davranış değişirse METİN DE değişmeli.
 */

export interface GizlilikSatiri {
  veri: string
  amac: string
  saklama: string
}

export interface GizlilikTarafi {
  taraf: string
  amac: string
  yer: string
}

export interface GizlilikMetni {
  metaBaslik: string
  metaAciklama: string
  geri: string
  baslik: string
  guncelleme: string
  giris: string

  sorumlu: { baslik: string; govde: string }

  kategoriler: {
    baslik: string
    sutunlar: { veri: string; amac: string; saklama: string }
    satirlar: GizlilikSatiri[]
  }

  toplanmayan: { baslik: string; govde: string }

  cerezler: {
    baslik: string
    govde: string
    durumEtiketi: string
    durumKabul: string
    durumRet: string
    durumKararsiz: string
    degistir: string
    kabulEt: string
    reddet: string
  }

  paylasim: {
    baslik: string
    giris: string
    sutunlar: { taraf: string; amac: string; yer: string }
    satirlar: GizlilikTarafi[]
    yurtDisiNotu: string
  }

  haklar: {
    baslik: string
    govde: string
    maddeler: string[]
    silmeBaslik: string
    silmeGovde: string
  }

  iletisim: {
    baslik: string
    epostaliOnce: string
    epostaliSonra: string
    epostasiz: string
  }
}

const tr: GizlilikMetni = {
  metaBaslik: 'Gizlilik ve veri politikası',
  metaAciklama:
    'Rosso hangi verini neden işliyor, nerede saklıyor ve nasıl silersin. ' +
    'KVKK (6698) ve GDPR uyumlu aydınlatma metni.',
  geri: 'Ana sayfa',
  baslik: 'Gizlilik ve veri politikası',
  guncelleme: 'Son güncelleme: 25 Eylül 2026',
  giris:
    'Rosso müzik geçmişini tek yerde toplar. Yalnız ürünün çalışması için ' +
    'gerekeni işler, kontrolü sende bırakır. Aşağıda ne topladığımız, neden ' +
    'topladığımız ve nasıl sileceğin yazıyor — kısa ve eksiksiz.',

  sorumlu: {
    baslik: 'Veri sorumlusu',
    govde:
      'Rosso (Project Rosso) şu an alfa aşamasında, tek kişilik bir projedir; ' +
      'veri sorumlusu proje sahibidir. Başvurularını aşağıdaki iletişim ' +
      'bölümündeki kanaldan iletebilirsin. Verilerin reklam için kullanılmaz, ' +
      'üçüncü taraflara satılmaz.',
  },

  kategoriler: {
    baslik: 'İşlediğimiz veri kategorileri',
    sutunlar: { veri: 'Veri', amac: 'Amaç', saklama: 'Saklama' },
    satirlar: [
      {
        veri: 'Hesap bilgisi (e-posta, görünen ad)',
        amac: 'Giriş, oturum yönetimi ve seninle iletişim.',
        saklama: 'Hesap silinene kadar.',
      },
      {
        veri: 'Spotify bağlantı jetonları',
        amac: 'Spotify kitaplığına erişim ve eşitleme.',
        saklama: 'Bağlantı kaldırılana ya da hesap silinene kadar (şifreli).',
      },
      {
        veri: 'Dinleme kayıtları (play_events)',
        amac: 'Recap, istatistikler ve müzik kimliği (Taste).',
        saklama: 'Hesap silinene kadar.',
      },
      {
        veri: 'Spotify dışa aktarma ZIP dosyası',
        amac: 'Geçmiş dinleme verisini içeri aktarmak.',
        saklama: 'İşlendikten sonra silinir; en geç hesap silindiğinde.',
      },
      {
        veri: 'Çalma listeleri ve mood kararların (gizlenen/onaylanan parçalar, uygunluk etiketleri)',
        amac: 'Listelerini sana göre şekillendirmek.',
        saklama: 'Hesap silinene kadar.',
      },
      {
        veri: 'Kendi Spotify geliştirici uygulamanın bilgileri (Client ID, Client Secret)',
        amac: 'Canlı eşitlemeyi kendi uygulamanla, kendi kotanla yapmak.',
        saklama: 'Şifreli saklanır; bağlantıyı kaldırana ya da hesabı silene kadar.',
      },
      {
        veri: 'Kapatılan sosyal özelliğin eski verisi (varsa: sosyal profil, fotoğraf, mesaj, eşleşme kararı)',
        amac: 'Sosyal özellikler kapatıldı; bu veri hiçbir amaçla işlenmez veya kimseye gösterilmez.',
        saklama: 'Hesap silinene kadar durur; dışa aktarma dosyanda yer alır.',
      },
      {
        veri: 'Sistem kayıtları (hata/işlem logları)',
        amac: 'Arıza teşhisi ve güvenlik.',
        saklama: '30 gün; sonra kendiliğinden silinir.',
      },
      {
        veri: 'İsimsiz ziyaret ölçümü (yalnız izin verirsen)',
        amac: 'Hangi sayfaların kullanıldığını görmek.',
        saklama: 'Vercel Analytics tarafında toplu/isimsiz; kimliğinle eşleşmez.',
      },
    ],
  },

  toplanmayan: {
    baslik: 'Toplamadığımız veriler',
    govde:
      'IP adresini saklamıyoruz. Spotify dışa aktarmasındaki ip_addr alanı ' +
      'işlenmez: hiçbir tabloya, log kaydına ya da hata kaydına yazılmaz. ' +
      'Kimlik dosyası (identity.json) yalnız içeri aktarma sırasında okunur ve ' +
      'sonra silinir. Reklam çerezi, izleme pikseli ve üçüncü taraf reklam ağı ' +
      'kullanmıyoruz.',
  },

  cerezler: {
    baslik: 'Çerezler ve ölçüm',
    govde:
      'Oturumunu açık tutan temel çerezler ürünün çalışması için zorunludur ve ' +
      'kapatılamaz. Bunun dışındaki tek şey isimsiz ziyaret ölçümüdür (Vercel ' +
      'Web Analytics) ve yalnızca sen "Kabul et" dersen yüklenir. Karar ' +
      'vermediysen de yüklenmez — susmak rıza sayılmaz. Kararını istediğin an ' +
      'buradan değiştirebilirsin.',
    durumEtiketi: 'Şu anki tercihin:',
    durumKabul: 'ölçüme izin verdin',
    durumRet: 'ölçümü reddettin',
    durumKararsiz: 'henüz seçmedin (ölçüm kapalı)',
    degistir: 'Tercihimi değiştir',
    kabulEt: 'Ölçüme izin ver',
    reddet: 'Ölçümü kapat',
  },

  paylasim: {
    baslik: 'Verinin geçtiği yerler',
    giris:
      'Rosso verini satmaz. Ürünün çalışması için yalnız şu hizmet ' +
      'sağlayıcılarını kullanır (veri işleyenler):',
    sutunlar: { taraf: 'Hizmet', amac: 'Ne için', yer: 'Nerede' },
    satirlar: [
      {
        taraf: 'Supabase',
        amac: 'Veritabanı, kimlik doğrulama ve dosya saklama.',
        yer: 'AB (Frankfurt)',
      },
      {
        taraf: 'Vercel',
        amac: 'Sitenin barındırılması ve (izin verirsen) isimsiz ölçüm.',
        yer: 'AB (Frankfurt)',
      },
      {
        taraf: 'Spotify',
        amac: 'Bağladığın hesabın kitaplığını ve dinlemelerini okumak.',
        yer: 'ABD / küresel',
      },
      {
        taraf: 'Google Vertex AI (Gemini)',
        amac: 'Mood listelerinin küratör katmanı.',
        yer: 'ABD',
      },
    ],
    yurtDisiNotu:
      'Yurt dışına aktarım (KVKK m.9): Google Vertex AI’a gönderilen istek ' +
      'KİMLİĞİNİ İÇERMEZ — e-postan, adın ya da kullanıcı kimliğin gitmez. ' +
      'Yalnız parça/sanatçı adları ve bir zevk özeti gider. Spotify ise zaten ' +
      'senin kendi hesabın olduğu için bağlantıyı sen kurar, istediğin an ' +
      'Ayarlar’dan kaldırabilirsin. Yapay zekâ katmanı kapansa bile listeler ' +
      'çalışmaya devam eder; vazgeçilmez değildir.',
  },

  haklar: {
    baslik: 'Haklarını nasıl kullanırsın',
    govde:
      'KVKK m.11 ve GDPR kapsamında verilerine erişme, düzeltme, silme ve ' +
      'taşıma hakların var. Bunların çoğunu bir başvuru beklemeden, uygulamanın ' +
      'içinden anında kullanabilirsin:',
    /*
     * ⚠ Arayüz adları İNGİLİZCE kalır (YardimSayfasi ile aynı kural):
     * uygulama arayüzü İngilizce ve kullanıcı ekranda o kelimeyi arayacak.
     * Türkçeye çevirmek metni "doğru" yapar ama kullanıcıyı kaybettirir.
     */
    maddeler: [
      'Verilerini indir: Settings → “Export personal data” — tüm kişisel verin JSON olarak anında iner.',
      'Düzelt: Settings → Account (görünen adın; e-posta ve şifre için hesap ayarları).',
      'Spotify bağlantısını kes: Settings → “Platform connections”. Geçmiş verin kalır, yalnız yeni eşitleme durur.',
      'Hesabını sil: Settings → “Delete account”.',
    ],
    silmeBaslik: 'Silme nasıl işler',
    silmeGovde:
      'Hesap silme iki aşamalıdır. Sildiğin anda hesabın kapanır; ' +
      'veri 30 gün daha durur — yanlışlıkla sildiysen bu pencerede geri ' +
      'dönebilirsin. 30 gün dolunca kalıcı silme kendiliğinden çalışır: dinleme ' +
      'kayıtların, çalma listelerin ve ' +
      'yüklediğin dosyalar dahil her şey geri dönüşsüz silinir. Sistem ' +
      'kayıtlarındaki kimliğin ise silme anında kopar (kayıt anonimleşir, 30 gün ' +
      'içinde de tamamen temizlenir).',
  },

  iletisim: {
    baslik: 'İletişim',
    epostaliOnce: 'Veri talepleri ve sorular için: ',
    epostaliSonra: '.',
    epostasiz:
      'Şu an yayınlanmış bir başvuru e-postası yok; uydurma bir adres ' +
      'göstermek yerine işleyen yolu gösteriyoruz: verilerini Settings → ' +
      '“Export personal data” ile indirebilir, hesabını yine Settings → ' +
      '“Delete account” ile silebilirsin. İkisi de anında çalışır, kimsenin ' +
      'onayını beklemez.',
  },
}

const en: GizlilikMetni = {
  metaBaslik: 'Privacy and data policy',
  metaAciklama:
    'What data Rosso processes, why, where it is stored, and how you delete it. ' +
    'Aligned with Türkiye’s KVKK (6698) and the GDPR.',
  geri: 'Home',
  baslik: 'Privacy and data policy',
  guncelleme: 'Last updated: 25 September 2026',
  giris:
    'Rosso brings your music history together. We only process what the product ' +
    'needs and leave control with you. Below: what we collect, why, and how you ' +
    'delete it — short and complete.',

  sorumlu: {
    baslik: 'Data controller',
    govde:
      'Rosso (Project Rosso) is an alpha-stage, one-person project; the project ' +
      'owner is the data controller. You can send requests through the contact ' +
      'section below. Your data is never used for advertising and never sold.',
  },

  kategoriler: {
    baslik: 'Categories of data we process',
    sutunlar: { veri: 'Data', amac: 'Purpose', saklama: 'Retention' },
    satirlar: [
      {
        veri: 'Account info (email, display name)',
        amac: 'Sign-in, session management, and contacting you.',
        saklama: 'Until the account is deleted.',
      },
      {
        veri: 'Spotify connection tokens',
        amac: 'Access to your Spotify library and syncing.',
        saklama: 'Until the connection is removed or the account is deleted (encrypted).',
      },
      {
        veri: 'Listening events (play_events)',
        amac: 'Recap, stats, and musical identity (Taste).',
        saklama: 'Until the account is deleted.',
      },
      {
        veri: 'Spotify export ZIP file',
        amac: 'Importing your past listening data.',
        saklama: 'Deleted after processing; at the latest when the account is deleted.',
      },
      {
        veri: 'Playlists and your mood decisions (hidden/approved tracks, relevance labels)',
        amac: 'Shaping your lists around you.',
        saklama: 'Until the account is deleted.',
      },
      {
        veri: 'Your own Spotify developer app details (Client ID, Client Secret)',
        amac: 'Running live sync through your own app, on your own quota.',
        saklama: 'Stored encrypted; until you remove the connection or delete the account.',
      },
      {
        veri: 'Legacy data of the discontinued social features (if any: social profile, photos, messages, match decisions)',
        amac: 'The social features are discontinued; this data is not processed for any purpose or shown to anyone.',
        saklama: 'Kept until the account is deleted; included in your data export.',
      },
      {
        veri: 'System logs (errors and operations)',
        amac: 'Diagnostics and security.',
        saklama: '30 days, then deleted automatically.',
      },
      {
        veri: 'Anonymous visit measurement (only if you allow it)',
        amac: 'Seeing which pages are used.',
        saklama: 'Aggregated and anonymous at Vercel Analytics; never tied to your identity.',
      },
    ],
  },

  toplanmayan: {
    baslik: 'Data we don’t collect',
    govde:
      'We don’t store IP addresses. The ip_addr field in a Spotify export is not ' +
      'processed: it is never written to any table, log, or error record. The ' +
      'identity file (identity.json) is read only during import and then deleted. ' +
      'We use no advertising cookies, no tracking pixels, and no third-party ad ' +
      'networks.',
  },

  cerezler: {
    baslik: 'Cookies and measurement',
    govde:
      'Essential cookies that keep you signed in are required for the product to ' +
      'work and can’t be turned off. The only other thing is anonymous visit ' +
      'measurement (Vercel Web Analytics), and it loads only if you choose ' +
      '“Accept”. If you haven’t chosen, it doesn’t load either — silence is not ' +
      'consent. You can change your choice here at any time.',
    durumEtiketi: 'Your current choice:',
    durumKabul: 'measurement allowed',
    durumRet: 'measurement declined',
    durumKararsiz: 'not chosen yet (measurement off)',
    degistir: 'Change my choice',
    kabulEt: 'Allow measurement',
    reddet: 'Turn measurement off',
  },

  paylasim: {
    baslik: 'Where your data goes',
    giris:
      'Rosso never sells your data. It uses only these service providers (data ' +
      'processors) to run the product:',
    sutunlar: { taraf: 'Service', amac: 'What for', yer: 'Where' },
    satirlar: [
      {
        taraf: 'Supabase',
        amac: 'Database, authentication, and file storage.',
        yer: 'EU (Frankfurt)',
      },
      {
        taraf: 'Vercel',
        amac: 'Hosting and (if you allow it) anonymous measurement.',
        yer: 'EU (Frankfurt)',
      },
      {
        taraf: 'Spotify',
        amac: 'Reading the library and listens of the account you connect.',
        yer: 'US / global',
      },
      {
        taraf: 'Google Vertex AI (Gemini)',
        amac: 'The curator layer for mood playlists.',
        yer: 'US',
      },
    ],
    yurtDisiNotu:
      'Transfers abroad (KVKK art. 9): the request sent to Google Vertex AI ' +
      'CONTAINS NO IDENTITY — not your email, not your name, not your user id. ' +
      'Only track and artist names plus a taste summary are sent. Spotify is your ' +
      'own account: you create the connection and can remove it from Settings at ' +
      'any time. Even with the AI layer switched off, playlists keep working — it ' +
      'is never indispensable.',
  },

  haklar: {
    baslik: 'How to exercise your rights',
    govde:
      'Under KVKK art. 11 and the GDPR you can access, correct, delete, and port ' +
      'your data. Most of this works instantly inside the app, without waiting ' +
      'for a request to be processed:',
    maddeler: [
      'Download your data: Settings → “Export personal data” — your full personal data pack downloads as JSON immediately.',
      'Correct: Settings → Account (your display name; email and password in account settings).',
      'Disconnect Spotify: Settings → Platform connections. Past data stays; only new syncing stops.',
      'Delete your account: Settings → Delete account.',
    ],
    silmeBaslik: 'How deletion works',
    silmeGovde:
      'Account deletion has two stages. The moment you delete, your account closes; ' +
      'the data stays for another 30 days — if ' +
      'you deleted it by mistake, you can come back within that window. After 30 ' +
      'days permanent deletion runs automatically: listening events, playlists, ' +
      'and the files you uploaded are all removed ' +
      'irreversibly. Your identity in system logs is detached at deletion time ' +
      '(the record is anonymized, and cleared entirely within 30 days).',
  },

  iletisim: {
    baslik: 'Contact',
    epostaliOnce: 'For data requests or questions: ',
    epostaliSonra: '.',
    epostasiz:
      'There is no published request address yet; rather than show an invented ' +
      'one, here is the path that works: download your data with the “Export ' +
      'personal data” button in Settings, and delete your account from Settings ' +
      'as well. Both are immediate and need nobody’s approval.',
  },
}

export const GIZLILIK_METNI: Record<Dil, GizlilikMetni> = { tr, en }
