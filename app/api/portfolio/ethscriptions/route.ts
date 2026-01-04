import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, isAddress } from 'viem'
import { mainnet } from 'viem/chains'

const ETHSCRIPTIONS_API_BASE = 'https://api.ethscriptions.com/v2'

async function resolveENS(ensName: string): Promise<string | null> {
  if (!ensName.endsWith('.eth')) {
    if (isAddress(ensName)) {
      return ensName.toLowerCase()
    }
    return null
  }

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

export async function POST(request: NextRequest) {
  try {
    const { addresses } = await request.json()

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json(
        { error: 'Addresses array required' },
        { status: 400 }
      )
    }

    const allAssets = []

    for (const inputAddress of addresses) {
      try {
        // Resolve ENS if needed
        const address = await resolveENS(inputAddress)
        if (!address) {
          console.warn(`Could not resolve address/ENS: ${inputAddress}`)
          continue
        }

        // Fetch ethscriptions
        const response = await fetch(
          `${ETHSCRIPTIONS_API_BASE}/ethscriptions?address=${address}`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        )

        if (!response.ok) {
          console.error(`Error fetching ethscriptions for ${address}: ${response.statusText}`)
          continue
        }

        const data = await response.json()
        
        // Handle response format: { result: [...], pagination: {...} }
        const ethscriptions = data?.result || []

        if (Array.isArray(ethscriptions)) {
          for (const ethscription of ethscriptions) {
            if (ethscription && typeof ethscription === 'object') {
              // Extract fields from API response
              const ethscriptionId = ethscription.transaction_hash
              const contentUri = ethscription.content_uri
              const mimetype = ethscription.mimetype || 'unknown'
              const ethscriptionNumber = ethscription.ethscription_number
              
              // Determine name and symbol based on mimetype
              let name = 'Ethscription'
              let symbol = 'ETHSCRIPTION'
              
              if (mimetype.startsWith('image/')) {
                name = `Ethscription Image #${ethscriptionNumber}`
                symbol = 'IMG'
              } else if (mimetype.startsWith('text/')) {
                name = `Ethscription Text #${ethscriptionNumber}`
                symbol = 'TXT'
              } else if (mimetype.includes('json')) {
                name = `Ethscription JSON #${ethscriptionNumber}`
                symbol = 'JSON'
              } else {
                name = `Ethscription #${ethscriptionNumber}`
              }

              // Get image URL if it's an image
              let imageUrl: string | undefined
              if (mimetype.startsWith('image/') && contentUri) {
                // content_uri is already a data URI, use it directly
                if (contentUri.startsWith('data:')) {
                  imageUrl = contentUri
                } else if (contentUri.startsWith('http')) {
                  imageUrl = contentUri
                }
              }

              allAssets.push({
                id: `ethscription-${address}-${ethscriptionId}`,
                chain: 'eth',
                type: 'ethscription',
                symbol,
                name,
                balance: '1',
                balanceFormatted: '1',
                walletAddress: address,
                ethscriptionId,
                contentUri,
                imageUrl,
                metadata: {
                  mimetype,
                  mediaType: ethscription.media_type,
                  mimeSubtype: ethscription.mime_subtype,
                  creator: ethscription.creator,
                  currentOwner: ethscription.current_owner,
                  blockNumber: ethscription.block_number,
                  blockTimestamp: ethscription.block_timestamp,
                  transactionHash: ethscription.transaction_hash,
                  ethscriptionNumber: ethscriptionNumber,
                  ...ethscription,
                },
              })
            }
          }
        }
      } catch (error) {
        console.error(`Error processing ethscriptions for ${inputAddress}:`, error)
      }
    }

    return NextResponse.json({ assets: allAssets })
  } catch (error) {
    console.error('Error in ethscriptions portfolio API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ethscriptions' },
      { status: 500 }
    )
  }
}

