import { config } from 'dotenv'
import { afterEach, vi } from 'vitest'

vi.mock('server-only', () => ({}))
import { cleanup } from '@testing-library/react'

import '@testing-library/jest-dom/vitest'

config({ path: '.env.local' })

// jsdom bu API'leri sağlamaz; CoverArt (IntersectionObserver) ve
// hover-capability kontrolü (matchMedia) kullanan bileşenler için gerekli.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null
    readonly rootMargin: string = ''
    readonly thresholds: ReadonlyArray<number> = []
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }
  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
}

if (typeof window !== 'undefined' && typeof window.matchMedia === 'undefined') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}

// jsdom `<dialog>`in modal API'sini uygulamıyor: `showModal`/`close` YOK,
// çağrılınca `TypeError: dialog.showModal is not a function` fırlıyor.
// `ActionMenu`in mobil alt sayfası native `<dialog>` kullanıyor (odak tuzağı
// ve Escape'i tarayıcı bedava veriyor — kendi kurgumuzu yazmaktan iyi), bu
// yüzden testte minimum bir karşılık gerekiyor.
//
// ⚠ Bu mock DAVRANIŞI taklit eder, doğrulamaz: `open` özniteliğini gerçekten
// açıp kapar ki `dialog.open` kontrolleri ve görünürlük iddiaları çalışsın.
// Gerçek odak tuzağı davranışı ancak tarayıcıda sınanır.
if (typeof HTMLDialogElement !== 'undefined') {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
    showModal: () => void
    show: () => void
    close: (returnValue?: string) => void
  }
  if (typeof proto.showModal !== 'function') {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
  }
  if (typeof proto.show !== 'function') {
    proto.show = function show(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
  }
  if (typeof proto.close !== 'function') {
    proto.close = function close(this: HTMLDialogElement, returnValue?: string) {
      this.removeAttribute('open')
      if (returnValue !== undefined) this.returnValue = returnValue
      // Gerçek `<dialog>` kapanınca `close` olayı yayar; `cancel`/`close`
      // dinleyen bileşenler testte de haber alsın.
      this.dispatchEvent(new Event('close'))
    }
  }
}

// Her testten sonra DOM'u temizle (RTL otomatik cleanup globals olmadan çalışmaz)
afterEach(() => {
  cleanup()
})
