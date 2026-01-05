import { createConfig, http } from 'wagmi'
import { base, arbitrum, polygon, mainnet } from 'wagmi/chains'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

// Build connectors array - only on client side
// This function must only be called from client components
// Dynamically import walletConnect to prevent indexedDB access during SSR
const buildConnectors = async () => {
  // Guard against SSR - indexedDB is not available on server
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return []
  }
  
  const connectors: any[] = []
  
  // Add WalletConnect connector FIRST - this is the primary option for QR code connections
  // Users want QR code by default, injected wallets are secondary
  if (projectId && projectId.length > 0) {
    try {
      // Dynamically import walletConnect only on client to prevent SSR indexedDB access
      const { walletConnect } = await import('wagmi/connectors')
      
      // Only create WalletConnect connector on client where indexedDB is available
      connectors.push(
        walletConnect({
          projectId,
          showQrModal: true, // This enables QR code for ALL compatible wallets!
          metadata: {
            name: 'LastWishCrypto.eth',
            description: 'Crypto Inheritance Instructions Generator',
            url: window.location.origin,
            icons: [`${window.location.origin}/favicon.ico`],
          },
          qrModalOptions: {
            themeMode: 'light',
            // Only show recommended wallets (no explorer with all wallets)
            enableExplorer: false,
            explorerRecommendedWalletIds: [
              'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
              '4622a2b2d6af1c984494a1eb792761e6169f3a0e25b1423488c2082b1633d88', // Trust Wallet
              '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a122', // Rainbow
              'a797aa35c0fadbfc1a53e7f67567ed348c5293fa12515bd01d60061c4fb574a8', // Phantom
            ],
          },
        })
      )
    } catch (error) {
      // Silently fail - connectors will be empty
      if (process.env.NODE_ENV === 'development') {
        console.warn('WalletConnect not configured. Add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to .env.local')
      }
    }
  }
  
  // No injected wallet connectors - keeping it simple with just WalletConnect
  // Users can connect any wallet via WalletConnect QR code
  
  return connectors
}

// Lazy config creation - only create on client side
let _config: ReturnType<typeof createConfig> | null = null
let _configPromise: Promise<ReturnType<typeof createConfig>> | null = null
let _ssrConfig: ReturnType<typeof createConfig> | null = null

// Synchronous SSR-safe config getter (no indexedDB access)
export const getSSRConfig = () => {
  if (!_ssrConfig) {
    _ssrConfig = createConfig({
      chains: [mainnet, base, arbitrum, polygon],
      connectors: [], // Empty connectors during SSR - no indexedDB access
      transports: {
        [mainnet.id]: http(),
        [base.id]: http(),
        [arbitrum.id]: http(),
        [polygon.id]: http(),
      },
      ssr: false,
    })
  }
  return _ssrConfig
}

export const getConfig = async () => {
  if (typeof window === 'undefined') {
    // Return SSR-safe config synchronously
    return Promise.resolve(getSSRConfig())
  }
  
  // Create full config with connectors only on client (async to load walletConnect)
  if (!_configPromise) {
    _configPromise = (async () => {
      const connectors = await buildConnectors()
      _config = createConfig({
        chains: [mainnet, base, arbitrum, polygon],
        connectors,
        transports: {
          [mainnet.id]: http(),
          [base.id]: http(),
          [arbitrum.id]: http(),
          [polygon.id]: http(),
        },
        ssr: false,
      })
      return _config
    })()
  }
  
  return await _configPromise
}

// Don't export config directly - use getConfig() instead to prevent SSR evaluation
// This ensures indexedDB is only accessed on the client

