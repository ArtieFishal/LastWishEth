// Asset caching using IndexedDB for better performance

const DB_NAME = 'lastwish_cache'
const DB_VERSION = 1
const STORE_NAME = 'assets'

interface CachedAsset {
  address: string
  assets: any[]
  timestamp: number
  expiresIn: number // milliseconds
}

const DEFAULT_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export class AssetCache {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'address' })
        }
      }
    })
  }

  async get(address: string): Promise<any[] | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(address)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const cached: CachedAsset | undefined = request.result
        if (!cached) {
          resolve(null)
          return
        }

        const now = Date.now()
        const age = now - cached.timestamp

        if (age > cached.expiresIn) {
          // Cache expired, delete it
          this.delete(address)
          resolve(null)
          return
        }

        resolve(cached.assets)
      }
    })
  }

  async set(address: string, assets: any[], expiresIn: number = DEFAULT_CACHE_DURATION): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const cached: CachedAsset = {
        address,
        assets,
        timestamp: Date.now(),
        expiresIn,
      }

      const request = store.put(cached)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async delete(address: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(address)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clear(): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }
}

export const assetCache = new AssetCache()

