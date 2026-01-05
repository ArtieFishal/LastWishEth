/**
 * Pricing configuration for LastWish.eth
 * Tiered pricing system:
 * - Free: $0 (1 wallet, 2 beneficiaries)
 * - Standard: $20.26 special / $42.00 regular (20 wallets, 10 beneficiaries)
 * - Premium: $99 (Unlimited wallets, Unlimited beneficiaries, 2-year updates)
 */

// Approximate ETH price for conversion (can be updated or fetched dynamically)
const ETH_PRICE_USD = 3000 // Approximate ETH price in USD

// Special pricing end date (February 1, 2026)
const SPECIAL_END_DATE = new Date('2026-02-01T00:00:00Z')

export type PricingTier = 'free' | 'standard' | 'premium'

export interface PricingInfo {
  usdAmount: number
  ethAmount: string
  isSpecial: boolean
  label: string
  regularPrice?: number // Regular price for comparison
  tier: PricingTier
  maxWallets: number | null // null = unlimited
  maxBeneficiaries: number | null // null = unlimited
  includesUpdates: boolean
  updateYears?: number
  prioritySupport: boolean
}

export interface TierInfo {
  tier: PricingTier
  name: string
  price: number
  ethAmount: string
  maxWallets: number | null
  maxBeneficiaries: number | null
  includesUpdates: boolean
  updateYears?: number
  prioritySupport: boolean
  features: string[]
}

/**
 * Get all available pricing tiers
 */
export function getAllTiers(): TierInfo[] {
  const standardPricing = getTierPricing('standard')
  const premiumPricing = getTierPricing('premium')
  
  return [
    {
      tier: 'free',
      name: 'Free',
      price: 0,
      ethAmount: '0',
      maxWallets: 1,
      maxBeneficiaries: 2,
      includesUpdates: false,
      prioritySupport: false,
      features: [
        '1 wallet',
        '2 beneficiaries',
        'Full Color PDF'
      ]
    },
    {
      tier: 'standard',
      name: 'Standard',
      price: standardPricing.usdAmount,
      ethAmount: standardPricing.ethAmount,
      maxWallets: 20,
      maxBeneficiaries: 10,
      includesUpdates: false,
      prioritySupport: false,
      features: [
        '20 wallets',
        '10 beneficiaries',
        'Full Color PDF'
      ]
    },
    {
      tier: 'premium',
      name: 'Premium',
      price: premiumPricing.usdAmount,
      ethAmount: premiumPricing.ethAmount,
      maxWallets: null, // unlimited
      maxBeneficiaries: null, // unlimited
      includesUpdates: true,
      updateYears: 2,
      prioritySupport: true,
      features: [
        'Unlimited wallets',
        'Unlimited beneficiaries',
        'Priority support',
        'PDF updates (2 years)'
      ]
    }
  ]
}

/**
 * Get pricing for a specific tier
 */
export function getTierPricing(tier: PricingTier): PricingInfo {
  const now = new Date()
  const isSpecial = now < SPECIAL_END_DATE
  
  if (tier === 'free') {
    return {
      usdAmount: 0,
      ethAmount: '0',
      isSpecial: false,
      label: 'Free',
      tier: 'free',
      maxWallets: 1,
      maxBeneficiaries: 2,
      includesUpdates: false,
      prioritySupport: false
    }
  }
  
  if (tier === 'premium') {
    const usdAmount = 99.00
    const ethAmount = (usdAmount / ETH_PRICE_USD).toFixed(6)
    return {
      usdAmount,
      ethAmount,
      isSpecial: false,
      label: 'Premium',
      tier: 'premium',
      maxWallets: null, // unlimited
      maxBeneficiaries: null, // unlimited
      includesUpdates: true,
      updateYears: 2,
      prioritySupport: true
    }
  }
  
  // Standard tier
  const usdAmount = isSpecial ? 20.26 : 42.00
  const ethAmount = (usdAmount / ETH_PRICE_USD).toFixed(6)
  
  return {
    usdAmount,
    ethAmount,
    isSpecial,
    label: isSpecial ? 'New Year\'s Special' : 'Regular Price',
    regularPrice: isSpecial ? 42.00 : undefined,
    tier: 'standard',
    maxWallets: 20,
    maxBeneficiaries: 10,
    includesUpdates: false,
    prioritySupport: false
  }
}

/**
 * Get current pricing based on date (for Standard tier)
 * Returns special price ($20.26 - celebrating 2026!) before February 1, 2026, regular price ($42.00) after
 * @deprecated Use getTierPricing('standard') instead
 */
export function getCurrentPricing(): PricingInfo {
  return getTierPricing('standard')
}

/**
 * Get formatted price display with USD and ETH
 */
export function getFormattedPrice(tier: PricingTier = 'standard'): string {
  const pricing = getTierPricing(tier)
  if (pricing.usdAmount === 0) {
    return 'Free'
  }
  return `$${pricing.usdAmount.toFixed(2)} (${pricing.ethAmount} ETH)`
}

/**
 * Get ETH amount as string for transaction
 */
export function getPaymentAmountETH(tier: PricingTier = 'standard'): string {
  return getTierPricing(tier).ethAmount
}
