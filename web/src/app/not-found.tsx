import Link from 'next/link'
// Stiller globals.css'te (.status-page*) — bkz. (dashboard)/error.tsx notu (2026-09-24).

/*
  Not: design-components/404-screen.css (retro TV illüstrasyonu) KULLANILMADI —
  sonsuz CRT statik animasyonu (animation: b infinite) design.md §7
  "sürekli pulse/dönen element yasak" + "dekoratif animasyon yasağı" ile çelişiyor.
  Bunun yerine design.md ile uyumlu sade durum sayfası (empty-state estetiği).
*/
export default function NotFound() {
  return (
    <div className="status-page">
      <span className="status-page__code">404</span>
      <h1 className="status-page__title">This page isn’t here</h1>
      <p className="status-page__description">
        The link you followed may have moved, or it may never have existed.
      </p>

      {/*
        ⚠ Birincil hedef `/` — `/dashboard` DEĞİL (düzeltildi 2026-08-21).
        Buton "Back to home" diyordu ama dashboard'a gidiyordu: giriş
        yapmamış biri (örn. aramadan gelen ziyaretçi) oradan `/login`'e
        düşüyordu. Etiketle hedef arasındaki bu uyuşmazlık, 404'ü ikinci
        bir çıkmaz sokak yapıyordu.
      */}
      <Link href="/" className="status-page__cta">
        Back to home
      </Link>

      <nav className="status-page__alt-links" aria-label="Other pages">
        <Link href="/login">Sign in</Link>
        <Link href="/help">Help</Link>
        <Link href="/privacy">Privacy</Link>
      </nav>
    </div>
  )
}
