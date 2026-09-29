import { common } from './common'
import { nav } from './nav'
import { lock } from './lock'
import { quickStart } from './quick-start'
import { onboarding } from './onboarding'
import { dashboard } from './dashboard'
import { taste } from './taste'
import { playlists } from './playlists'
import { settings } from './settings'
import { automations } from './automations'
import { data } from './data'
import { mood } from './mood'
import { catalog } from './catalog'
import { shared } from './shared'
import { history } from './history'
import { journey } from './journey'
import { recap } from './recap'
import { auth } from './auth'

/**
 * İngilizce sözlük — TEK DOĞRULUK KAYNAĞI. Yeni bir yüzey eklerken:
 *   1) `en/<yuzey>.ts` oluştur ve buraya ekle,
 *   2) `tr/<yuzey>.ts` oluştur (tip, eksik anahtarı derleme hatası yapar),
 *   3) `tr/index.ts`'e ekle.
 * Her yüzeyin ayrı dosyası olması, iki agent'ın aynı dosyada çakışmasını önler.
 */
export const en = {
  common, nav, lock, quickStart, onboarding,
  dashboard, taste, playlists, settings, automations, data, mood,
  catalog, shared, history, journey, recap, auth,
} as const
