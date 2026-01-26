import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const transactionHash = searchParams.get('id')

    if (!transactionHash) {
      return NextResponse.json(
        { error: 'Ethscription transaction hash required' },
        { status: 400 }
      )
    }

    // Fetch ethscription data from API first to get the content_uri
    try {
      const ethscriptionResponse = await fetch(
        `https://api.ethscriptions.com/v2/ethscriptions/${transactionHash}`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          signal: AbortSignal.timeout(10000),
        }
      )

      if (ethscriptionResponse.ok) {
        const ethscriptionData = await ethscriptionResponse.json()
        const contentUri = ethscriptionData?.content_uri || ethscriptionData?.contentUri
        const mimetype = ethscriptionData?.mimetype || ethscriptionData?.mime_type

        // If content_uri is a data URI with image data, decode and return it
        if (contentUri && contentUri.startsWith('data:image/')) {
          const base64Data = contentUri.split(',')[1]
          if (base64Data) {
            try {
              const imageBuffer = Buffer.from(base64Data, 'base64')
              return new NextResponse(imageBuffer, {
                headers: {
                  'Content-Type': mimetype || 'image/png',
                  'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
                  'Access-Control-Allow-Origin': '*',
                },
              })
            } catch (error) {
              console.error(`[Ethscription Image API] Failed to decode base64 data:`, error)
            }
          }
        }

        // If content_uri is a regular URL, fetch it
        if (contentUri && (contentUri.startsWith('http://') || contentUri.startsWith('https://'))) {
          try {
            const imageResponse = await fetch(contentUri, {
              headers: {
                'Accept': 'image/*',
                'User-Agent': 'Mozilla/5.0',
              },
              signal: AbortSignal.timeout(10000),
            })

            if (imageResponse.ok) {
              const contentType = imageResponse.headers.get('content-type') || mimetype || 'image/png'
              if (contentType.startsWith('image/')) {
                const imageBuffer = await imageResponse.arrayBuffer()
                return new NextResponse(imageBuffer, {
                  headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
                    'Access-Control-Allow-Origin': '*',
                  },
                })
              }
            }
          } catch (error) {
            console.error(`[Ethscription Image API] Failed to fetch from content_uri:`, error)
          }
        }
      }
    } catch (error) {
      console.error(`[Ethscription Image API] Failed to fetch ethscription data:`, error)
    }

    // Fallback: Try direct content endpoints
    const imageSources = [
      `https://api.ethscriptions.com/v2/ethscriptions/${transactionHash}/content`,
      `https://ethscriptions.com/api/ethscriptions/${transactionHash}/content`,
    ]

    for (const imageUrl of imageSources) {
      try {
        const response = await fetch(imageUrl, {
          headers: {
            'Accept': 'image/*',
            'User-Agent': 'Mozilla/5.0',
          },
          signal: AbortSignal.timeout(10000),
        })

        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'image/png'
          if (contentType.startsWith('image/')) {
            const imageBuffer = await response.arrayBuffer()
            return new NextResponse(imageBuffer, {
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
                'Access-Control-Allow-Origin': '*',
              },
            })
          }
        }
      } catch (error) {
        console.log(`[Ethscription Image API] Failed to fetch from ${imageUrl}:`, error)
        continue
      }
    }

    // If all sources failed, return error
    return NextResponse.json(
      { error: 'Failed to fetch ethscription image from all sources' },
      { status: 404 }
    )
  } catch (error) {
    console.error('[Ethscription Image API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
