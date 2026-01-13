'use client'

import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'

interface SolanaWalletConnectProps {
  onSolanaConnect?: (address: string, provider?: string) => void
}

export function SolanaWalletConnect({ onSolanaConnect }: SolanaWalletConnectProps) {
  const { publicKey, wallet, connected, disconnect } = useWallet()
  const { connection } = useConnection()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (connected && publicKey && onSolanaConnect) {
      const address = publicKey.toBase58()
      const provider = wallet?.adapter?.name || 'Solana Wallet'
      onSolanaConnect(address, provider)
    }
  }, [connected, publicKey, wallet, onSolanaConnect])

  if (!mounted) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center">
        <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-blue-600 hover:!from-purple-700 hover:!to-blue-700 !text-white !font-semibold !rounded-lg !px-6 !py-3 !shadow-lg" />
      </div>
      {connected && publicKey && (
        <div className="text-sm text-gray-300 text-center">
          <p className="font-semibold text-green-400">✓ Connected</p>
          <p className="text-xs text-gray-400 font-mono mt-1">
            {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-8)}
          </p>
          {wallet?.adapter?.name && (
            <p className="text-xs text-gray-400 mt-1">Provider: {wallet.adapter.name}</p>
          )}
        </div>
      )}
    </div>
  )
}

