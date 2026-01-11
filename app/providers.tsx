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
              // Only set on the modal element itself, NOT on parents/ancestors
              // Setting position:fixed on parents can block page scrolling
              htmlEl.style.zIndex = MAX_Z_INDEX
              // Only set position:fixed if it's actually a modal/backdrop element
              // Don't set it on parents as that can block scrolling
              if (selector.includes('modal') || selector.includes('backdrop') || selector.includes('overlay')) {
                htmlEl.style.position = 'fixed'
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
            // Only set position:fixed on actual modal/backdrop elements, not all WalletConnect elements
            // This prevents blocking page scroll
            const isModalOrBackdrop = 
              tagName.includes('modal') || tagName.includes('backdrop') || tagName.includes('overlay') ||
              (typeof className === 'string' && (className.includes('modal') || className.includes('backdrop') || className.includes('overlay'))) ||
              (typeof id === 'string' && (id.includes('modal') || id.includes('backdrop') || id.includes('overlay')))
            if (isModalOrBackdrop && (htmlEl.style.position === '' || htmlEl.style.position === 'static')) {
              htmlEl.style.position = 'fixed'
            }
          }
        })
      }
      
      // CRITICAL: Ensure body and html are never set to position:fixed (blocks scrolling)
      const ensureBodyScrollable = () => {
        if (document.body) {
          // Remove position:fixed from body if it was accidentally set
          if (document.body.style.position === 'fixed') {
            document.body.style.position = ''
          }
          // Ensure body can scroll
          if (document.body.style.overflow === 'hidden') {
            document.body.style.overflow = ''
          }
        }
        if (document.documentElement) {
          // Remove position:fixed from html if it was accidentally set
          if (document.documentElement.style.position === 'fixed') {
            document.documentElement.style.position = ''
          }
          // Ensure html can scroll
          if (document.documentElement.style.overflow === 'hidden') {
            document.documentElement.style.overflow = ''
          }
        }
        // Remove any leftover WalletConnect backdrops that might be blocking scroll
        // Only remove if modal is not actually open (no visible modal content)
        const modalElements = document.querySelectorAll('w3m-modal, [data-w3m-modal], .w3m-modal, .walletconnect-modal')
        const hasVisibleModal = Array.from(modalElements).some(el => {
          const htmlEl = el as HTMLElement
          return htmlEl.offsetParent !== null && window.getComputedStyle(htmlEl).display !== 'none'
        })
        if (!hasVisibleModal) {
          // No visible modal, remove any backdrops that might be blocking
          const backdrops = document.querySelectorAll('w3m-backdrop, [data-w3m-backdrop], .w3m-backdrop, .walletconnect-modal__backdrop')
          backdrops.forEach(backdrop => {
            const htmlEl = backdrop as HTMLElement
            // Only remove if it's actually blocking (has position:fixed and covers the page)
            if (htmlEl.style.position === 'fixed' && htmlEl.style.display !== 'none') {
              htmlEl.style.display = 'none'
            }
          })
        }
      }

      // Run immediately and then periodically check
      fixWalletConnectZIndex()
      ensureBodyScrollable()
      const interval = setInterval(() => {
        fixWalletConnectZIndex()
        ensureBodyScrollable()
      }, 100)
      
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
