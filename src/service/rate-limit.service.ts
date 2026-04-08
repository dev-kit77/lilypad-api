import { redis } from 'bun'

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
export const RATE_LIMIT_MAX_REQUESTS = 120
const RATE_LIMIT_WINDOW_SECS = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)

export interface RateLimitResult {
    limited: boolean
    remaining: number
    resetAt: number
}

export const getClientIp = (request: Request) => {
    const xForwardedFor = request.headers.get('x-forwarded-for')
    if (xForwardedFor) {
        return xForwardedFor.split(',')[0]?.trim() ?? 'unknown'
    }

    const xRealIp = request.headers.get('x-real-ip')
    if (xRealIp) {
        return xRealIp.trim()
    }

    const cfConnectingIp = request.headers.get('cf-connecting-ip')
    if (cfConnectingIp) {
        return cfConnectingIp.trim()
    }

    return 'unknown'
}

const checkRateLimitInRedis = async (ip: string): Promise<RateLimitResult> => {
    const now = Date.now()
    const windowStart = Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS
    const resetAt = windowStart + RATE_LIMIT_WINDOW_MS
    const key = `ratelimit:ip:${ip}:${windowStart}`

    const count = await redis.incr(key)
    if (count === 1) {
        await redis.expire(key, RATE_LIMIT_WINDOW_SECS)
    }

    return {
        limited: count > RATE_LIMIT_MAX_REQUESTS,
        remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - count),
        resetAt,
    }
}

export const checkRateLimit = async (ip: string): Promise<RateLimitResult> => {
    try {
        return await checkRateLimitInRedis(ip)
    } catch {
        // For the time being we allow all requests if Redis is unavailable.
        // This can be improved in the next project iteration
        const resetAt = Date.now() + RATE_LIMIT_WINDOW_MS
        return {
            limited: false,
            remaining: RATE_LIMIT_MAX_REQUESTS,
            resetAt,
        }
    }
}
