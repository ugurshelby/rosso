import type { Catalog } from '../types'
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

/** Türkçe sözlük. `Catalog` tipi İngilizce yapıyla birebir eşleşmeyi derlemede zorlar. */
export const tr: Catalog = {
  common, nav, lock, quickStart, onboarding,
  dashboard, taste, playlists, settings, automations, data, mood,
  catalog, shared, history, journey, recap, auth,
}
