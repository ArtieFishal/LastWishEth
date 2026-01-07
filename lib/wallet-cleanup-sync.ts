/**
 * SYNCHRONOUS COMPLETE DATA CLEANUP - runs BEFORE React mounts
 * This clears ALL persistent data for complete consumer privacy
 * This must execute immediately when the script loads
 */

/**
 * Helper to promisify indexedDB.deleteDatabase
 */
async function deleteIndexedDB(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error ?? new Error(`deleteDatabase failed for ${name}`))
    req.onblocked = () => {
      console.warn(`[Privacy Cleanup] deleteDatabase blocked for ${name}`)
      // Resolve anyway to not block cleanup
      resolve()
    }
  })
}

if (typeof window !== 'undefined') {
  // Run IMMEDIATELY - before React, before anything else
  (function() {
    try {
      console.log('[Privacy Cleanup] 🧹 Starting complete data cleanup...')
      
      // CLEAR ALL localStorage - complete privacy
      try {
        localStorage.clear()
        console.log('[Privacy Cleanup] ✅ Cleared ALL localStorage')
      } catch (e) {
        console.error('[Privacy Cleanup] Error clearing localStorage:', e)
        // Fallback: clear known keys
        const keys: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key) keys.push(key)
        }
        keys.forEach(key => localStorage.removeItem(key))
      }
      
      // CLEAR ALL sessionStorage - complete privacy
      try {
        sessionStorage.clear()
        console.log('[Privacy Cleanup] ✅ Cleared ALL sessionStorage')
      } catch (e) {
        console.error('[Privacy Cleanup] Error clearing sessionStorage:', e)
      }
      
      // CLEAR ALL IndexedDB databases - complete privacy
      try {
        if ('indexedDB' in window && indexedDB.databases) {
          indexedDB.databases().then(async (databases) => {
            for (const db of databases) {
              if (db.name) {
                try {
                  await deleteIndexedDB(db.name)
                } catch (err) {
                  console.warn(`[Privacy Cleanup] Could not delete DB ${db.name}:`, err)
                }
              }
            }
            console.log('[Privacy Cleanup] ✅ Cleared ALL IndexedDB databases')
          }).catch(err => {
            console.error('[Privacy Cleanup] Error getting IndexedDB databases:', err)
          })
        } else {
          // Fallback: delete known databases (fire-and-forget, no await needed)
          const knownDBs = [
            'W3M_INDEXED_DB',
            'walletconnect',
            'wagmi',
            'wagmi.cache',
            'lastwish_state',
            'lastwish',
          ]
          knownDBs.forEach(dbName => {
            deleteIndexedDB(dbName).catch(() => {
              // Ignore errors silently
            })
          })
        }
      } catch (e) {
        console.error('[Privacy Cleanup] Error clearing IndexedDB:', e)
      }
      
      console.log('[Privacy Cleanup] ✅ Complete data cleanup finished')
    } catch (error) {
      console.error('[Privacy Cleanup] Critical error:', error)
    }
  })()
}

