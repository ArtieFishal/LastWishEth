import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getTierPricing, getPaymentAmountETH, PricingTier } from '@/lib/pricing'

// Payment receiver address - can be ENS name or 0x address
// If ENS name, it will be resolved automatically
const PAYMENT_RECEIVER_ADDRESS = process.env.PAYMENT_RECEIVER_ADDRESS || '0x016ae25Ac494B123C40EDb2418d9b1FC2d62279b' // lastwish.eth resolved address

// Payment amount is now dynamic based on tier and date (New Year's special vs regular price)
// Using native ETH on Ethereum mainnet
const PAYMENT_TOKEN = null // Native ETH (no token contract)
const PAYMENT_CHAIN = 'ethereum'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const discountCode = body.discountCode?.toLowerCase().trim() || ''
    const tier: PricingTier = body.tier || 'standard' // Default to standard if not provided
    
    // Check for discount code (accept common variations)
    const normalizedCode = discountCode.replace(/[^a-z0-9]/g, '') // Remove special chars
    const validDiscountCodes: Record<string, number> = {
      'tryitfree': 100, // 100% discount (accepts tryitfree, try-it-free, try_it_free, etc.)
    }
    
    const discountPercent = validDiscountCodes[normalizedCode] || 0
    const discountApplied = discountPercent === 100
    
    // Get pricing for selected tier
    const pricing = getTierPricing(tier)
    const paymentAmount = getPaymentAmountETH(tier)
    
    // Free tier is always free
    const isFree = tier === 'free' || pricing.usdAmount === 0
    
    const invoiceId = uuidv4()

    const invoice = {
      id: invoiceId,
      amount: (isFree || discountApplied) ? '0' : paymentAmount,
      originalAmount: paymentAmount,
      usdAmount: pricing.usdAmount,
      isSpecial: pricing.isSpecial,
      tier: tier,
      discountPercent,
      discountApplied: isFree || discountApplied,
      token: PAYMENT_TOKEN, // null for native ETH
      chain: PAYMENT_CHAIN,
      recipientAddress: PAYMENT_RECEIVER_ADDRESS,
      status: (isFree || discountApplied) ? 'paid' as const : 'pending' as const,
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json({ invoice, discountApplied: isFree || discountApplied })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}

