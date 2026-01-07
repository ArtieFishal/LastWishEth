/**
 * SYNCHRONOUS wallet cleanup - runs BEFORE React mounts
 * This must execute immediately when the script loads
 */

if (typeof window !== 'undefined') {
  // Run IMMEDIATELY - before React, before anything else
  (function() {
    try {
      // Clear queuedSessions from localStorage IMMEDIATELY
      const saved = localStorage.getItem('lastwish_state')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.queuedSessions && parsed.queuedSessions.length > 0) {
          parsed.queuedSessions = []
          parsed.paymentWalletAddress = undefined
          localStorage.setItem('lastwish_state', JSON.stringify(parsed))
          console.log('[Sync Cleanup] ✅ Cleared queuedSessions before React mount')
        }
      }
      
      // Clear wallet-related localStorage keys
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.startsWith('wagmi.') ||
          key.startsWith('wc@') ||
          key.startsWith('walletconnect') ||
          (key.includes('wallet') && key.includes('connect'))
        )) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
    } catch (error) {
      console.error('[Sync Cleanup] Error:', error)
    }
  })()
}

