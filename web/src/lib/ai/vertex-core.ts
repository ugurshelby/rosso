import 'server-only'

import { createHash } from 'node:crypto'
import { ApiError, GoogleGenAI } from '@google/genai'
import { aiKapanisAktif } from './ai-kapanis'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { systemLog } from '@/lib/observability/logger'

/**
 * Vertex AI çekirdeği — TÜM AI çağrılarının tek kapısı.
 *
 * Neden tek kapı: her yeni AI özelliği kendi istemcisini yazarsa frenlerden
 * birini unutmak an meselesidir. `callVertexJson` kimlik/kota/devre kesici/
 * çıktı tavanı + yeniden deneme + loglamayı tek yerde garanti eder; yeni bir
 * özellik yalnız model, zod şeması ve prompt verir.
 *
 * 🔴 TASARIM İLKESİ (Sahip, 2026-09-18): *"AI güzel bir katman ama
 * vazgeçilmez olmamalı."* Buradaki HİÇBİR yol exception fırlatmaz — hepsi
 * `null` döner ve çağıran deterministik yoluna düşer.
 *
 * STANDARTLAR (2026-09-19 — resmi SDK/Google Cloud belgelerine göre yeniden
 * kuruldu; her biri kurulu SDK sürümünde ve gerçek bir çağrıyla doğrulandı):
 *
 *  • KİMLİK — servis hesabı + ADC, en az yetki (`roles/aiplatform.user`).
 *    Env değerleri zod ile doğrulanır; bozuk/eksik credential'da AI sessizce
 *    kapanır, içeriği ASLA loglanmaz.
 *  • DAYANIKLILIK — SDK'nın yerleşik `retryOptions`'ı (üstel geri çekilme +
 *    jitter, 408/429/5xx). Deneme başına `httpOptions.timeout`, tüm çağrı için
 *    `abortSignal`: süre dolunca HTTP isteği GERÇEKTEN iptal edilir. (Eskiden
 *    `Promise.race` kullanılıyordu; zaman aşımı yalnız BEKLEMEYİ bırakıyor,
 *    istek arka planda sürüp kapasite harcamaya devam ediyordu.)
 *  • GLOBAL ENDPOINT — `GCP_LOCATION` verilmezse `global`. Google 429'u
 *    azaltmak için bunu öneriyor; trafiği bölgeler arasında dinamik yönlendirir.
 *    Ölçüm (aynı istek): us-central1 ~600 ms, global ~500 ms, aynı model sürümü.
 *  • YAPILANDIRILMIŞ ÇIKTI — `responseMimeType: application/json` +
 *    `responseJsonSchema`. Şemanın TEK kaynağı zod: aynı şema hem modele
 *    gönderilir hem yanıtı çalışma anında doğrular; ikisi ayrışamaz.
 *  • MALİYET — `labels` ile her çağrı GCP faturasında özelliğe göre ayrışır.
 *    Örtük önbellek (Gemini 2.5'te varsayılan açık, Vertex'te %90 indirim)
 *    `cachedContentTokenCount` ile ölçülüp maliyete doğru yansıtılır.
 *  • GÖZLEM — her çağrı: model sürümü, token (önbellek dahil), gecikme, HTTP
 *    deneme sayısı, hata KODU. Bkz. migration 0320.
 */

// ───────────────────────────── model yönlendirme ─────────────────────────────

/**
 * Model matrisi — `docs/reference/rosso-ai-integration.md` §7.
 *
 * Sabit sürümler bilinçli: `-latest` alias'ı Google modeli güncellediğinde
 * hem davranışı hem faturayı habersiz değiştirebilir. Yerinde güncellemeler
 * `ai_generation_logs.model_version`'dan izlenir.
 *
 * ⚠ Bir model buraya eklenirken `ai_model_pricing` tablosuna da fiyatı
 * girilmeli (migration 0313/0320). Fiyatı olmayan model çalışır ama maliyeti
 * NULL loglanır — yani bütçe raporunda görünmez olur.
 *
 * §7 Altın Kural: *"Premium olduğu için Pro kullanalım" yasaktır.*
 *
 * 🔴 `gemini-2.5-flash-lite` DENENDİ VE GERİ ALINDI (2026-09-19, ölçüm):
 * aynı turda flash 8/8 başarılı (6-8 sn), flash-lite 2/4 (1× 429, 1× 30 sn
 * zaman aşımı; başarılılar 9 ve 17 sn). Tasarruf (~1 TL/gün) güvenilirliğe
 * değmedi. Yeniden denenecekse önce `ai_generation_logs` ile izole ölçülmeli.
 */
