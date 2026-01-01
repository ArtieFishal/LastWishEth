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
          showQrModal: true,
          metadata: {
            name: 'LastWish',
            description: 'Crypto Inheritance Instructions',
            url: typeof window !== 'undefined' ? window.location.origin : 'https://lastwish.eth',
            icons: typeof window !== 'undefined' ? [`${window.location.origin}/favicon.ico`] : [],
          },
          qrModalOptions: {
            themeMode: 'light',
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

