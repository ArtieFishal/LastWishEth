/**
 * Simple in-memory rate limiter for API routes
 * In production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  identifier?: string // Optional identifier (IP, user ID, etc.)
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number // Seconds until retry is allowed
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const { windowMs, maxRequests } = options
  const now = Date.now()
  
  // Get or create entry
  let entry = rateLimitStore.get(key)
  
  // Clean up expired entries periodically (every 100 checks)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries(now)
  }
  
  // If entry doesn't exist or has expired, create new one
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    }
  }
  
  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)
  
  // Check if limit exceeded
  const allowed = entry.count <= maxRequests
  const remaining = Math.max(0, maxRequests - entry.count)
  const retryAfter = !allowed ? Math.ceil((entry.resetTime - now) / 1000) : undefined
  
  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
    retryAfter,
  }
}

/**
 * Clean up expired entries to prevent memory leaks
 */
function cleanupExpiredEntries(now: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Get rate limit headers for HTTP response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.remaining.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    ...(result.retryAfter && {
      'Retry-After': result.retryAfter.toString(),
    }),
  }
}

