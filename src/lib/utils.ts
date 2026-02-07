/**
 * Utility functions for the application
 */

/**
 * Adds cache-busting timestamp to a URL to prevent browser caching
 * @param url - The URL to add cache-busting to
 * @param refresh - Optional: force a new timestamp (useful when data changes)
 * @returns URL with cache-busting parameter
 */
export function withCacheBust(url: string | null | undefined, refresh?: number): string {
  if (!url) return ''

  // Use provided refresh value or current timestamp rounded to 5 minutes
  // This prevents excessive cache-busting while still allowing updates
  const timestamp = refresh || Math.floor(Date.now() / (5 * 60 * 1000))

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}_v=${timestamp}`
}

/**
 * Adds immediate cache-busting (unique per request)
 * Use this when you need to force a fresh load immediately
 */
export function withFreshCacheBust(url: string | null | undefined): string {
  if (!url) return ''

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}_t=${Date.now()}`
}

/**
 * Creates an API URL with cache-busting
 */
export function apiUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams()

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value))
      }
    })
  }

  // Always add timestamp for cache busting
  searchParams.set('_t', String(Date.now()))

  const queryString = searchParams.toString()
  return queryString ? `${path}?${queryString}` : path
}
