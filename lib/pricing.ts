/**
 * Pricing configuration for LastWish.eth
 * New Year's Special: $20.26 (2026 = $20.26, valid until February 1, 2026)
 * Regular Price: $42.00 (after February 1, 2026)
 */

// Approximate ETH price for conversion (can be updated or fetched dynamically)
const ETH_PRICE_USD = 3000 // Approximate ETH price in USD

// Special pricing end date (February 1, 2026)
const SPECIAL_END_DATE = new Date('2026-02-01T00:00:00Z')

export interface PricingInfo {
  usdAmount: number
  ethAmount: string
  isSpecial: boolean
  label: string
  regularPrice?: number // Regular price for comparison
}

/**
 * Get current pricing based on date
 * Returns special price ($20.26 - celebrating 2026!) before February 1, 2026, regular price ($42.00) after
 */
export function getCurrentPricing(): PricingInfo {
  const now = new Date()
  const isSpecial = now < SPECIAL_END_DATE
  
  const usdAmount = isSpecial ? 20.26 : 42.00
  const ethAmount = (usdAmount / ETH_PRICE_USD).toFixed(6)
  
  return {
    usdAmount,
    ethAmount,
    isSpecial,
    label: isSpecial ? 'New Year\'s Special' : 'Regular Price',
    regularPrice: isSpecial ? 42.00 : undefined,
  }
}

/**
 * Get formatted price display with USD and ETH
 */
export function getFormattedPrice(): string {
  const pricing = getCurrentPricing()
  return `$${pricing.usdAmount.toFixed(2)} (${pricing.ethAmount} ETH)`
}

/**
 * Get ETH amount as string for transaction
 */
export function getPaymentAmountETH(): string {
  return getCurrentPricing().ethAmount
}

