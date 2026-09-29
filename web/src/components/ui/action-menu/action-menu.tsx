'use client'

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'
import { useFinePointer } from '@/lib/hooks/use-fine-pointer'
import { useLongPress } from '@/lib/hooks/use-long-press'
import { computeMenuPlacement } from './placement'
import { BottomSheet, MenuItems } from './menu-items'
import type { ActionMenuTriggerProps, MenuAction } from './types'
import styles from './action-menu.module.css'

export type ActionMenuProps = {
  actions: MenuAction[]
  triggerLabel: string
  sheetTitle?: string
  enableLongPress?: boolean
  className?: string
  children?: (props: ActionMenuTriggerProps) => React.ReactNode
}

/**
 * Açık olan tek menünün "kapan" çağrısı.
 *
 * ⚠ Neden modül düzeyinde: her `ActionMenu` kendi `open` durumunu tutuyor ve
 * kardeşlerinden habersiz. Bir satırın menüsü açıkken başka bir satırın
 * üç noktasına basılınca İKİSİ BİRDEN açık kalıyordu (ölçüldü — testin adı
 * "bildirilen bug"). Dış tıklama dinleyicisi de yakalamıyor, çünkü tıklama
 * diğer menünün tetikleyicisinin İÇİNDE.
 *
 * Context yerine modül değişkeni: menüler ağaçta herhangi bir yerde olabilir
 * (portal'a da çıkıyorlar) ve ortak bir sağlayıcı zorunlu kılmak her kullanım
 * yerini değiştirmek demekti. Aynı anda yalnız bir menü açık olduğu için tek
 * referans yeterli.
 */
let acikMenuyuKapat: (() => void) | null = null

/**
 * Tek `MenuAction[]` kaynağı — masaüstünde collision-aware popover,
 * dokunmatikte bottom sheet. context-menu-rehberi.md
 */
