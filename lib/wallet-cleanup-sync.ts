/**
 * SYNCHRONOUS COMPLETE DATA CLEANUP - runs BEFORE React mounts
 * This clears ALL persistent data for complete consumer privacy
 * This must execute immediately when the script loads
 */

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
          indexedDB.databases().then(databases => {
            databases.forEach(db => {
              if (db.name) {
                indexedDB.deleteDatabase(db.name).catch(err => {
                  console.warn(`[Privacy Cleanup] Could not delete DB ${db.name}:`, err)
                })
              }
            })
            console.log('[Privacy Cleanup] ✅ Cleared ALL IndexedDB databases')
          }).catch(err => {
            console.error('[Privacy Cleanup] Error getting IndexedDB databases:', err)
          })
        } else {
          // Fallback: delete known databases
          const knownDBs = [
            'W3M_INDEXED_DB',
            'walletconnect',
            'wagmi',
            'wagmi.cache',
            'lastwish_state',
            'lastwish',
          ]
          knownDBs.forEach(dbName => {
            try {
              indexedDB.deleteDatabase(dbName)
            } catch (e) {
              // Ignore errors
            }
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

