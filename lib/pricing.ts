/**
 * Pricing configuration for LastWish.eth
 * New Year's Special: $26.20 (valid until February 1, 2025)
 * Regular Price: $42.00 (after February 1, 2025)
 */

// Approximate ETH price for conversion (can be updated or fetched dynamically)
const ETH_PRICE_USD = 3000 // Approximate ETH price in USD

// Special pricing end date (February 1, 2025)
const SPECIAL_END_DATE = new Date('2025-02-01T00:00:00Z')

export interface PricingInfo {
  usdAmount: number
  ethAmount: string
  isSpecial: boolean
  label: string
  regularPrice?: number // Regular price for comparison
}

/**
 * Get current pricing based on date
 * Returns special price ($26.20) before February 1, 2025, regular price ($42.00) after
 */
export function getCurrentPricing(): PricingInfo {
  const now = new Date()
  const isSpecial = now < SPECIAL_END_DATE
  
  const usdAmount = isSpecial ? 26.20 : 42.00
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