export function ActionMenu({
  actions,
  triggerLabel,
  sheetTitle,
  enableLongPress = false,
  className,
  children,
}: ActionMenuProps) {
  const finePointer = useFinePointer()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const [placement, setPlacement] = useState({ top: 0, left: 0, maxHeight: 320 })

  // `createPortal` yalnız istemcide çalışabilir (sunucuda `document` yok).
  // `useEffect(() => setMounted(true))` yaygın çözümdür ama efekt içinde
  // senkron `setState` demektir — fazladan bir render turu tetikler ve
  // `react-hooks/set-state-in-effect` bunu haklı olarak yakalar.
  // `useSyncExternalStore` aynı bilgiyi render sırasında, ek tur olmadan
  // verir: sunucuda `false`, istemcide `true`.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  /** Odağı geri vermeden kapat — başkası açılırken odak ONA gitmeli. */
  const closeSilently = useCallback(() => setOpen(false), [])

  const openMenu = useCallback(() => {
    // Başka bir menü açıksa önce onu kapat (aynı anda tek menü).
    //
    // ⚠ Kaydı BURADA yapmıyoruz. React 18+ toplu güncellemede kardeşin
    // `setOpen(false)`ı ile bizim `setOpen(true)`umuz aynı turda işlenir;
    // kardeşin `open` efekti sonradan koşup HENÜZ KAYDETTİĞİMİZ referansı
    // siliyordu (ölçüldü: iki menü de `aria-expanded="true"` kalıyordu).
    // Kayıt, `open` gerçekten true olduktan sonra efektte yapılır.
    if (acikMenuyuKapat && acikMenuyuKapat !== closeSilently) acikMenuyuKapat()
    setOpen(true)
  }, [closeSilently])

  // Küresel "açık menü" referansını `open` durumuyla senkron tut.
  useEffect(() => {
    if (open) {
      acikMenuyuKapat = closeSilently
      return () => {
        if (acikMenuyuKapat === closeSilently) acikMenuyuKapat = null
      }
    }
    // Kapalıyken referans bizdeyse bırak — kapalı menünün `close`u asılı
    // kalmasın.
    if (acikMenuyuKapat === closeSilently) acikMenuyuKapat = null
    return undefined
  }, [open, closeSilently])

  const longPressHandlers = useLongPress({
    enabled: enableLongPress && !finePointer,
    onLongPress: openMenu,
  })

  const updatePlacement = useCallback(() => {
    if (!triggerRef.current || !panelRef.current) return
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const panelRect = panelRef.current.getBoundingClientRect()
    setPlacement(
      computeMenuPlacement(
        triggerRect,
        panelRect.width || 220,
        panelRect.height || Math.min(actions.length * 44, 280),
      ),
    )
  }, [actions.length])

  useLayoutEffect(() => {
    if (!open || !finePointer) return
    updatePlacement()
  }, [open, finePointer, updatePlacement, actions])

  useEffect(() => {
    if (!open || !finePointer) return
    window.addEventListener('resize', updatePlacement)
    window.addEventListener('scroll', updatePlacement, true)
    return () => {
      window.removeEventListener('resize', updatePlacement)
      window.removeEventListener('scroll', updatePlacement, true)
    }
  }, [open, finePointer, updatePlacement])

  // Dış tıklama YALNIZ popover için anlamlı: alt sayfa kendi arka planına
  // tıklamayı `menu-items.tsx` içinde zaten ele alıyor.
  useEffect(() => {
    if (!open || !finePointer) return

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node
      if (panelRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      close()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [open, finePointer, close])

  // ⚠ Escape işaretçi türünden BAĞIMSIZ olmalı. Önceden bu dinleyici de
  // `finePointer` şartının içindeydi; dokunmatik olarak algılanan bir cihazda
  // (tablet + klavye, hibrit dizüstü, `hover: none` raporlayan tarayıcı) menü
  // açıkken Escape hiçbir şey yapmıyordu — klavye kullanıcısı menüde kilitli
  // kalıyordu. Alt sayfa `<dialog>` native `cancel` olayı da veriyor ama o
  // yalnız odak dialog'un İÇİNDEYKEN gelir; tetikleyici hâlâ odaktaysa gelmez.
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  const handleTriggerClick = () => {
    // Masaüstünde aynı tetikleyici açar/kapar; dokunmatikte yalnız açar.
    // Her iki yolda da AÇILIŞ `openMenu`den geçmeli — kardeş menüyü kapatan
    // koordinasyon orada.
    if (finePointer && open) close()
    else openMenu()
  }

  const handleSelect = (action: MenuAction) => {
    if (action.kind === 'meta' || action.disabled) return
    close()
    action.onSelect?.()
  }

  const triggerProps: ActionMenuTriggerProps = {
    ref: triggerRef,
    onClick: handleTriggerClick,
    'aria-expanded': open,
    'aria-haspopup': 'menu',
    'aria-controls': open && finePointer ? menuId : undefined,
    'aria-label': triggerLabel,
    longPressHandlers,
  }

  const popover =
    open && finePointer && mounted
      ? createPortal(
          <div
            ref={panelRef}
            id={menuId}
            className={styles.panel}
            style={{
              top: placement.top,
              left: placement.left,
              maxHeight: placement.maxHeight,
            }}
          >
            <MenuItems actions={actions} onSelect={handleSelect} onClose={close} />
          </div>,
          document.body,
        )
      : null

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      {children ? (
        /* `triggerProps.ref` ref NESNESİNİ taşır; `.current` render sırasında
           OKUNMUYOR — kural ikisini ayırt edemiyor. Ref'i çağrı yerine vermek
           bu bileşenin sözleşmesi (tetikleyiciyi kullanan taraf çiziyor);
           kaldırmak konumlandırmayı ve odak dönüşünü bozardı. */
        // eslint-disable-next-line react-hooks/refs
        children(triggerProps)
      ) : (
        <button
          type="button"
          ref={triggerRef}
          className={styles.trigger}
          onClick={handleTriggerClick}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={open && finePointer ? menuId : undefined}
          aria-label={triggerLabel}
          {...longPressHandlers}
        >
          <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
        </button>
      )}

      {popover}

      {!finePointer && (
        <BottomSheet open={open} onClose={close} title={sheetTitle ?? triggerLabel}>
          <MenuItems actions={actions} onSelect={handleSelect} onClose={close} variant="sheet" />
        </BottomSheet>
      )}
    </div>
  )
}
