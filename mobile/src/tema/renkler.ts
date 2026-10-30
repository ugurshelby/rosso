// ÜRETİLDİ: scripts/tokenlari-uret.mjs — elle düzenleme. Kaynak: web/src/app/globals.css

export const renk = {
  zemin: '#0a0910', // --bg
  yuzey0: '#0a0910', // --elev-0
  yuzey1: '#171521', // --elev-1
  yuzey2: '#232031', // --elev-2
  yuzey3: '#302b42', // --elev-3
  kenar1: '#2a2637', // --edge-1
  kenar2: '#383348', // --edge-2
  kenar3: '#47405b', // --edge-3
  metin: '#f4f4f5', // --text
  sonuk: '#a5a0b5', // --muted
  silik: '#9791b2', // --faint
  vurgu: '#7c5cff', // --accent
  vurguBasili: '#9d84ff', // --accent-hover
  vurguUstu: '#0a0910', // --on-accent
  parilti: '#625cff40', // --glow
  basari: '#00bc7c', // --color-success
  uyari: '#e59f23', // --color-warning
  hata: '#f04244', // --color-error
  hataUstu: '#0a0910', // --on-error
  spotify: '#1db954', // --color-spotify
} as const

export type RenkAdi = keyof typeof renk
