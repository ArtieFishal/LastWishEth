'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { getConfig, getSSRConfig } from '@/lib/wagmi'
import { useState, useEffect } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
      },
    },
  }))
  
  // Get config - use SSR-safe version immediately, then upgrade to full config on client
  const [config, setConfig] = useState<Awaited<ReturnType<typeof getConfig>>>(() => {
    // Initialize with SSR-safe config immediately (synchronous, no indexedDB access)
    // This ensures WagmiProvider is always available, even during SSR
    return getSSRConfig()
  })
  
  // Upgrade to full config with connectors on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      getConfig().then(setConfig)
    }
  }, [])

  // Suppress WalletConnect internal console errors
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalError = console.error
      const originalWarn = console.warn
      
      // Filter out empty object errors from WalletConnect
      console.error = (...args: any[]) => {
        // Skip empty object errors (common WalletConnect internal logging)
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && Object.keys(args[0]).length === 0) {
          return
        }
        // Skip WalletConnect internal stack traces
        if (args.some(arg => typeof arg === 'string' && arg.includes('forwardToConsole'))) {
          return
        }
        // Skip chrome.runtime.sendMessage errors from wallet extensions (harmless)
        if (args.some(arg => typeof arg === 'string' && arg.includes('chrome.runtime.sendMessage'))) {
          return
        }
        // Skip Extension ID errors from wallet extensions
        if (args.some(arg => typeof arg === 'string' && arg.includes('Extension ID'))) {
          return
        }
        originalError(...args)
      }
      
      console.warn = (...args: any[]) => {
        // Filter out WalletConnect warnings about empty objects
        if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null && Object.keys(args[0]).length === 0) {
          return
        }
        originalWarn(...args)
      }

      return () => {
        console.error = originalError
        console.warn = originalWarn
      }
    }
  }, [])

  // Always provide WagmiProvider - config is initialized synchronously for SSR
  // During SSR it has empty connectors (no indexedDB access)
  // On client it gets upgraded to full config with connectors
  return (
    <WagmiProvider config={config!}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
