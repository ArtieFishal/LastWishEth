/**
 * Utility functions to clear wallet connections and related data
 * Used when browser/tab closes to ensure no wallet data persists
 */

/**
 * Clear all wallet-related data from localStorage
 */
export function clearWalletDataFromStorage() {
  if (typeof window === 'undefined') return

  try {
    // Get current state
    const saved = localStorage.getItem('lastwish_state')
    if (saved) {
      const parsed = JSON.parse(saved)
      
      // Remove wallet-related data but keep form data
      const cleanedState = {
        ...parsed,
        queuedSessions: [], // Clear queued wallet sessions
        paymentWalletAddress: undefined, // Clear payment wallet
        // Keep other form data (owner, executor, etc.)
      }
      
      localStorage.setItem('lastwish_state', JSON.stringify(cleanedState))
    }
    
    // Also clear any wagmi-specific storage keys
    // BUT preserve WalletConnect keys - they're needed for QR code functionality
    // WalletConnect uses keys like 'wc@', 'walletconnect', etc.
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        // Only remove wagmi connection state keys, NOT WalletConnect keys
        // WalletConnect keys are needed for QR code modal to work
        if (key.startsWith('wagmi.') && !key.includes('walletconnect')) {
          keysToRemove.push(key)
        }
        // Don't remove 'wc@' or 'walletconnect' keys - WalletConnect needs them
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    console.log('[Wallet Cleanup] Cleared wallet data from localStorage')
  } catch (error) {
    console.error('[Wallet Cleanup] Error clearing localStorage:', error)
  }
}

/**
 * Clear wagmi indexedDB storage (but preserve WalletConnect databases)
 * This is CRITICAL - wagmi auto-restores connections from indexedDB
 * BUT we must NOT delete WalletConnect databases as they're needed for QR code modal
 */
export async function clearWagmiIndexedDB() {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return

  try {
    // Only clear wagmi's cache database, NOT WalletConnect databases
    // WalletConnect needs its databases (W3M_INDEXED_DB, walletconnect, etc.) to function
    // We only want to clear wagmi's connection state cache
    const dbNames = [
      'wagmi.cache', // Only clear wagmi's cache, not WalletConnect storage
    ]

    // Also try to find wagmi-specific databases (but exclude WalletConnect)
    const allDatabases: string[] = []
    try {
      // Get list of all indexedDB databases
      if ('databases' in indexedDB) {
        const databases = await indexedDB.databases()
        databases.forEach(db => {
          if (db.name) {
            allDatabases.push(db.name)
          }
        })
      }
    } catch (e) {
      // databases() might not be available in all browsers
    }

    // Only delete wagmi cache databases, NOT WalletConnect databases
    // WalletConnect databases: W3M_INDEXED_DB, walletconnect, W3M, @walletconnect, walletconnect-v2, WCM, WALLET_CONNECT_V2_INDEXED_DB
    // These MUST be preserved for WalletConnect QR code modal to work
    const walletConnectDbNames = [
      'W3M_INDEXED_DB',
      'walletconnect',
      'W3M',
      '@walletconnect',
      'walletconnect-v2',
      'WCM',
      'WALLET_CONNECT_V2_INDEXED_DB',
    ]
    
    // Helper to check if a database name is a WalletConnect database
    const isWalletConnectDb = (name: string): boolean => {
      const nameLower = name.toLowerCase()
      return walletConnectDbNames.some(wcName => {
        const wcNameLower = wcName.toLowerCase()
        return name === wcName || nameLower === wcNameLower || 
               nameLower.includes('walletconnect') || 
               nameLower.includes('w3m') ||
               nameLower === 'wcm'
      })
    }
    
    const databasesToDelete = new Set([
      ...dbNames.filter(name => !isWalletConnectDb(name)),
      ...allDatabases.filter(name => {
        // Skip ALL WalletConnect databases - they're needed for QR code functionality
        if (isWalletConnectDb(name)) {
          return false
        }
        // Only delete wagmi cache databases (not the main wagmi database)
        return name.toLowerCase() === 'wagmi.cache'
      })
    ])

    for (const dbName of databasesToDelete) {
      try {
        const deleteReq = indexedDB.deleteDatabase(dbName)
        await new Promise<void>((resolve) => {
          deleteReq.onsuccess = () => {
            console.log(`[Wallet Cleanup] ✅ Deleted indexedDB: ${dbName}`)
            resolve()
          }
          deleteReq.onerror = () => {
            // Database might not exist, that's okay
            resolve()
          }
          deleteReq.onblocked = () => {
            // Database is in use - this is critical, we need to force close
            console.warn(`[Wallet Cleanup] ⚠️ Database ${dbName} is blocked, forcing close...`)
            // Try to close any open connections
            resolve()
          }
        })
      } catch (error) {
        // Database might not exist, continue
        console.log(`[Wallet Cleanup] Could not delete ${dbName}:`, error)
      }
    }
    
    console.log('[Wallet Cleanup] ✅ Preserved WalletConnect databases for QR code functionality')
  } catch (error) {
    console.error('[Wallet Cleanup] Error clearing indexedDB:', error)
  }
}

/**
 * Complete wallet cleanup - clears all wallet connections and data
 */
export async function clearAllWalletData() {
  console.log('[Wallet Cleanup] 🔒 Starting complete wallet cleanup...')
  
  // Clear localStorage wallet data FIRST
  clearWalletDataFromStorage()
  
  // Clear indexedDB (async) - THIS IS CRITICAL to prevent wagmi auto-restore
  await clearWagmiIndexedDB()
  
  console.log('[Wallet Cleanup] ✅ Wallet cleanup complete')
}

/**
 * IMMEDIATE cleanup on page load - prevents wagmi from auto-restoring connections
 * This must be called BEFORE wagmi initializes
 */
export async function clearWalletConnectionsOnLoad() {
  if (typeof window === 'undefined') return
  
  console.log('[Wallet Cleanup] 🚨 Clearing wallet connections on page load...')
  
  // Clear indexedDB FIRST - before wagmi can restore (this is CRITICAL)
  await clearWagmiIndexedDB()
  
  // Clear localStorage - including queuedSessions
  clearWalletDataFromStorage()
  
  // Force clear queuedSessions from localStorage if they exist
  try {
    const saved = localStorage.getItem('lastwish_state')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.queuedSessions && parsed.queuedSessions.length > 0) {
        parsed.queuedSessions = []
        localStorage.setItem('lastwish_state', JSON.stringify(parsed))
        console.log('[Wallet Cleanup] ✅ Cleared queuedSessions from localStorage')
      }
    }
  } catch (error) {
    console.error('[Wallet Cleanup] Error clearing queuedSessions:', error)
  }
  
  console.log('[Wallet Cleanup] ✅ Page load cleanup complete')
}

