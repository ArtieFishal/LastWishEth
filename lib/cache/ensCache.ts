// ENS resolution caching to avoid redundant API calls

const CACHE_KEY_PREFIX = 'lastwish_ens_'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

interface CachedENS {
  address: string
  ensName: string | null
  timestamp: number
}

export class ENSCache {
  private getCacheKey(address: string): string {
    return `${CACHE_KEY_PREFIX}${address.toLowerCase()}`
  }

  get(address: string): string | null {
    if (typeof window === 'undefined') return null

    try {
      const cached = localStorage.getItem(this.getCacheKey(address))
      if (!cached) return null

      const data: CachedENS = JSON.parse(cached)
      const now = Date.now()
      const age = now - data.timestamp

      if (age > CACHE_DURATION) {
        // Cache expired
        this.delete(address)
        return null
      }

      return data.ensName
    } catch (error) {
      console.error('Error reading ENS cache:', error)
      return null
    }
  }

  set(address: string, ensName: string | null): void {
    if (typeof window === 'undefined') return

    try {
      const data: CachedENS = {
        address: address.toLowerCase(),
        ensName,
        timestamp: Date.now(),
      }
      localStorage.setItem(this.getCacheKey(address), JSON.stringify(data))
    } catch (error) {
      console.error('Error writing ENS cache:', error)
    }
  }

  delete(address: string): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(this.getCacheKey(address))
    } catch (error) {
      console.error('Error deleting ENS cache:', error)
    }
  }

  clear(): void {
    if (typeof window === 'undefined') return

    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('Error clearing ENS cache:', error)
    }
  }
}

export const ensCache = new ENSCache()

