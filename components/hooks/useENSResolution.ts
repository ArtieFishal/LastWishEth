'use client'

import { useState, useEffect } from 'react'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

export function useENSResolution() {
  const [resolvedEnsNames, setResolvedEnsNames] = useState<Record<string, string>>({})
  const [resolving, setResolving] = useState<Set<string>>(new Set())

  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(),
  })

  const resolveENS = async (address: string): Promise<string | null> => {
    if (!address || address.length < 10 || !address.startsWith('0x')) {
      return null
    }

    const lowerAddress = address.toLowerCase()
    
    // Check cache first
    if (resolvedEnsNames[lowerAddress]) {
      return resolvedEnsNames[lowerAddress]
    }

    // Check if already resolving
    if (resolving.has(lowerAddress)) {
      return null
    }

    setResolving(prev => new Set([...prev, lowerAddress]))

    try {
      const ensName = await publicClient.getEnsName({ address: address as `0x${string}` })
      if (ensName) {
        setResolvedEnsNames(prev => ({ ...prev, [lowerAddress]: ensName }))
        return ensName
      }
      return null
    } catch (error) {
      console.error('Error resolving ENS:', error)
      return null
    } finally {
      setResolving(prev => {
        const next = new Set(prev)
        next.delete(lowerAddress)
        return next
      })
    }
  }

  const resolveENSAddress = async (ensName: string): Promise<string | null> => {
    if (!ensName || !ensName.endsWith('.eth')) {
      return null
    }

    try {
      const address = await publicClient.getEnsAddress({ name: ensName })
      return address
    } catch (error) {
      console.error('Error resolving ENS address:', error)
      return null
    }
  }

  const batchResolveENS = async (addresses: string[]): Promise<void> => {
    const uniqueAddresses = [...new Set(addresses)]
    const unresolved = uniqueAddresses.filter(addr => 
      addr.startsWith('0x') && 
      !resolvedEnsNames[addr.toLowerCase()] &&
      !resolving.has(addr.toLowerCase())
    )

    // Resolve in parallel (limit to 5 at a time to avoid rate limits)
    const batchSize = 5
    for (let i = 0; i < unresolved.length; i += batchSize) {
      const batch = unresolved.slice(i, i + batchSize)
      await Promise.all(batch.map(addr => resolveENS(addr)))
      // Small delay between batches
      if (i + batchSize < unresolved.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
  }

  return {
    resolvedEnsNames,
    resolveENS,
    resolveENSAddress,
    batchResolveENS,
    isResolving: (address: string) => resolving.has(address.toLowerCase())
  }
}

