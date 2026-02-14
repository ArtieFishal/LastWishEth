import { isAddress } from 'viem'
import { resolveBlockchainName } from './name-resolvers'

export interface ReferralInfo {
  code: string // Original code from URL
  resolvedAddress: string | null // Resolved wallet address (if applicable)
  type: 'wallet' | 'ref-code' | 'ens' | 'invalid'
  discountAmount: number // Flat $20 discount
}

/**
 * Flat referral discount amount
 */
export const REFERRAL_DISCOUNT_USD = 20.00

/**
 * Generate deterministic referral code from wallet address
 * Format: REF-{first8chars}
 */
export function generateReferralCode(walletAddress: string): string {
  if (!walletAddress || !walletAddress.startsWith('0x')) {
    throw new Error('Invalid wallet address')
  }
  const hash = walletAddress.slice(2, 10).toUpperCase()
  return `REF-${hash}`
}

/**
 * Parse referral code from URL query parameter
 * Supports: wallet addresses, REF- codes, ENS names
 */
export function parseReferralFromURL(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('ref') || null
}

/**
 * Validate and resolve referral code
 * Returns referral info with resolved address if applicable
 */
export async function validateAndResolveReferral(
  code: string
): Promise<ReferralInfo> {
  if (!code || typeof code !== 'string') {
    return {
      code: '',
      resolvedAddress: null,
      type: 'invalid',
      discountAmount: 0
    }
  }

  const trimmed = code.trim()

  // Check if it's a wallet address (0x...)
  if (isAddress(trimmed)) {
    return {
      code: trimmed,
      resolvedAddress: trimmed.toLowerCase(),
      type: 'wallet',
      discountAmount: REFERRAL_DISCOUNT_USD
    }
  }

  // Check if it's a REF- code format
  if (/^REF-[A-F0-9]{8}$/i.test(trimmed)) {
    return {
      code: trimmed.toUpperCase(),
      resolvedAddress: null, // Can't reverse REF- code to address
      type: 'ref-code',
      discountAmount: REFERRAL_DISCOUNT_USD
    }
  }

  // Check if it's an ENS name (ends with .eth, .base.eth, etc.)
  if (trimmed.includes('.') && (trimmed.endsWith('.eth') || trimmed.includes('.eth'))) {
    try {
      const resolved = await resolveBlockchainName(trimmed)
      if (resolved && resolved.address) {
        return {
          code: trimmed,
          resolvedAddress: resolved.address.toLowerCase(),
          type: 'ens',
          discountAmount: REFERRAL_DISCOUNT_USD
        }
      }
    } catch (error) {
      console.error('Error resolving ENS for referral:', error)
    }
  }

  // Invalid code
  return {
    code: trimmed,
    resolvedAddress: null,
    type: 'invalid',
    discountAmount: 0
  }
}

/**
 * Calculate final price with referral discount
 * Returns the discounted USD amount and ETH equivalent
 */
export function calculateReferralPrice(
  originalUsdAmount: number,
  discountAmount: number,
  ethPriceUsd: number = 3000
): { usdAmount: number; ethAmount: string } {
  const finalUsd = Math.max(0, originalUsdAmount - discountAmount)
  const ethAmount = (finalUsd / ethPriceUsd).toFixed(6)
  return {
    usdAmount: finalUsd,
    ethAmount
  }
}

/**
 * Format referral code for sharing
 */
export function formatReferralLink(code: string, baseUrl?: string): string {
  const url = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${url}/app?ref=${encodeURIComponent(code)}`
}
