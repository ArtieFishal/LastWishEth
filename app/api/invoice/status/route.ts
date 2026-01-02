import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, formatUnits, isAddress } from 'viem'
import { mainnet } from 'viem/chains'

// Default to the actual address for lastwish.eth
// Can be overridden with environment variable (supports both ENS names and addresses)
const PAYMENT_RECEIVER_ADDRESS = process.env.PAYMENT_RECEIVER_ADDRESS || '0x016ae25Ac494B123C40EDb2418d9b1FC2d62279b'
const PAYMENT_AMOUNT = '0.000025' // 0.000025 ETH (testing amount)
const ETHERSCAN_API_URL = 'https://api.etherscan.io/api'

// Resolve ENS name to address using Ethereum mainnet (ENS is on mainnet)
const resolveENS = async (ensName: string): Promise<string | null> => {
  if (!ensName.endsWith('.eth')) {
    // Not an ENS name, check if it's already an address
    if (isAddress(ensName)) {
      return ensName.toLowerCase()
    }
    return null
  }

  try {
    // Create public client for Ethereum mainnet (ENS is on mainnet)
    const mainnetClient = createPublicClient({
      chain: mainnet,
      transport: http('https://eth.llamarpc.com'), // Public Ethereum RPC
    })

    // Resolve ENS name to address
    const address = await mainnetClient.getEnsAddress({
      name: ensName,
    })

    if (address) {
      console.log(`Resolved ENS "${ensName}" to address: ${address}`)
      return address.toLowerCase()
    }

    return null
  } catch (error) {
    console.error(`Error resolving ENS "${ensName}":`, error)
    return null
  }
}

