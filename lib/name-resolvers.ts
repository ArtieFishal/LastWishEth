import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { getAddressLookupKey, isEvmAddress, isSolanaAddress, isSupportedWalletAddress } from './address-utils'

export interface ResolvedName {
  address: string
  name: string
  resolver: 'ens' | 'sns' | 'bns' | 'unstoppable' | 'spaceid' | 'lens' | 'farcaster' | 'unknown'
}

/**
 * Unified resolver for multiple blockchain naming systems
 * Supports: ENS, Solana Name Service, Unstoppable Domains, Space ID, Lens Protocol
 */
export async function resolveBlockchainName(name: string): Promise<ResolvedName | null> {
  if (!name || typeof name !== 'string') return null
  
  const trimmed = name.trim()
  const normalizedName = trimmed.toLowerCase()
  
  // If it's already an address, return it
  if (isSupportedWalletAddress(trimmed)) {
    return {
      address: getAddressLookupKey(trimmed),
      name: trimmed,
      resolver: 'unknown'
    }
  }

  // Detect naming system from TLD
  if (normalizedName.endsWith('.eth') || normalizedName.endsWith('.base.eth') || normalizedName.endsWith('.farcaster.eth')) {
    return await resolveENS(normalizedName)
  }
  
  if (normalizedName.endsWith('.sol')) {
    return await resolveSNS(normalizedName)
  }

  if (normalizedName.endsWith('.btc')) {
    return await resolveBNS(normalizedName)
  }
  
  if (normalizedName.endsWith('.crypto') || normalizedName.endsWith('.nft') || 
      normalizedName.endsWith('.wallet') || normalizedName.endsWith('.x') || 
      normalizedName.endsWith('.dao') || normalizedName.endsWith('.blockchain') || 
      normalizedName.endsWith('.bitcoin') || normalizedName.endsWith('.zil')) {
    return await resolveUnstoppable(normalizedName)
  }
  
  if (normalizedName.endsWith('.arb')) {
    return await resolveSpaceID(normalizedName, 'arbitrum')
  }
  
  if (normalizedName.endsWith('.bnb')) {
    return await resolveSpaceID(normalizedName, 'bsc')
  }
  
  if (normalizedName.endsWith('.lens')) {
    return await resolveLens(normalizedName)
  }

  return null
}

/**
 * Reverse lookup: Resolve address to name across all systems
 */
export async function reverseResolveAddress(address: string): Promise<ResolvedName | null> {
  if (!address) {
    return null
  }

  const normalizedAddress = getAddressLookupKey(address)

  if (isSolanaAddress(address)) {
    const snsResult = await reverseResolveSNS(normalizedAddress)
    if (snsResult) return snsResult
    return null
  }

  if (!isEvmAddress(address)) {
    return null
  }
  
  const addrLower = normalizedAddress
  
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
          address,
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

// ========== Stacks BNS (.btc) Resolver ==========
async function resolveBNS(name: string): Promise<ResolvedName | null> {
  try {
    const response = await fetch(`https://api.hiro.so/v1/names/${name}`, {
      headers: { 'Accept': 'application/json' }
    })

    if (response.ok) {
      const data = await response.json()
      if (data.address) {
        return {
          address: data.address,
          name,
          resolver: 'bns'
        }
      }
    }
  } catch (error) {
    console.error(`Error resolving BNS "${name}":`, error)
  }
  return null
}

// ========== Unstoppable Domains Resolver ==========
async function resolveUnstoppable(name: string): Promise<ResolvedName | null> {
  try {
    // Skip Unstoppable Domains resolution from client-side due to CORS issues
    if (typeof window !== 'undefined') {
      // Client-side: Skip to avoid CORS errors that block the UI
      return null
    }
    
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
    
    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
    
    try {
      const response = await fetch(url, { 
        headers,
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
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
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      // Silently fail on CORS, timeout, or network errors
      if (fetchError.name === 'AbortError' || fetchError.message?.includes('CORS') || fetchError.message?.includes('Failed to fetch')) {
        return null
      }
      throw fetchError
    }
  } catch (error: any) {
    // Don't log CORS errors as they're expected from browser
    if (!error?.message?.includes('CORS') && !error?.message?.includes('Failed to fetch')) {
      console.error(`Error resolving Unstoppable "${name}":`, error)
    }
  }
  return null
}

async function reverseResolveUnstoppable(address: string): Promise<ResolvedName | null> {
  try {
    // Skip Unstoppable Domains resolution from client-side due to CORS issues
    // This API doesn't support CORS from browser, so it will always fail
    // If needed, this should be moved to a server-side API route
    if (typeof window !== 'undefined') {
      // Client-side: Skip to avoid CORS errors that block the UI
      return null
    }
    
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
    
    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
    
    try {
      const response = await fetch(url, { 
        headers,
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
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
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      // Silently fail on CORS, timeout, or network errors
      if (fetchError.name === 'AbortError' || fetchError.message?.includes('CORS') || fetchError.message?.includes('Failed to fetch')) {
        return null
      }
      throw fetchError
    }
  } catch (error: any) {
    // Silently fail - not all addresses have Unstoppable domains
    // Don't log CORS errors as they're expected from browser
    if (error?.message?.includes('CORS') || error?.message?.includes('Failed to fetch')) {
      return null
    }
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
