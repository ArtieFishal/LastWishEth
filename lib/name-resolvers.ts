import { createPublicClient, http, isAddress } from 'viem'
import { mainnet } from 'viem/chains'

export interface ResolvedName {
  address: string
  name: string
  resolver: 'ens' | 'sns' | 'unstoppable' | 'spaceid' | 'lens' | 'farcaster' | 'unknown'
}

/**
 * Unified resolver for multiple blockchain naming systems
 * Supports: ENS, Solana Name Service, Unstoppable Domains, Space ID, Lens Protocol
 */
export async function resolveBlockchainName(name: string): Promise<ResolvedName | null> {
  if (!name || typeof name !== 'string') return null
  
  const trimmed = name.trim().toLowerCase()
  
  // If it's already an address, return it
  if (isAddress(trimmed)) {
    return {
      address: trimmed,
      name: trimmed,
      resolver: 'unknown'
    }
  }

  // Detect naming system from TLD
  if (trimmed.endsWith('.eth') || trimmed.endsWith('.base.eth') || trimmed.endsWith('.farcaster.eth')) {
    return await resolveENS(trimmed)
  }
  
  if (trimmed.endsWith('.sol')) {
    return await resolveSNS(trimmed)
  }
  
  if (trimmed.endsWith('.crypto') || trimmed.endsWith('.nft') || 
      trimmed.endsWith('.wallet') || trimmed.endsWith('.x') || 
      trimmed.endsWith('.dao') || trimmed.endsWith('.blockchain') || 
      trimmed.endsWith('.bitcoin') || trimmed.endsWith('.zil')) {
    return await resolveUnstoppable(trimmed)
  }
  
  if (trimmed.endsWith('.arb')) {
    return await resolveSpaceID(trimmed, 'arbitrum')
  }
  
  if (trimmed.endsWith('.bnb')) {
    return await resolveSpaceID(trimmed, 'bsc')
  }
  
  if (trimmed.endsWith('.lens')) {
    return await resolveLens(trimmed)
  }

  return null
}

/**
 * Reverse lookup: Resolve address to name across all systems
 */
export async function reverseResolveAddress(address: string): Promise<ResolvedName | null> {
  if (!address || !isAddress(address)) {
    // Check if it's a Solana address (base58, 32-44 chars)
    if (address && address.length >= 32 && address.length <= 44 && !address.startsWith('0x')) {
      const snsResult = await reverseResolveSNS(address)
      if (snsResult) return snsResult
    }
    return null
  }
  
  const addrLower = address.toLowerCase()
  
  // Try ENS first (most common for EVM addresses)
  const ensResult = await reverseResolveENS(addrLower)
  if (ensResult) return ensResult
  
  // Try Unstoppable (supports multiple chains)
  const unstoppableResult = await reverseResolveUnstoppable(addrLower)
  if (unstoppableResult) return unstoppableResult
  
  return null
}

// ========== ENS Resolver ==========
async function resolveENS(name: string): Promise<ResolvedName | null> {
  try {
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    })
    
    const address = await publicClient.getEnsAddress({ name })
    if (address) {
      return {
        address: address.toLowerCase(),
        name,
        resolver: name.includes('farcaster') ? 'farcaster' : 'ens'
      }
    }
  } catch (error) {
    console.error(`Error resolving ENS "${name}":`, error)
  }
  return null
}

async function reverseResolveENS(address: string): Promise<ResolvedName | null> {
  try {
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    })
    
    const name = await publicClient.getEnsName({ address: address as `0x${string}` })
    if (name) {
      return {
        address: address.toLowerCase(),
        name,
        resolver: name.includes('farcaster') ? 'farcaster' : 'ens'
      }
    }
  } catch (error) {
    // Silently fail - not all addresses have ENS names
  }
  return null
}

// ========== Solana Name Service Resolver ==========
async function resolveSNS(name: string): Promise<ResolvedName | null> {
  try {
    const domainName = name.replace('.sol', '')
    
    // Option 1: Use Bonfida API (official SNS, no API key required)
    const response = await fetch(`https://api.bonfida.com/sol-name/${domainName}`, {
      headers: { 'Accept': 'application/json' }
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.address) {
        return {
          address: data.address,
          name,
          resolver: 'sns'
        }
      }
    }
    
    // Option 2: Try Helius API if API key is available (alternative)
    if (process.env.HELIUS_API_KEY) {
      try {
        const heliusResponse = await fetch(
          `https://api.helius.xyz/v0/addresses/${name}?api-key=${process.env.HELIUS_API_KEY}`
        )
        if (heliusResponse.ok) {
          const heliusData = await heliusResponse.json()
          if (heliusData.address) {
            return {
              address: heliusData.address,
              name,
              resolver: 'sns'
            }
          }
        }
      } catch (heliusError) {
        // Fallback to Bonfida if Helius fails
      }
    }
  } catch (error) {
    console.error(`Error resolving SNS "${name}":`, error)
  }
  return null
}

