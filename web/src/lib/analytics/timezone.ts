import 'server-only'

/**
 * Dinleme analizinde saat/gün her zaman kullanıcının yerel saatiyle (Türkiye)
 * yorumlanmalı. Sunucu UTC'de çalıştığı için `new Date(...).getHours()` /
 * `getUTCHours()` yanlış sonuç verir (peak saat 3 saat kayar, gece dinlemeleri
 * yanlış güne düşer). Bu yardımcılar tek bir referans saat dilimini uygular.
 *
 * Ankara = İstanbul saat dilimi (Europe/Istanbul, UTC+3, DST yok). İleride
 * kullanıcı profilinden okunabilir; şimdilik Türkiye kullanıcıları için sabit.
 */
const LISTENING_TIME_ZONE = 'Europe/Istanbul'

// getHours/getUTCHours yerine Intl kullanılır — DST ve tarih atlamalarını
// doğru yönetir, sunucu saat diliminden bağımsızdır.
const hourFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: LISTENING_TIME_ZONE,
  hour: '2-digit',
  hour12: false,
})

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: LISTENING_TIME_ZONE,
  weekday: 'short',
})

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: LISTENING_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const yearFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: LISTENING_TIME_ZONE,
  year: 'numeric',
})

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

/** Saat 0-23, Europe/Istanbul. `hour12:false` bazı ortamlarda "24" döndürür → 0'a indir. */
export function localHour(playedAt: string | Date): number {
  const h = parseInt(hourFormatter.format(new Date(playedAt)), 10)
  return h === 24 ? 0 : h
}

/** Haftanın günü 0=Pazar … 6=Cumartesi, Europe/Istanbul. */
export function localWeekday(playedAt: string | Date): number {
  return WEEKDAY_INDEX[weekdayFormatter.format(new Date(playedAt))] ?? 0
}

/** Gün anahtarı "YYYY-MM-DD" (streak hesabı için), Europe/Istanbul. */
export function localDayKey(playedAt: string | Date): string {
  return dayKeyFormatter.format(new Date(playedAt))
}

/** Yıl (dönemsel analiz için), Europe/Istanbul. */
export function localYear(playedAt: string | Date): number {
  return parseInt(yearFormatter.format(new Date(playedAt)), 10)
}
