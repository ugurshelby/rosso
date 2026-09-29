/** fetch iptali — AbortController cleanup sonrası gelen hataları ayırır. */
export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true
  if (error instanceof Error && error.name === 'AbortError') return true
  return false
}
