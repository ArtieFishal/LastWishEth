import { createConfig, http } from 'wagmi'
import { base, arbitrum, polygon, mainnet } from 'wagmi/chains'
import { walletConnect } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

// Build connectors array
const buildConnectors = () => {
  const connectors: any[] = []
  
  if (projectId && projectId.length > 0) {
    try {
      connectors.push(
        walletConnect({
          projectId,
          showQrModal: true, // This enables QR code for ALL compatible wallets!
          metadata: {
            name: 'LastWish.eth',
            description: 'Crypto Inheritance Instructions Generator',
            url: typeof window !== 'undefined' ? window.location.origin : 'https://lastwish.eth',
            icons: typeof window !== 'undefined' ? [`${window.location.origin}/favicon.ico`] : [],
          },
          qrModalOptions: {
            themeMode: 'light',
            // Make QR code more prominent and user-friendly
            enableExplorer: true,
            explorerRecommendedWalletIds: [
              'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
              '4622a2b2d6af1c984494a1eb792761e6169f3a0e25b1423488c2082b1633d88', // Trust Wallet
              '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a122', // Rainbow
              'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase Wallet
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
  
  return connectors
}

// Create config
export const config = createConfig({
  chains: [mainnet, base, arbitrum, polygon],
  connectors: buildConnectors(),
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [polygon.id]: http(),
  },
  ssr: false,
})

