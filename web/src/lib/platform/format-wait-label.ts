/** Spotify cooldown / rate-limit sürelerini kullanıcıya okunur biçimde yazar. */
export function formatWaitLabel(seconds: number): string {
  if (seconds < 90) return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`
  const mins = Math.round(seconds / 60)
  if (mins < 90) return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`
  const hours = Math.round(mins / 60)
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
}
