// Batch ENS resolution to avoid rate limits

import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { ensCache } from '../cache/ensCache'

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

const BATCH_SIZE = 5
const BATCH_DELAY = 200 // ms between batches

export async function batchResolveENS(addresses: string[]): Promise<Record<string, string>> {
  const results: Record<string, string> = {}
  const toResolve: string[] = []

  // Check cache first
  addresses.forEach(address => {
    const cached = ensCache.get(address)
    if (cached) {
      results[address.toLowerCase()] = cached
    } else {
      toResolve.push(address)
    }
  })

  // Resolve uncached addresses in batches
  for (let i = 0; i < toResolve.length; i += BATCH_SIZE) {
    const batch = toResolve.slice(i, i + BATCH_SIZE)
    
    await Promise.all(
      batch.map(async (address) => {
        try {
          const ensName = await publicClient.getEnsName({ address: address as `0x${string}` })
          if (ensName) {
            results[address.toLowerCase()] = ensName
            ensCache.set(address, ensName)
          } else {
            ensCache.set(address, null) // Cache null to avoid retrying
          }
        } catch (error) {
          console.error(`Error resolving ENS for ${address}:`, error)
        }
      })
    )

    // Delay between batches to avoid rate limits
    if (i + BATCH_SIZE < toResolve.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
    }
  }

  return results
}