// Fallback verification using RPC to check recent transactions
async function verifyViaRPC(
  fromAddress: string,
  recipientAddress: string,
  requiredAmountWeiMin: bigint,
  requiredAmountWeiMax: bigint,
  invoiceId: string
): Promise<NextResponse> {
  try {
    // Create public client for Ethereum mainnet
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http('https://eth.llamarpc.com'),
    })

    // Get current block number
    const currentBlock = await publicClient.getBlockNumber()
    
    // Check last 100 blocks (approximately 20 minutes)
    const blocksToCheck = BigInt(100)
    const startBlock = currentBlock > blocksToCheck ? currentBlock - blocksToCheck : BigInt(0)
    
    // Get transactions for the last few blocks
    // Note: This is a simplified approach - we can't easily get all transactions from an address via RPC
    // For production, you'd want to use an indexer service
    
    // For now, return pending with helpful message
    return NextResponse.json({
      status: 'pending',
      invoiceId,
      message: 'Payment verification is checking your transaction. If you just sent the payment, please wait 10-30 seconds for it to be confirmed on-chain, then try again. Make sure you sent exactly 0.006 ETH (~$20.26) from your connected wallet to the recipient address on Ethereum mainnet.',
    })
  } catch (error: any) {
    console.error('RPC verification error:', error)
    return NextResponse.json({
      status: 'pending',
      invoiceId,
      message: 'Payment verification service is experiencing issues. Please try again in a moment, or contact support if the problem persists.',
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, fromAddress } = await request.json()

    if (!invoiceId || !fromAddress) {
      return NextResponse.json(
        { error: 'Invoice ID and from address required' },
        { status: 400 }
      )
    }

    // Validate fromAddress
    if (!isAddress(fromAddress)) {
      return NextResponse.json(
        { error: 'Invalid from address' },
        { status: 400 }
      )
    }

    // Get recipient address - resolve ENS if needed
    let recipientAddress: string | null = null
    
    if (isAddress(PAYMENT_RECEIVER_ADDRESS)) {
      // Already an address
      recipientAddress = PAYMENT_RECEIVER_ADDRESS.toLowerCase()
      console.log(`[Payment Verification] Using recipient address: ${recipientAddress}`)
    } else if (PAYMENT_RECEIVER_ADDRESS.endsWith('.eth')) {
      // Try to resolve ENS name
      console.log(`[Payment Verification] Resolving ENS name: ${PAYMENT_RECEIVER_ADDRESS}`)
      recipientAddress = await resolveENS(PAYMENT_RECEIVER_ADDRESS)
      
      if (!recipientAddress) {
        console.error(`[Payment Verification] Failed to resolve ENS name: ${PAYMENT_RECEIVER_ADDRESS}`)
        return NextResponse.json({
          status: 'pending',
          invoiceId,
          message: `Could not resolve ENS name "${PAYMENT_RECEIVER_ADDRESS}" to an address. Please ensure the ENS name is correct or set PAYMENT_RECEIVER_ADDRESS to the actual 0x address.`,
        })
      }
      console.log(`[Payment Verification] Resolved ${PAYMENT_RECEIVER_ADDRESS} to: ${recipientAddress}`)
    } else {
      return NextResponse.json({
        status: 'pending',
        invoiceId,
        message: `Invalid recipient address format. Please set PAYMENT_RECEIVER_ADDRESS to either a 0x address or a valid ENS name.`,
      })
    }
    
    console.log(`[Payment Verification] Checking transactions from ${fromAddress} to ${recipientAddress}`)

    // Convert payment amount to wei for comparison
    const requiredAmountWei = BigInt(Math.floor(parseFloat(PAYMENT_AMOUNT) * 1e18))
    const requiredAmountWeiMin = requiredAmountWei - BigInt(Math.floor(parseFloat(PAYMENT_AMOUNT) * 1e15)) // Allow 0.1% tolerance
    const requiredAmountWeiMax = requiredAmountWei + BigInt(Math.floor(parseFloat(PAYMENT_AMOUNT) * 1e15))

    try {
      // Use Etherscan API to get recent transactions from the user's address
      // Etherscan is free and doesn't require API key for basic usage
      const etherscanUrl = `${ETHERSCAN_API_URL}?module=account&action=txlist&address=${fromAddress}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc`
      
      let response: Response
      let data: any
      
      try {
        response = await fetch(etherscanUrl, {
          headers: {
            'Accept': 'application/json',
          },
          // Add timeout
          signal: AbortSignal.timeout(10000), // 10 second timeout
        })
        
        if (!response.ok) {
          console.error(`Etherscan API HTTP error: ${response.status} ${response.statusText}`)
          // Try alternative: use public RPC to get recent transactions
          return await verifyViaRPC(fromAddress, recipientAddress, requiredAmountWeiMin, requiredAmountWeiMax, invoiceId)
        }

        data = await response.json()
        
        // Handle different response formats
        if (data.status === '0') {
          if (data.message === 'No transactions found' || data.message === 'NOTOK') {
            return NextResponse.json({
              status: 'pending',
              invoiceId,
              message: 'No recent transactions found from your address. Please ensure you have sent the payment and wait a few moments for confirmation.',
            })
          }
          // If status is 0 but we have a result, continue checking
          if (!data.result || !Array.isArray(data.result)) {
            console.error('Etherscan API returned error:', data.message || data)
            // Try RPC fallback
            return await verifyViaRPC(fromAddress, recipientAddress, requiredAmountWeiMin, requiredAmountWeiMax, invoiceId)
          }
        }

        if (data.status !== '1' && (!data.result || !Array.isArray(data.result))) {
          console.error('Unexpected Etherscan response format:', JSON.stringify(data, null, 2))
          // Try RPC fallback
          return await verifyViaRPC(fromAddress, recipientAddress, requiredAmountWeiMin, requiredAmountWeiMax, invoiceId)
        }

        // Check recent transactions (last 10)
        // Handle both array and object result formats
        const transactions = Array.isArray(data.result) ? data.result.slice(0, 10) : []
      
      console.log(`[Payment Verification] Found ${transactions.length} recent transactions from ${fromAddress}`)
      
      if (transactions.length === 0) {
        return NextResponse.json({
          status: 'pending',
          invoiceId,
          message: 'No recent transactions found from your address. Please ensure you have sent the payment and wait a few moments for confirmation.',
        })
      }
      
      // Log all transactions for debugging
      console.log(`[Payment Verification] Recent transactions:`, transactions.map((tx: any) => ({
        hash: tx.hash,
        from: tx.from?.toLowerCase(),
        to: tx.to?.toLowerCase(),
        value: tx.value,
        timeStamp: tx.timeStamp,
        isError: tx.isError,
        txreceipt_status: tx.txreceipt_status,
      })))
      
      // Find a transaction that matches:
      // 1. To the recipient address
      // 2. Amount matches (within tolerance)
      // 3. Recent (within last 24 hours - more lenient for testing)
      const now = Math.floor(Date.now() / 1000)
      const oneDayAgo = now - 86400
      
      console.log(`[Payment Verification] Looking for transactions to ${recipientAddress} from ${fromAddress.toLowerCase()}`)
      console.log(`[Payment Verification] Amount range: ${requiredAmountWeiMin.toString()} - ${requiredAmountWeiMax.toString()} wei`)
      console.log(`[Payment Verification] Time range: after ${oneDayAgo} (${new Date(oneDayAgo * 1000).toISOString()})`)
      console.log(`[Payment Verification] Recipient address (normalized): ${recipientAddress}`)
      console.log(`[Payment Verification] From address (normalized): ${fromAddress.toLowerCase()}`)

      const matchingTransaction = transactions.find((tx: any) => {
        const txTo = tx.to?.toLowerCase()
        const txFrom = tx.from?.toLowerCase()
        const txValue = BigInt(tx.value || '0')
        const txTime = parseInt(tx.timeStamp || '0')
        
        // Check if transaction is to recipient (case-insensitive comparison)
        if (!txTo || txTo !== recipientAddress.toLowerCase()) {
          return false
        }
        
        // Check if transaction is from the user (case-insensitive comparison)
        if (!txFrom || txFrom !== fromAddress.toLowerCase()) {
          return false
        }
        
        // Check amount matches (within tolerance)
        if (txValue < requiredAmountWeiMin || txValue > requiredAmountWeiMax) {
          return false
        }
        
      // Check transaction is recent (within last 24 hours - more lenient)
      const oneDayAgo = now - 86400
      if (txTime < oneDayAgo) {
        return false
        }
        
        // Check transaction is successful
        // Etherscan uses '1' for success, '0' for failure, or isError field
        const isSuccess = tx.txreceipt_status === '1' || (tx.isError === '0' || tx.isError === '1' && tx.txreceipt_status !== '0')
        if (!isSuccess) {
          return false
        }
        
        return true
      })

      if (matchingTransaction) {
        console.log(`[Payment Verification] ✅ Found matching transaction: ${matchingTransaction.hash}`)
        return NextResponse.json({
          status: 'paid',
          invoiceId,
          transactionHash: matchingTransaction.hash,
          amount: formatUnits(BigInt(matchingTransaction.value), 18),
          blockNumber: matchingTransaction.blockNumber,
          timestamp: matchingTransaction.timeStamp,
          message: 'Payment verified successfully!',
        })
      }
      
      console.log(`[Payment Verification] ❌ No matching transaction found`)

      // If no matching transaction found, provide helpful feedback
      const recentToRecipient = transactions.filter((tx: any) => 
        tx.to?.toLowerCase() === recipientAddress && 
        tx.from?.toLowerCase() === fromAddress.toLowerCase()
      )

      if (recentToRecipient.length > 0) {
        // Found transactions to recipient but amount doesn't match
        const latest = recentToRecipient[0]
        const latestAmount = formatUnits(BigInt(latest.value || '0'), 18)
        return NextResponse.json({
          status: 'pending',
          invoiceId,
          message: `Found a transaction to the recipient, but amount doesn't match. Expected: ${PAYMENT_AMOUNT} ETH, Found: ${latestAmount} ETH. Transaction hash: ${latest.hash}`,
        })
      }

      return NextResponse.json({
        status: 'pending',
        invoiceId,
        message: 'No matching payment transaction found. Please ensure you have sent exactly 0.000025 ETH from your connected wallet to the recipient address on Ethereum mainnet.',
      })
      } catch (innerError: any) {
        // Handle errors from the inner try block (Etherscan API call)
        console.error('Error in Etherscan API call:', innerError)
        
        // If it's a timeout or network error, try RPC fallback
        if (innerError.name === 'AbortError' || innerError.message?.includes('timeout') || innerError.message?.includes('fetch')) {
          console.log('Etherscan API timeout/network error, trying RPC fallback...')
          return await verifyViaRPC(fromAddress, recipientAddress, requiredAmountWeiMin, requiredAmountWeiMax, invoiceId)
        }
        
        return NextResponse.json({
          status: 'pending',
          invoiceId,
          message: `Payment verification error: ${innerError.message || 'Unknown error'}. Please try again in a moment. If the problem persists, ensure you sent exactly 0.000025 ETH from your connected wallet to the recipient address on Ethereum mainnet.`,
        })
      }
    } catch (error: any) {
      console.error('Error checking payment status:', error)
      
      // If it's a timeout or network error, try RPC fallback
      if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('fetch')) {
        console.log('Etherscan API timeout/network error, trying RPC fallback...')
        return await verifyViaRPC(fromAddress, recipientAddress, requiredAmountWeiMin, requiredAmountWeiMax, invoiceId)
      }
      
      return NextResponse.json({
        status: 'pending',
        invoiceId,
        message: `Payment verification error: ${error.message || 'Unknown error'}. Please try again in a moment.`,
      })
    }
  } catch (error: any) {
    console.error('Error in invoice status API:', error)
    return NextResponse.json(
      { error: 'Failed to check invoice status', details: error.message },
      { status: 500 }
    )
  }
}