export const AI_MODELS = {
  /** Aday havuzundan seçim — akıl yürütme değil, eşleştirme işi. */
  curation: 'gemini-2.5-flash',
  /** Katalog etiketleme — hacimli, basit sınıflandırma. */
  catalogEnrichment: 'gemini-2.5-flash',
  /**
   * Journey KAPANIŞ metni (Katman D) — tek seferlik, en görünür metin; üslup kalitesi
   * çağrı maliyetinden önemli. flash ile yazılan ilk sürüm istatistik dökümü gibi çıktı.
   * Pro düşünmeyi kapatamaz (asgari bütçe 128) — çağıran `thinkingBudget` verir.
   */
  finale: 'gemini-2.5-pro',
} as const

export type AiModel = (typeof AI_MODELS)[keyof typeof AI_MODELS]

// ───────────────────────────── yapılandırma ─────────────────────────────

/**
 * Servis hesabı JSON'ının asgari şekli. `looseObject`: token_uri, client_id
 * gibi diğer alanlar google-auth-library'ye OLDUĞU GİBİ geçmeli.
 */
const ServisHesabiSemasi = z.looseObject({
  type: z.literal('service_account'),
  project_id: z.string().min(1),
  client_email: z.string().min(3).includes('@'),
  private_key: z.string().includes('PRIVATE KEY'),
})

export interface VertexYapilandirmasi {
  project: string
  location: string
  /** ⚠ Credential İÇERİR — asla loglanmaz, yalnız SDK'ya geçer. */
  googleAuthOptions: { credentials?: Record<string, unknown> }
  kimlikKaynagi: 'env-json' | 'adc'
}

/** Google'ın 429'a karşı önerdiği varsayılan konum. Bkz. dosya başı. */
const VARSAYILAN_KONUM = 'global'

/**
 * Vertex yapılandırmasını env'den okur ve DOĞRULAR. Eksik ya da bozuksa `null`:
 * AI kapanır, sistem deterministik yoluyla çalışmaya devam eder.
 *
 * İki kimlik yolu:
 *  - Canlı: `GCP_SERVICE_ACCOUNT_JSON` (ham JSON, Vercel "Sensitive")
 *  - Yerel: `GOOGLE_APPLICATION_CREDENTIALS` (dosya yolu; ADC kendisi okur)
 * Dosya yolu Vercel'de çalışmaz — `gcp-key.json` gitignore'da, deploy'a gitmez.
 */
export function vertexYapilandirmasi(
  env: Record<string, string | undefined> = process.env,
): VertexYapilandirmasi | null {
  // Otomatik kapanış (ai-kapanis.ts): tarih geçtiyse anahtar hiç kullanılmaz.
  if (aiKapanisAktif(new Date(), env)) return null
  const project = env.GCP_PROJECT_ID?.trim()
  if (!project) return null
  const location = env.GCP_LOCATION?.trim() || VARSAYILAN_KONUM

  const hamJson = env.GCP_SERVICE_ACCOUNT_JSON?.trim()
  if (hamJson) {
    let aday: unknown
    try {
      aday = JSON.parse(hamJson)
    } catch {
      return null // bozuk JSON — içeriği ASLA loglama
    }
    const sonuc = ServisHesabiSemasi.safeParse(aday)
    if (!sonuc.success) return null // hata mesajı bile loglanmıyor: değer sızdırabilir
    return {
      project,
      location,
      googleAuthOptions: { credentials: sonuc.data as Record<string, unknown> },
      kimlikKaynagi: 'env-json',
    }
  }

  if (env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    return { project, location, googleAuthOptions: {}, kimlikKaynagi: 'adc' }
  }
  return null
}

/** AI kullanılabilir mi (ağa çıkmadan, ücretsiz kontrol). */
export function aiKullanilabilir(): boolean {
  return vertexYapilandirmasi() !== null
}

// ───────────────────────────── frenler ve süreler ─────────────────────────────

/** Bu kadar NİHAİ hatadan sonra o operasyon o gün tamamen kapanır (devre kesici). */
const MAX_GUNLUK_HATA = 8

/** Çağrı başına varsayılan toplam süre (yeniden denemeler DAHİL). */
const VARSAYILAN_TOPLAM_SURE_MS = 30_000

