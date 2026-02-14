'use client'

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import { useMemo, ReactNode, useState, useCallback, createContext, useContext } from 'react'

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css'

// Context to allow child components to trigger wallet initialization
const SolanaWalletInitContext = createContext<(() => void) | null>(null)

export function useSolanaWalletInit() {
  return useContext(SolanaWalletInitContext)
}

export function SolanaProvider({ children }: { children: ReactNode }) {
  // Use mainnet
  const network = WalletAdapterNetwork.Mainnet
  const endpoint = useMemo(() => {
    // Use custom RPC if available, otherwise use public endpoint
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network)
  }, [network])

  // Lazy-load wallet adapters only when needed (prevents Phantom auto-prompt)
  // Initialize adapters only when user actually accesses Solana functionality
  const [walletsInitialized, setWalletsInitialized] = useState(false)
  
  const initializeWallets = useCallback(() => {
    if (!walletsInitialized) {
      setWalletsInitialized(true)
    }
  }, [walletsInitialized])
  
  const wallets = useMemo(() => {
    // Don't create wallet adapters until user actually needs them
    // This prevents Phantom from detecting the page and auto-prompting
    if (!walletsInitialized) {
      return []
    }
    return [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ]
  }, [walletsInitialized])

  return (
    <SolanaWalletInitContext.Provider value={initializeWallets}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect={false}>
          <WalletModalProvider>
            {children}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </SolanaWalletInitContext.Provider>
  )
}

