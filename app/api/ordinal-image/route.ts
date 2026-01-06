import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const inscriptionId = searchParams.get('id')

    if (!inscriptionId) {
      return NextResponse.json(
        { error: 'Inscription ID required' },
        { status: 400 }
      )
    }

    // Try multiple ordinal image sources
    const imageSources = [
      `https://ord.io/preview/${inscriptionId}`,
      `https://ord.io/content/${inscriptionId}`,
      `https://api.hiro.so/ordinals/v1/inscriptions/${inscriptionId}/content`,
      `https://ordinals.com/content/${inscriptionId}`,
    ]

    for (const imageUrl of imageSources) {
      try {
        const response = await fetch(imageUrl, {
          headers: {
            'Accept': 'image/*',
            'User-Agent': 'Mozilla/5.0',
          },
          signal: AbortSignal.timeout(5000),
        })

        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'image/png'
          const imageBuffer = await response.arrayBuffer()
          
          return new NextResponse(imageBuffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=3600',
              'Access-Control-Allow-Origin': '*',
            },
          })
        }
      } catch (error) {
        // Try next source
        continue
      }
    }

    // If all sources failed, return error
    return NextResponse.json(
      { error: 'Failed to fetch ordinal image' },
      { status: 404 }
    )
  } catch (error) {
    console.error('[Ordinal Image API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