/** Log yazımı için üst sınır — log BEKLENİR ama AI turunu kilitleyemez. */
const LOG_YAZMA_TAVANI_MS = 3_000

/**
 * SDK yerleşik yeniden deneme politikası — Google'ın önerisi: geçici aşırı yük
 * hatalarında (429/503) anında değil, üstel geri çekilme + jitter ile.
 * Kodlar SDK'nın kendi varsayılan kümesi; açıkça yazıldı ki değişirse fark edilsin.
 *
 * ⚠ SDK `retryOptions` VERİLMEZSE HİÇ yeniden denemiyor (kaynak: SDK
 * `apiCall` — `if (!retryOptions) return runFetch()`). Belgedeki "varsayılan 5"
 * yalnız `retryOptions` verilip `attempts` boş bırakılınca geçerli.
 *
 * `maxDelay` kısa tutuldu: SDK'nın bekleme süresi dış `abortSignal`'ı
 * dinlemiyor; uzun bir bekleme son tarihi o kadar aşabilirdi (en fazla 3 sn).
 */
export const YENIDEN_DENEME = {
  attempts: 3,
  initialDelay: 1,
  maxDelay: 3,
  expBase: 2,
  jitter: 1,
  httpStatusCodes: [408, 429, 500, 502, 503, 504],
}

// ───────────────────────────── hata sınıflandırma ─────────────────────────────

/** Bizim ürettiğimiz, kodu belli yanıt hataları. */
class YanitHatasi extends Error {
  constructor(
    readonly kod: 'empty' | 'parse' | 'schema',
    mesaj: string,
  ) {
    super(mesaj)
  }
}

/**
 * Hatayı `ai_generation_logs.error_code` için sınıflandırır.
 * SDK HTTP hatalarında `ApiError.status` taşır — mesajda regex aramaya gerek yok.
 */
export function hataKodu(err: unknown): string {
  if (err instanceof ApiError) return String(err.status)
  if (err instanceof YanitHatasi) return err.kod
  // ⚠ `instanceof Error` DEĞİL, `name` alanı: `AbortSignal.timeout()` bir
  // DOMException fırlatır ve DOMException her ortamda Error'dan türemiyor
  // (test ortamında türemediği ölçüldü). Ortama bağlı bir kontrol, zaman
  // aşımlarını sessizce "unknown" olarak loglardı.
  const ad = typeof err === 'object' && err !== null ? (err as { name?: unknown }).name : undefined
  if (ad === 'TimeoutError' || ad === 'AbortError') return 'timeout'
  return 'unknown'
}

// ───────────────────────────── şema dönüşümü ─────────────────────────────

const jsonSemaOnbellegi = new WeakMap<z.ZodType, Record<string, unknown>>()

/**
 * Modele GÖNDERİLMEYEN JSON Schema anahtarları.
 *
 * 🔴 ÖLÇÜLDÜ (2026-09-19): zod'dan birebir türetilen katalog şeması (iç içe
 * dizilerde `maxItems` + dizgilerde `maxLength` + sayılarda `minimum/maximum`)
 * Vertex'ten **400 — "The specified schema produces a constraint that has too
 * many states"** aldı. Gemini kısıtlı çözümlemede (constrained decoding) her
 * uzunluk/adet sınırını bir durum makinesine çeviriyor; birleşimleri patlıyor.
 *
 * Çözüm iki katman: modele yalnız YAPI + ENUM + zorunlu alanlar gider (yanıtın
 * şeklini garanti eden kısım); uzunluk/adet/aralık sınırları çalışma anında zod
 * ile, kırpma ise aşağı akışta (TS eşlemesi ve SQL `left()`/`least()`) uygulanır.
 * `z.int()`'in ürettiği 2^53−1 `maximum`'u da bu yüzden atılıyor.
 */
const MODELE_GITMEYEN_ANAHTARLAR = new Set([
  '$schema',
  'maxLength',
  'minLength',
  'maxItems',
  'maximum',
  'exclusiveMaximum',
  'exclusiveMinimum',
  'pattern',
  'format',
])

function modeleUygunla(dugum: unknown): unknown {
  if (Array.isArray(dugum)) return dugum.map(modeleUygunla)
  if (typeof dugum !== 'object' || dugum === null) return dugum
  const cikti: Record<string, unknown> = {}
  for (const [anahtar, deger] of Object.entries(dugum)) {
    if (MODELE_GITMEYEN_ANAHTARLAR.has(anahtar)) continue
    cikti[anahtar] = modeleUygunla(deger)
  }
  return cikti
}

