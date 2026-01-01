'use client'

import { useEffect, useState } from 'react'
import { getEnsName } from 'viem/actions'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

interface WalletDisplayProps {
  address: string
  type: 'evm' | 'btc'
}

export function WalletDisplay({ address, type }: WalletDisplayProps) {
  const [ensName, setEnsName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (type === 'evm' && address && address.startsWith('0x')) {
      setLoading(true)
      const resolveENS = async () => {
        try {
          const publicClient = createPublicClient({
            chain: mainnet,
            transport: http(),
          })
          const name = await publicClient.getEnsName({ address: address as `0x${string}` })
          if (name) {
            setEnsName(name)
          }
        } catch (error) {
          console.error('Error resolving ENS:', error)
        } finally {
          setLoading(false)
        }
      }
      resolveENS()
    }
  }, [address, type])

  if (type === 'btc') {
    return <span className="font-mono text-xs">{address}</span>
  }

  return (
    <div>
      {ensName ? (
        <div>
          <span className="font-semibold text-sm">{ensName}</span>
          <span className="text-xs text-gray-500 font-mono ml-2">({address.slice(0, 6)}...{address.slice(-4)})</span>
        </div>
      ) : (
        <span className="font-mono text-xs">{address}</span>
      )}
    </div>
  )
}

