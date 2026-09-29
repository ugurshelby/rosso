import 'server-only'

import { parseServerEnv, type ServerEnv } from './env'

/** Server-only environment variables. Never import from client components. */
export const serverEnv: ServerEnv = parseServerEnv(process.env)