/**
 * zod şemasını Gemini `responseJsonSchema`'ya çevirir: YAPI + ENUM + zorunlu
 * alanlar kalır, uzunluk/adet/aralık sınırları atılır (bkz. yukarıdaki ölçüm).
 * Aynı zod şeması çalışma anında TAM sınırlarıyla doğrulamaya devam eder.
 * Şema başına bir kez hesaplanır.
 */
export function geminiJsonSemasi(sema: z.ZodType): Record<string, unknown> {
  const onbellekte = jsonSemaOnbellegi.get(sema)
  if (onbellekte) return onbellekte
  const json = modeleUygunla(z.toJSONSchema(sema)) as Record<string, unknown>
  jsonSemaOnbellegi.set(sema, json)
  return json
}

/** Vertex etiket kuralları: küçük harf/rakam/`_`/`-`, en fazla 63 karakter. */
function etiketDegeri(ham: string): string {
  return ham.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 63) || 'bilinmiyor'
}

// ───────────────────────────── çağrı ─────────────────────────────

export interface VertexJsonIstek<S extends z.ZodType> {
  /** `ai_generation_logs.feature` + kota sayacı anahtarı + faturalama etiketi. */
  feature: string
  model: AiModel
  /** Prompt şablonu sürümü — çıktı kalitesi değişince hangi sürümdü, izlenebilsin. */
  promptVersion: string
  prompt: string
  /** Çıktı şemasının TEK kaynağı: modele JSON Schema olarak gider, yanıtı da doğrular. */
  sema: S
  /** Çıktı token tavanı (maliyet freni). */
  maxOutputTokens: number
  /** Bu operasyon için günlük çağrı tavanı. */
  gunlukTavan: number
  /** Loga yazılır; kullanıcıya özel olmayan işlerde boş bırakılır. */
  userId?: string
  /**
   * Düşünme bütçesi. Varsayılan 0 (kapalı).
   * ⚠ ÖLÇÜLDÜ (2026-09-18): düşünme token'ları `maxOutputTokens`'tan harcanıyor
   * — açıkken JSON yanıt yarıda kesiliyordu ("Unterminated string in JSON").
   */
  thinkingBudget?: number
  /** Yeniden denemeler DAHİL toplam süre. Süre dolunca istek iptal edilir. */
  timeoutMs?: number
  /** Tek bir HTTP denemesinin süresi. Varsayılan: toplam süre (tek deneme hakkı). */
  denemeZamanAsimiMs?: number
  /** Ham yanıtı loga yaz (varsayılan: yaz). Büyük çıktılarda kapatılır. */
  payloadLogla?: boolean
}

export interface VertexJsonSonuc<T> {
  data: T
  promptTokens: number
  outputTokens: number
  cachedTokens: number
  latencyMs: number
  /** HTTP deneme sayısı (SDK yeniden denemeleri dahil). */
  attempts: number
}

/**
 * Yapısal JSON üreten tek Vertex çağrısı. Frenler + yeniden deneme + loglama dahil.
 *
 * @returns Sonuç, ya da `null` — AI kapalı / kota dolu / devre kesik / hata.
 *          `null` HATA DEĞİLDİR: çağıran deterministik yoluna düşmelidir.
 */
