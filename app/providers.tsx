'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '@/lib/wagmi'
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

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
