import 'server-only'

export {
  checkRateLimit,
  resetRateLimit,
  backoffDelayMs,
  rateLimitRetryAfterSeconds,
  LOGIN_RATE_LIMIT,
  AUTH_API_IP_LIMIT,
  AUTH_CALLBACK_IP_LIMIT,
  PAHALI_URETIM_LIMIT,
  _clearAllRateLimits,
  type RateLimitResult,
} from './rate-limit-core'
