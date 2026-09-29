'use client'

import { createContext, useContext, useMemo, useState } from 'react'

interface SidebarContextValue {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  // `value` her render'da yeni obje olursa TÜM tüketiciler (dashboard-shell,
  // sidebar, her sayfa gövdesi — bu provider ağacın tepesinde) gereksiz
  // yere re-render olur; parent route değişince bile. Referans `collapsed`
  // değişmediği sürece sabit kalsın diye useMemo ile kilitlendi.
  const value = useMemo(() => ({ collapsed, setCollapsed }), [collapsed])
  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
