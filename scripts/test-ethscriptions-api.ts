// Test script to verify Facet API response format
// Run with: npx tsx scripts/test-ethscriptions-api.ts

import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const ETHSCRIPTIONS_API_BASE = 'https://api.ethscriptions.com/v2'

async function resolveENS(ensName: string): Promise<string | null> {
  try {
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    })
    const address = await publicClient.getEnsAddress({ name: ensName })
    return address ? address.toLowerCase() : null
  } catch (error) {
    console.error(`Error resolving ENS "${ensName}":`, error)
    return null
  }
}

async function testEthscriptionsAPI(address: string) {
  console.log(`\n🔍 Testing Ethscriptions API for address: ${address}`)
  console.log(`📡 Fetching from: ${ETHSCRIPTIONS_API_BASE}/ethscriptions?address=${address}\n`)

  try {
    const response = await fetch(
      `${ETHSCRIPTIONS_API_BASE}/ethscriptions?address=${address.toLowerCase()}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    )

    console.log(`Status: ${response.status} ${response.statusText}`)
    console.log(`Content-Type: ${response.headers.get('content-type')}\n`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Error response:`, errorText)
      return
    }

    const data = await response.json()
    console.log(`✅ Response received`)
    console.log(`📦 Response type:`, Array.isArray(data) ? 'Array' : typeof data)
    
    if (!Array.isArray(data)) {
      console.log(`📊 Response keys:`, Object.keys(data))
    }
    
    // Check different possible response formats
    const ethscriptions = Array.isArray(data) 
      ? data 
      : (data?.result || data?.results || data?.ethscriptions || data?.data || [])

    console.log(`\n📈 Found ${ethscriptions.length} ethscription(s)\n`)

    if (ethscriptions.length > 0) {
      console.log(`📝 First ethscription structure:`)
      console.log(JSON.stringify(ethscriptions[0], null, 2))
      
      // Check for key fields
      const first = ethscriptions[0]
      console.log(`\n🔑 Key fields found:`)
      console.log(`  - id: ${first.id || first.ethscription_id || first.transaction_hash || 'NOT FOUND'}`)
      console.log(`  - content_uri: ${first.content_uri || first.contentUri || first.uri || 'NOT FOUND'}`)
      console.log(`  - mimetype: ${first.mimetype || first.mime_type || 'NOT FOUND'}`)
      console.log(`  - creator: ${first.creator || first.creator_address || 'NOT FOUND'}`)
      console.log(`  - created_at: ${first.created_at || first.timestamp || 'NOT FOUND'}`)
      console.log(`  - owner: ${first.owner || first.owner_address || 'NOT FOUND'}`)
      
      // Show a few more if available
      if (ethscriptions.length > 1) {
        console.log(`\n📋 Sample of ${Math.min(3, ethscriptions.length)} ethscriptions:`)
        ethscriptions.slice(0, 3).forEach((eth: any, idx: number) => {
          console.log(`\n  ${idx + 1}. ID: ${eth.id || eth.ethscription_id || eth.transaction_hash || 'N/A'}`)
          console.log(`     MIME: ${eth.mimetype || eth.mime_type || 'N/A'}`)
          console.log(`     URI: ${(eth.content_uri || eth.contentUri || eth.uri || 'N/A').substring(0, 80)}...`)
        })
      }
    } else {
      console.log(`ℹ️  No ethscriptions found for this address`)
    }

  } catch (error) {
    console.error(`❌ Error:`, error)
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`)
      console.error(`   Stack: ${error.stack}`)
    }
  }
}

async function main() {
  const testAddress = process.argv[2] || 'artiefishal.eth'
  
  console.log(`🧪 Ethscriptions API Test Script`)
  console.log(`================================\n`)

  // Resolve ENS if needed
  let address = testAddress
  if (testAddress.endsWith('.eth')) {
    console.log(`🔗 Resolving ENS: ${testAddress}`)
    const resolved = await resolveENS(testAddress)
    if (resolved) {
      address = resolved
      console.log(`✅ Resolved to: ${address}\n`)
    } else {
      console.error(`❌ Failed to resolve ENS name`)
      process.exit(1)
    }
  } else if (!testAddress.startsWith('0x') || testAddress.length !== 42) {
    console.error(`❌ Invalid address format. Expected ENS name (.eth) or 0x address`)
    process.exit(1)
  }

  await testEthscriptionsAPI(address)
}

main().catch(console.error)

