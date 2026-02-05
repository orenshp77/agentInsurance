// Simple in-memory rate limiter for API protection

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map()
  private readonly windowMs: number
  private readonly maxRequests: number

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests

    // Clean up expired entries every minute
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 60000)
    }
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key)
      }
    }
  }

  isRateLimited(identifier: string): { limited: boolean; remaining: number; resetIn: number } {
    const now = Date.now()
    const entry = this.requests.get(identifier)

    if (!entry || now > entry.resetTime) {
      // New window
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      })
      return { limited: false, remaining: this.maxRequests - 1, resetIn: this.windowMs }
    }

    if (entry.count >= this.maxRequests) {
      return {
        limited: true,
        remaining: 0,
        resetIn: entry.resetTime - now
      }
    }

    entry.count++
    return {
      limited: false,
      remaining: this.maxRequests - entry.count,
      resetIn: entry.resetTime - now
    }
  }
}

// Different limiters for different endpoints
export const apiLimiter = new RateLimiter(60000, 100) // 100 requests per minute for general API
export const authLimiter = new RateLimiter(900000, 10) // 10 requests per 15 minutes for auth
export const uploadLimiter = new RateLimiter(60000, 20) // 20 uploads per minute
export const logsLimiter = new RateLimiter(60000, 60) // 60 log submissions per minute

export function getClientIdentifier(request: Request): string {
  // Try to get real IP from various headers (for proxied environments like Cloud Run)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIp) {
    return realIp
  }
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  return 'unknown'
}
