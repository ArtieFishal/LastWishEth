/**
 * Request caching utility to reduce API calls
 * Uses in-memory cache with TTL (Time To Live)
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

const cache = new Map<string, CacheEntry<any>>()

/**
 * Cache configuration
 */
export interface CacheOptions {
  ttl?: number // Time to live in milliseconds (default: 5 minutes)
  key?: string // Custom cache key (default: generated from URL and params)
}

/**
 * Generate cache key from URL and options
 */
function generateCacheKey(url: string, options?: RequestInit): string {
  const method = options?.method || 'GET'
  const body = options?.body ? JSON.stringify(options.body) : ''
  return `${method}:${url}:${body}`
}

/**
 * Get cached data if available and not expired
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  
  if (!entry) {
    return null
  }
  
  const now = Date.now()
  const isExpired = now - entry.timestamp > entry.ttl
  
  if (isExpired) {
    cache.delete(key)
    return null
  }
  
  return entry.data as T
}

/**
 * Set cache entry
 */
export function setCached<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  })
}

/**
 * Clear cache entry
 */
export function clearCache(key: string): void {
  cache.delete(key)
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  cache.clear()
}

/**
 * Fetch with caching
 */
export async function fetchWithCache<T>(
  url: string,
  options?: RequestInit,
  cacheOptions?: CacheOptions
): Promise<T> {
  const cacheKey = cacheOptions?.key || generateCacheKey(url, options)
  const ttl = cacheOptions?.ttl || 5 * 60 * 1000 // Default 5 minutes
  
  // Check cache first
  const cached = getCached<T>(cacheKey)
  if (cached !== null) {
    return cached
  }
  
  // Fetch from API
  const response = await fetch(url, options)
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  const data = await response.json() as T
  
  // Cache the result
  setCached(cacheKey, data, ttl)
  
  return data
}

/**
 * Clean up expired cache entries periodically
 */
export function cleanupExpiredCache(): void {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key)
    }
  }
}

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredCache, 5 * 60 * 1000)
}

