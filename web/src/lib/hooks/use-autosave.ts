'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type AutosaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'offline' | 'error'

export type AutosaveSaveResult = { ok: true } | { ok: false; error?: string }

export type AutosaveFlushResult = { ok: true } | { ok: false; error?: string; offline?: boolean }

export type UseAutosaveOptions<T> = {
  debounceMs?: number
  /** Adım/değer değişince baseline sıfırlanır (ör. sihirbaz adımı). */
  resetKey?: string | number
  getPayload: () => T
  isEqual?: (left: T, right: T) => boolean
  save: (payload: T) => Promise<AutosaveSaveResult>
  guardNavigation?: boolean
  /** Offline kuyruk — web pilot: localStorage. */
  queueKey?: string
  onSaved?: () => void
}

function defaultEqual<T>(left: T, right: T): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function readQueue<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeQueue<T>(key: string, payload: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(payload))
}

function clearQueue(key: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(key)
}

/**
 * Debounced autosave — autosave-rehberi.md 5 sütun (web pilot).
 * HTTP 200/201 gelmeden "Kaydedildi" gösterilmez.
 */
export function useAutosave<T>(options: UseAutosaveOptions<T>) {
  const {
    debounceMs = 1000,
    resetKey,
    getPayload,
    isEqual = defaultEqual,
    save,
    guardNavigation = false,
    queueKey,
    onSaved,
  } = options

  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const lastSavedRef = useRef(getPayload())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedHideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushInFlightRef = useRef<Promise<AutosaveFlushResult> | null>(null)

  // Seçenekleri ref'te tutmanın amacı: `flush`/`payloadDirty` her render'da
  // yeniden kurulmasın ama HER ZAMAN en güncel callback'i çağırsın.
  //
  // ⚠ Atama render gövdesinde yapılıyordu (`optionsRef.current = {...}`).
  // React bir render'ı atabilir veya iki kez koşabilir (StrictMode,
  // concurrent); ekrana ULAŞMAYAN bir render'ın değerleri ref'e yazılırsa
  // sonraki kayıt eski/yanlış `save`i çağırabilir. Yazma efektte yapılır —
  // efekt yalnız işlenen (committed) render'dan sonra koşar.
  const optionsRef = useRef({ getPayload, isEqual, save, queueKey, onSaved })
  useEffect(() => {
    optionsRef.current = { getPayload, isEqual, save, queueKey, onSaved }
  }, [getPayload, isEqual, save, queueKey, onSaved])

  const payloadDirty = useCallback(() => {
    const current = optionsRef.current.getPayload()
    return !optionsRef.current.isEqual(current, lastSavedRef.current)
  }, [])

  // `resetKey` değişimi = "başka bir kaydı düzenlemeye geçtik" (örn. farklı
  // profil). Bekleyen kaydetmeyi iptal edip durumu sıfırlamak ZORUNLU;
  // yoksa önceki formun "Kaydedildi"si yeni formda asılı kalır.
  useEffect(() => {
    lastSavedRef.current = optionsRef.current.getPayload()
    // Durum sıfırlama harici bir değişime (resetKey) tepkidir; sonraki tura
    // ertelemek eski durumu bir kare boyunca gösterirdi.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus('idle')
    setErrorMessage(null)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }, [resetKey])

  const flush = useCallback(async (): Promise<AutosaveFlushResult> => {
    if (flushInFlightRef.current) return flushInFlightRef.current

    const run = async (): Promise<AutosaveFlushResult> => {
      const { getPayload: read, isEqual: same, save: persist, queueKey: key, onSaved: saved } =
        optionsRef.current
      const payload = read()

      if (same(payload, lastSavedRef.current)) {
        setStatus('idle')
        return { ok: true }
      }

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        if (key) writeQueue(key, payload)
        setStatus('offline')
        setErrorMessage(null)
        return { ok: false, offline: true }
      }

      setStatus('saving')
      setErrorMessage(null)

      try {
        const result = await persist(payload)
        if (!result.ok) {
          const message = result.error ?? 'Kaydedilemedi, tekrar dene.'
          setStatus('error')
          setErrorMessage(message)
          return { ok: false, error: message }
        }

        lastSavedRef.current = payload
        if (key) clearQueue(key)
        setStatus('saved')
        saved?.()

        if (savedHideRef.current) clearTimeout(savedHideRef.current)
        savedHideRef.current = setTimeout(() => {
          setStatus((current) => (current === 'saved' ? 'idle' : current))
        }, 2000)

        return { ok: true }
      } catch {
        if (typeof navigator !== 'undefined' && navigator.onLine === false && key) {
          writeQueue(key, payload)
          setStatus('offline')
          setErrorMessage(null)
          return { ok: false, offline: true }
        }
        const message = 'Bağlantı hatası — tekrar dene.'
        setStatus('error')
        setErrorMessage(message)
        return { ok: false, error: message }
      }
    }

    const pending = run().finally(() => {
      flushInFlightRef.current = null
    })
    flushInFlightRef.current = pending
    return pending
  }, [])

  const scheduleSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!payloadDirty()) {
      setStatus('idle')
      return
    }

    setStatus('dirty')
    debounceRef.current = setTimeout(() => {
      void flush()
    }, debounceMs)
  }, [debounceMs, flush, payloadDirty])

  const markDirty = scheduleSave

  useEffect(() => {
    if (!guardNavigation) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (payloadDirty() || status === 'dirty' || status === 'saving') {
        event.preventDefault()
        event.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [guardNavigation, payloadDirty, status])

  useEffect(() => {
    if (!queueKey) return

    const onOnline = () => {
      const queued = readQueue<T>(queueKey)
      if (!queued) return
      void flush()
    }

    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [queueKey, flush])

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (savedHideRef.current) clearTimeout(savedHideRef.current)
    },
    [],
  )

  return {
    status,
    errorMessage,
    scheduleSave,
    markDirty,
    flush,
    /* `isDirty` formun ANLIK hâlini bildirir ("kaydedilmemiş değişiklik var
       mı?"). Kaynağı zaten çağıranın kendi state'i; `lastSavedRef` yalnız son
       kaydedilen kopyayı tutar. State'e kopyalamak iki gerçek kaynağı senkron
       tutmayı gerektirir ve her tuş vuruşunda fazladan render doğurur. Değer
       her render'da yeniden hesaplandığı için bayatlamaz. */
    // eslint-disable-next-line react-hooks/refs
    isDirty: payloadDirty(),
  }
}
