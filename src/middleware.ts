import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiting for middleware
// Note: For production with multiple instances, use Redis-based rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const WINDOW_MS = 60000 // 1 minute
const MAX_REQUESTS_API = 100 // General API limit
const MAX_REQUESTS_AUTH = 10 // Auth endpoints (per 15 min window)
const AUTH_WINDOW_MS = 900000 // 15 minutes

function getRateLimitConfig(pathname: string): { windowMs: number; maxRequests: number } | null {
  // Skip rate limiting for auth session/error pages (they're not login attempts)
  if (pathname === '/api/auth/session' ||
      pathname === '/api/auth/error' ||
      pathname === '/api/auth/providers' ||
      pathname === '/api/auth/csrf') {
    return null // No rate limiting
  }

  // Strict rate limiting only for actual login attempts
  if (pathname.includes('/api/auth/callback') || pathname.includes('/api/auth/signin')) {
    return { windowMs: AUTH_WINDOW_MS, maxRequests: MAX_REQUESTS_AUTH }
  }

  return { windowMs: WINDOW_MS, maxRequests: MAX_REQUESTS_API }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIp) {
    return realIp
  }

  return 'unknown'
}

function checkRateLimit(
  identifier: string,
  windowMs: number,
  maxRequests: number
): { limited: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(identifier)

  // Clean up old entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key)
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return { limited: false, remaining: maxRequests - 1 }
  }

  if (entry.count >= maxRequests) {
    return { limited: true, remaining: 0 }
  }

  entry.count++
  return { limited: false, remaining: maxRequests - entry.count }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Add security headers to all responses (including non-API routes)
  if (!pathname.startsWith('/api')) {
    const response = NextResponse.next()
    addSecurityHeaders(response)
    return response
  }

  // Skip rate limiting for health checks
  if (pathname === '/api/health') {
    return NextResponse.next()
  }

  const clientIP = getClientIP(request)
  const rateLimitConfig = getRateLimitConfig(pathname)

  // Skip rate limiting for excluded endpoints
  if (!rateLimitConfig) {
    return NextResponse.next()
  }

  const { windowMs, maxRequests } = rateLimitConfig
  const rateLimitKey = `${clientIP}:${pathname.startsWith('/api/auth') ? 'auth' : 'api'}`

  const { limited, remaining } = checkRateLimit(rateLimitKey, windowMs, maxRequests)

  if (limited) {
    // Log rate limit event (fire-and-forget, edge-compatible)
    try {
      const logUrl = new URL('/api/logs', request.url)
      fetch(logUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'origin': request.nextUrl.origin,
          'referer': request.nextUrl.origin,
        },
        body: JSON.stringify({
          message: `RATE_LIMIT: ${clientIP} exceeded ${maxRequests} requests on ${pathname}`,
          errorLevel: 'WARNING',
          metadata: { category: 'PERMISSION', clientIP, pathname, maxRequests },
        }),
      }).catch(() => {})
    } catch { /* ignore */ }

    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Please try again later'
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'Retry-After': String(Math.ceil(windowMs / 1000)),
        },
      }
    )
  }

  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Remaining', String(remaining))

  // Add security headers
  addSecurityHeaders(response)

  return response
}

// SECURITY: Add comprehensive security headers
function addSecurityHeaders(response: NextResponse) {
  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY')

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Referrer policy - don't leak URLs to external sites
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy - disable unnecessary browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  // HSTS - Force HTTPS for 1 year (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // Content Security Policy (CSP) - Prevent XSS attacks
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-inline/eval
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
    "img-src 'self' data: https: blob:", // Allow images from GCS and data URIs
    "font-src 'self' data:",
    "connect-src 'self' https://storage.googleapis.com", // API calls
    "frame-ancestors 'none'", // Same as X-Frame-Options: DENY
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests", // Auto-upgrade HTTP to HTTPS
  ]

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '))

  return response
}

export const config = {
  matcher: [
    // Match all routes except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
