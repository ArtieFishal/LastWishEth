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
    // Wagmi stores connection state in indexedDB, but we can clear localStorage keys
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith('wagmi.') ||
        key.startsWith('wc@') ||
        key.startsWith('walletconnect') ||
        key.includes('wallet') && key.includes('connect')
      )) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    console.log('[Wallet Cleanup] Cleared wallet data from localStorage')
  } catch (error) {
    console.error('[Wallet Cleanup] Error clearing localStorage:', error)
  }
}

/**
 * Clear wagmi indexedDB storage (WalletConnect sessions)
 * This is CRITICAL - wagmi auto-restores connections from indexedDB
 */
export async function clearWagmiIndexedDB() {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return

  try {
    // Wagmi/WalletConnect stores data in indexedDB with specific database names
    // We need to clear ALL possible variations
    const dbNames = [
      'W3M_INDEXED_DB',
      'walletconnect',
      'wagmi',
      'wagmi.cache',
      'W3M',
      '@walletconnect',
      'walletconnect-v2',
      'WCM',
    ]

    // Also try to find all databases that might be related
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

    // Combine known names with discovered databases
    const databasesToDelete = new Set([...dbNames, ...allDatabases.filter(name => 
      name.toLowerCase().includes('wallet') || 
      name.toLowerCase().includes('wagmi') || 
      name.toLowerCase().includes('w3m') ||
      name.toLowerCase().includes('wc')
    )])

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

