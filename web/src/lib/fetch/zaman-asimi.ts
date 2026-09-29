/**
 * Dış API çağrıları için zaman aşımı sabitleri — TEK doğruluk kaynağı.
 *
 * ─── Neden gerekli ──────────────────────────────────────────────────────
 * 2026-08-20 refine taramasında ölçüldü: 39 dış `fetch` çağrısının yalnız
 * 4'ünde zaman aşımı vardı. `maxDuration` da tanımlı değil, yani Vercel
 * varsayılanı **300 saniye** geçerli.
 *
 * Sonuç: Spotify/Google yanıt vermezse istek 5 dakika asılı kalır.
 * Kullanıcı boş ekrana bakar, fonksiyon o süre boyunca faturalanır ve
 * `try/catch` bunu YAKALAMAZ — hata yok, sadece bekleme var. Sessiz
 * kırığın en sinsi türü: log temiz, metrik temiz, kullanıcı bekliyor.
 *
 * ─── Neden tek dosya ────────────────────────────────────────────────────
 * Her çağrıya elle sayı yazmak zamanla birbirinden kopan değerler üretir
 * (aynı hata `algo_params` ve kalibrasyon sayılarında yaşandı). Süreler
 * burada, gerekçesiyle birlikte durur.
 *
 * ⚠ `AbortSignal.timeout()` `TimeoutError` adında bir `DOMException`
 * fırlatır — `catch` bloğu bunu ağ hatasından ayırmak isterse
 * `err.name === 'TimeoutError'` bakmalı.
 */

/**
 * Kimlik/token uçları — 8 saniye.
 *
 * Bu çağrılar kullanıcıyı BEKLETİR (giriş, token yenileme). Uzun tutmak
 * doğrudan algılanan yavaşlık demek. Spotify'ın token ucu sağlıklıyken
 * ~200-400ms yanıt veriyor; 8sn zaten 20 katı pay bırakıyor.
 */
export const ZAMAN_ASIMI_KIMLIK = 8_000

/**
 * Veri uçları (katalog, görsel, playlist içeriği) — 12 saniye.
 *
 * Kimlikten uzun: bu istekler daha büyük gövde döndürür ve çoğu arka
 * planda/akış içinde çalışır. Yine de sınırlı — takılan bir katalog
 * isteği tüm sayfayı bekletmemeli.
 */
export const ZAMAN_ASIMI_VERI = 12_000

/**
 * Yazma işlemleri (playlist oluştur/güncelle, kapak yükle) — 20 saniye.
 *
 * En uzun pay: kapak yükleme ham base64 JPEG gönderiyor ve Spotify
 * tarafında işleniyor. ⚠ Yazma isteğinde zaman aşımı, işlemin
 * SUNUCUDA TAMAMLANMADIĞI anlamına gelmez — yeniden denenirse çift
 * kayıt riski var. Bu yüzden yazma çağrılarında timeout'u yeniden
 * deneme ile birleştirme.
 */
export const ZAMAN_ASIMI_YAZMA = 20_000
