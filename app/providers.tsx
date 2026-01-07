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
      
      // Fix WalletConnect modal z-index - ABSOLUTE TOP PRIORITY for QR code
      const fixWalletConnectZIndex = () => {
        // Use maximum z-index value to ensure QR code is always on top
        const MAX_Z_INDEX = '2147483647'
        
        // Find all WalletConnect modal elements and ensure they're on top
        const selectors = [
          'w3m-modal',
          'w3m-backdrop',
          'w3m-container',
          'w3m-router',
          'w3m-qr-code',
          '[data-w3m-modal]',
          '[data-w3m-backdrop]',
          '[data-w3m-container]',
          '[data-w3m-qr]',
          '.w3m-modal',
          '.w3m-backdrop',
          '.w3m-container',
          '.w3m-router',
          '.w3m-qr-code',
          '.walletconnect-modal',
          '.walletconnect-modal__backdrop',
          '.walletconnect-qrcode',
          '.walletconnect-qrcode__base',
        ]
        
        selectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector)
            elements.forEach((el: Element) => {
              const htmlEl = el as HTMLElement
              htmlEl.style.zIndex = MAX_Z_INDEX
              htmlEl.style.position = 'fixed'
              // Also set on parent if it exists
              if (htmlEl.parentElement) {
                htmlEl.parentElement.style.zIndex = MAX_Z_INDEX
                htmlEl.parentElement.style.position = 'fixed'
              }
              // Also set on all ancestors
              let parent = htmlEl.parentElement
              while (parent && parent !== document.body) {
                parent.style.zIndex = MAX_Z_INDEX
                parent = parent.parentElement
              }
            })
          } catch (e) {
            // Selector might not be valid, continue
          }
        })
        
        // Also check for any element with WalletConnect classes - MAXIMUM PRIORITY
        const allElements = document.querySelectorAll('*')
        allElements.forEach((el: Element) => {
          const htmlEl = el as HTMLElement
          const className = htmlEl.className || ''
          const id = htmlEl.id || ''
          const tagName = htmlEl.tagName?.toLowerCase() || ''
          
          if (
            tagName.includes('w3m') ||
            (typeof className === 'string' && (className.includes('w3m') || className.includes('walletconnect'))) ||
            (typeof id === 'string' && (id.includes('w3m') || id.includes('walletconnect')))
          ) {
            htmlEl.style.zIndex = MAX_Z_INDEX
            if (htmlEl.style.position === '' || htmlEl.style.position === 'static') {
              htmlEl.style.position = 'fixed'
            }
          }
        })
      }
      
      // Run immediately and then periodically check
      fixWalletConnectZIndex()
      const interval = setInterval(fixWalletConnectZIndex, 100)
      
      // Also watch for DOM changes (modal might be added dynamically)
      const observer = new MutationObserver(() => {
        fixWalletConnectZIndex()
      })
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      })
      
      return () => {
        clearInterval(interval)
        observer.disconnect()
      }
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