export async function callVertexJson<S extends z.ZodType>(
  istek: VertexJsonIstek<S>,
): Promise<VertexJsonSonuc<z.infer<S>> | null> {
  // 1. KİMLİK FRENİ — yapılandırma yoksa/bozuksa hiç network'e çıkma.
  const yapilandirma = vertexYapilandirmasi()
  if (!yapilandirma) return null

  const supabase = await createServiceClient()

  // Prompt'un KENDİSİ loglanmaz — yalnız özeti (kullanıcı kütüphanesi log
  // tablosuna kopyalanmasın; aynı girdinin tekrarı yine de görülebilsin).
  const inputHash = createHash('sha256').update(istek.prompt).digest('hex')

  /**
   * Log yazımı BEKLENİR (serverless'te yanıt sonrası süreç dondurulur; beklenmeyen
   * yazma kaybolurdu) ama kendi tavanıyla — yavaş bir log AI turunu kilitleyemez.
   */
  const logla = async (
    status: 'success' | 'error' | 'fallback_triggered',
    a: {
      promptTokens?: number
      outputTokens?: number
      cachedTokens?: number
      latencyMs?: number
      attempts?: number
      error?: string
      errorCode?: string
      modelVersion?: string
      payload?: unknown
    },
  ): Promise<void> => {
    const yazma = supabase
      .rpc('ai_log_generation', {
        p_feature: istek.feature,
        p_model: istek.model,
        p_prompt_version: istek.promptVersion,
        p_input_hash: inputHash,
        p_prompt_tokens: a.promptTokens ?? 0,
        p_output_tokens: a.outputTokens ?? 0,
        p_latency_ms: a.latencyMs ?? 0,
        p_status: status,
        // `undefined` (null DEĞİL): DEFAULT'lu argümanlar üretilen tipte opsiyonel.
        p_user_id: istek.userId ?? undefined,
        p_error_message: a.error ?? undefined,
        p_output_payload: a.payload === undefined ? undefined : (a.payload as never),
        p_cached_tokens: a.cachedTokens ?? 0,
        p_attempts: a.attempts ?? 1,
        p_error_code: a.errorCode ?? undefined,
        p_model_version: a.modelVersion ?? undefined,
      })
      .then(
        ({ error }) => (error ? `rpc: ${error.message}` : null),
        (err: unknown) => `throw: ${err instanceof Error ? err.message : String(err)}`,
      )

    /*
     * 🔴 SESSİZ LOG KAYBI (ÖLÇÜLDÜ, 2026-09-20).
     *
     * `ai_usage_counter` 2026-09-20 turunda 12 mood çağrısı saydı (ve bir
     * hata), yani AI GERÇEKTEN çalıştı; ama `ai_generation_logs`'ta o güne
     * ait TEK SATIR yoktu. Aynı durum 2026-09-19 02:30 turunda da var —
     * o günün logları yalnız elle tetiklenen koşumlardan geliyor. Yani:
     * **cron bağlamında log yazımı düşüyor ve bu tamamen görünmez.**
     *
     * Eski kod iki sonucu da yutuyordu: `.then(() => undefined, () => undefined)`
     * hem RPC hatasını hem fırlatmayı siliyordu, `Promise.race` de 3 sn'de
     * sessizce devam ediyordu. Yani "log yazıldı" ile "log kayboldu" ayırt
     * EDİLEMİYORDU — ölçüme güvenilen bir sistemde en kötü hata sınıfı.
     *
     * Sebep hâlâ bilinmiyor (yerelde aynı RPC service_role ile 200 dönüyor).
     * Bu yüzden burada sebep TAHMİN EDİLMİYOR, yalnız GÖRÜNÜR yapılıyor:
     * hata da zaman aşımı da `system_logs`'a yazılır. Bir sonraki cron turu
     * sebebi kendi kaydıyla söyleyecek.
     */
    const AŞIM = Symbol('log-yazma-asimi')
    const sonuc = await Promise.race([
      yazma,
      new Promise<typeof AŞIM>((resolve) => setTimeout(() => resolve(AŞIM), LOG_YAZMA_TAVANI_MS).unref?.()),
    ])

    if (sonuc === AŞIM) {
      void systemLog({
        operation: istek.feature,
        userId: istek.userId,
        severity: 'warn',
        errorMessage: `ai_generation_logs yazimi ${LOG_YAZMA_TAVANI_MS} ms icinde bitmedi (status=${status}) — kayit KAYBOLMUS olabilir`,
      })
    } else if (typeof sonuc === 'string') {
      void systemLog({
        operation: istek.feature,
        userId: istek.userId,
        severity: 'warn',
        errorMessage: `ai_generation_logs yazilamadi (status=${status}): ${sonuc}`,
      })
    }
  }

  // 2. DEVRE KESİCİ — bugün çok NİHAİ hata aldıysak hiç deneme.
  try {
    const { data: hataSayisi } = await supabase.rpc('ai_gunluk_hata_sayisi', { p_operation: istek.feature })
    if (typeof hataSayisi === 'number' && hataSayisi >= MAX_GUNLUK_HATA) return null
  } catch {
    return null // sayaç okunamıyorsa AI'ı çalıştırma — kota güvenliği öncelikli
  }

  // 3. KOTA FRENİ — kalıcı (DB) günlük tavan, MANTIKSAL çağrı başına bir kez.
  // (SDK'nın yeniden denemeleri ayrıca düşülmez: 429 reddi faturalanmaz.)
  try {
    const { data: kotaVar } = await supabase.rpc('ai_kota_tuket', {
      p_operation: istek.feature,
      p_gunluk_tavan: istek.gunlukTavan,
    })
    if (kotaVar !== true) {
      void systemLog({
        operation: istek.feature,
        severity: 'warn',
        errorMessage: `Günlük AI çağrı tavanı (${istek.gunlukTavan}) doldu — deterministik yola düşülüyor`,
      })
      await logla('fallback_triggered', { error: `kota tavani ${istek.gunlukTavan} doldu`, errorCode: 'quota' })
      return null
    }
  } catch {
    return null
  }

  const toplamSure = Math.max(istek.timeoutMs ?? VARSAYILAN_TOPLAM_SURE_MS, 1_000)
  const denemeSuresi = Math.min(istek.denemeZamanAsimiMs ?? toplamSure, toplamSure)

  // HTTP deneme sayacı: SDK'nın yeniden denemeleri görünmez olmasın diye
  // `fetch` sarılıyor. Credential/gövde okunmuyor — yalnız sayılıyor.
  let denemeler = 0
  const sayanFetch: typeof fetch = (girdi, init) => {
    denemeler += 1
    return fetch(girdi, init)
  }

  const baslangic = Date.now()
  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: yapilandirma.project,
      location: yapilandirma.location,
      googleAuthOptions: yapilandirma.googleAuthOptions,
    })

    const response = await ai.models.generateContent({
      model: istek.model,
      contents: istek.prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: geminiJsonSemasi(istek.sema),
        // 4. ÇIKTI TAVANI — model uzun metin üretip maliyeti şişiremez.
        maxOutputTokens: istek.maxOutputTokens,
        thinkingConfig: { thinkingBudget: istek.thinkingBudget ?? 0 },
        labels: { rosso_feature: etiketDegeri(istek.feature), rosso_prompt: etiketDegeri(istek.promptVersion) },
        abortSignal: AbortSignal.timeout(toplamSure),
        httpOptions: { timeout: denemeSuresi, retryOptions: YENIDEN_DENEME, fetch: sayanFetch },
      },
    })

    const latencyMs = Date.now() - baslangic
    const kullanim = response.usageMetadata
    const promptTokens = kullanim?.promptTokenCount ?? 0
    const cachedTokens = kullanim?.cachedContentTokenCount ?? 0
    // Düşünme token'ları da faturalanır — çıktıya dahil sayılmalı.
    const outputTokens = (kullanim?.candidatesTokenCount ?? 0) + (kullanim?.thoughtsTokenCount ?? 0)

    const text = response.text
    if (!text) throw new YanitHatasi('empty', 'bos yanit')

    let ham: unknown
    try {
      ham = JSON.parse(text)
    } catch {
      throw new YanitHatasi('parse', 'yanit JSON degil')
    }

    const dogrulama = istek.sema.safeParse(ham)
    if (!dogrulama.success) {
      // Yalnız ilk sorunun YOLU loglanır — değer değil (kullanıcı verisi olabilir).
      const yol = dogrulama.error.issues[0]?.path.join('.') || '(kok)'
      throw new YanitHatasi('schema', `yanit semaya uymuyor: ${yol}`)
    }

    const attempts = Math.max(denemeler, 1)
    await logla('success', {
      promptTokens,
      outputTokens,
      cachedTokens,
      latencyMs,
      attempts,
      modelVersion: response.modelVersion,
      payload: istek.payloadLogla === false ? undefined : dogrulama.data,
    })

    return { data: dogrulama.data, promptTokens, outputTokens, cachedTokens, latencyMs, attempts }
  } catch (err) {
    const kod = hataKodu(err)
    const mesaj = err instanceof Error ? err.message : String(err)

    // Devre kesici yalnız NİHAİ başarısızlıkta artar — SDK'nın kurtardığı
    // 429'lar buraya hiç gelmez, yani yoğun bir gün AI'ı kapatmaz.
    try {
      await supabase.rpc('ai_hata_kaydet', { p_operation: istek.feature })
    } catch {
      /* sayaç yazılamadı — akışı etkilemez */
    }

    await logla('error', {
      latencyMs: Date.now() - baslangic,
      attempts: Math.max(denemeler, 1),
      error: mesaj,
      errorCode: kod,
    })
    void systemLog({
      operation: istek.feature,
      userId: istek.userId,
      severity: 'warn',
      // ⚠ credential hiçbir hata yoluna girmiyor.
      errorMessage: `[${kod}] ${mesaj}`,
    })
    return null
  }
}