async function reverseResolveSNS(address: string): Promise<ResolvedName | null> {
  try {
    // Reverse lookup for Solana addresses via Bonfida
    const response = await fetch(`https://api.bonfida.com/address/${address}`, {
      headers: { 'Accept': 'application/json' }
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.name) {
        return {
          address: address.toLowerCase(),
          name: `${data.name}.sol`,
          resolver: 'sns'
        }
      }
    }
  } catch (error) {
    // Silently fail - not all Solana addresses have SNS names
  }
  return null
}

// ========== Unstoppable Domains Resolver ==========
async function resolveUnstoppable(name: string): Promise<ResolvedName | null> {
  try {
    // Unstoppable Domains Resolution API
    // Free tier: https://docs.unstoppabledomains.com/resolution/quickstart
    const apiKey = process.env.UNSTOPPABLE_API_KEY || ''
    const url = apiKey 
      ? `https://api.unstoppabledomains.com/resolve/domains/${name}`
      : `https://resolve.unstoppabledomains.com/domains/${name}`
    
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    }
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }
    
    const response = await fetch(url, { headers })
    
    if (response.ok) {
      const data = await response.json()
      // Unstoppable returns addresses for multiple chains
      // Priority: ETH > MATIC > others
      const ethAddress = data.meta?.owner || data.addresses?.ETH || data.addresses?.['60'] // 60 is ETH chain ID
      if (ethAddress) {
        return {
          address: ethAddress.toLowerCase(),
          name,
          resolver: 'unstoppable'
        }
      }
    }
  } catch (error) {
    console.error(`Error resolving Unstoppable "${name}":`, error)
  }
  return null
}

async function reverseResolveUnstoppable(address: string): Promise<ResolvedName | null> {
  try {
    const apiKey = process.env.UNSTOPPABLE_API_KEY || ''
    const url = apiKey
      ? `https://api.unstoppabledomains.com/resolve/reverse/${address}`
      : `https://resolve.unstoppabledomains.com/reverse/${address}`
    
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    }
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }
    
    const response = await fetch(url, { headers })
    
    if (response.ok) {
      const data = await response.json()
      if (data.meta?.domain) {
        return {
          address: address.toLowerCase(),
          name: data.meta.domain,
          resolver: 'unstoppable'
        }
      }
    }
  } catch (error) {
    // Silently fail - not all addresses have Unstoppable domains
  }
  return null
}

// ========== Space ID Resolver ==========
async function resolveSpaceID(name: string, chain: 'arbitrum' | 'bsc'): Promise<ResolvedName | null> {
  try {
    // Space ID API
    const tld = chain === 'arbitrum' ? 'arb' : 'bnb'
    const domainName = name.replace(`.${tld}`, '')
    
    const response = await fetch(
      `https://api.prd.space.id/v1/getAddress?tld=${tld}&domain=${domainName}`,
      {
        headers: { 'Accept': 'application/json' }
      }
    )
    
    if (response.ok) {
      const data = await response.json()
      if (data.code === 0 && data.data?.address) {
        return {
          address: data.data.address.toLowerCase(),
          name,
          resolver: 'spaceid'
        }
      }
    }
  } catch (error) {
    console.error(`Error resolving Space ID "${name}":`, error)
  }
  return null
}

// ========== Lens Protocol Resolver ==========
async function resolveLens(name: string): Promise<ResolvedName | null> {
  try {
    // Lens Protocol uses a GraphQL API
    const profileName = name.replace('.lens', '')
    const response = await fetch('https://api.lens.dev/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query: `
          query Profile {
            profile(request: { handle: "${profileName}.lens" }) {
              ownedBy
            }
          }
        `
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.data?.profile?.ownedBy) {
        return {
          address: data.data.profile.ownedBy.toLowerCase(),
          name,
          resolver: 'lens'
        }
      }
    }
  } catch (error) {
    console.error(`Error resolving Lens "${name}":`, error)
  }
  return null
}

