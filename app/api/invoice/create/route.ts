import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

// Payment receiver address - can be ENS name or 0x address
// If ENS name, it will be resolved automatically
const PAYMENT_RECEIVER_ADDRESS = process.env.PAYMENT_RECEIVER_ADDRESS || '0x016ae25Ac494B123C40EDb2418d9b1FC2d62279b' // lastwish.eth resolved address

// Payment in ETH (testing amount)
// Using native ETH on Ethereum mainnet
const PAYMENT_AMOUNT = '0.000025' // 0.000025 ETH
const PAYMENT_TOKEN = null // Native ETH (no token contract)
const PAYMENT_CHAIN = 'ethereum'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const discountCode = body.discountCode?.toLowerCase().trim() || ''
    
    // Check for discount code (accept common variations)
    const normalizedCode = discountCode.replace(/[^a-z0-9]/g, '') // Remove special chars
    const validDiscountCodes: Record<string, number> = {
      'tryitfree': 100, // 100% discount (accepts tryitfree, try-it-free, try_it_free, etc.)
    }
    
    const discountPercent = validDiscountCodes[normalizedCode] || 0
    const discountApplied = discountPercent === 100
    
    const invoiceId = uuidv4()

    const invoice = {
      id: invoiceId,
      amount: discountApplied ? '0' : PAYMENT_AMOUNT,
      originalAmount: PAYMENT_AMOUNT,
      discountPercent,
      discountApplied,
      token: PAYMENT_TOKEN, // null for native ETH
      chain: PAYMENT_CHAIN,
      recipientAddress: PAYMENT_RECEIVER_ADDRESS,
      status: discountApplied ? 'paid' as const : 'pending' as const,
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json({ invoice, discountApplied })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}

