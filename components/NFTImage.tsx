'use client'

import { useState, useEffect } from 'react'
import { fetchNFTMetadata, getImageUrlWithIPFSFallback } from '@/lib/nft-metadata'

interface NFTImageProps {
  imageUrl?: string
  tokenUri?: string
  contractAddress?: string
  tokenId?: string
  alt?: string
  className?: string
  fallbackClassName?: string
  showFallback?: boolean // Show fallback UI instead of hiding
}

export function NFTImage({
  imageUrl: initialImageUrl,
  tokenUri,
  contractAddress,
  tokenId,
  alt = 'NFT',
  className = 'w-20 h-20 object-cover rounded border border-gray-200',
  fallbackClassName = 'w-20 h-20 rounded border border-gray-200 bg-gray-100 flex items-center justify-center',
  showFallback = true, // Default to showing fallback
}: NFTImageProps) {
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialImageUrl)
  const [loading, setLoading] = useState(!initialImageUrl && !!tokenUri)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3

  useEffect(() => {
    // Reset error state when props change
    setError(false)
    setRetryCount(0)
    
    // If we have an initial image URL, use it
    if (initialImageUrl) {
      // For ethscriptions, only use data URIs if they're actually images
      // Text/JSON data URIs should not be loaded as images
      if (initialImageUrl.startsWith('data:image/')) {
        // This is an image data URI - use it
        setImageUrl(initialImageUrl)
        setLoading(false)
        console.log(`[NFTImage] Using image data URI for ${alt || contractAddress || 'NFT'}`)
      } else if (initialImageUrl.startsWith('data:')) {
        // This is a non-image data URI (text/JSON) - don't try to load as image
        console.log(`[NFTImage] Skipping non-image data URI for ${alt || contractAddress || 'NFT'}`)
        setError(true)
        setLoading(false)
        return
      } else {
        // For ordinals, try the URL as-is first (ord.io, hiro.so, etc.)
        const normalizedUrl = getImageUrlWithIPFSFallback(initialImageUrl)
        setImageUrl(normalizedUrl)
        console.log(`[NFTImage] Using imageUrl: ${normalizedUrl} (original: ${initialImageUrl?.substring(0, 100)}) for ${alt || contractAddress || 'NFT'} (type: ordinal, tokenId: ${tokenId})`)
        if (!normalizedUrl) {
          console.warn(`[NFTImage] WARNING: normalizedUrl is undefined for ${initialImageUrl}`)
        }
        setLoading(false)
      }
      return
    }

    // If we have a token URI but no image, fetch metadata
    // Skip if tokenUri is an ord.io URL and we're using proxy (to avoid CORS)
    if (tokenUri && !imageUrl && !error) {
      // Check if tokenUri is a data URI (common for ethscriptions)
      // Only use image data URIs, skip text/JSON data URIs
      if (tokenUri.startsWith('data:image/')) {
        // This is an image data URI - use it
        setImageUrl(tokenUri)
        setLoading(false)
        console.log(`[NFTImage] Using image data URI from tokenUri for ${alt || contractAddress || 'NFT'}`)
        return
      } else if (tokenUri.startsWith('data:')) {
        // This is a non-image data URI (text/JSON) - don't try to load as image
        console.log(`[NFTImage] Skipping non-image data URI from tokenUri for ${alt || contractAddress || 'NFT'}`)
        setError(true)
        setLoading(false)
        return
      }
      
      // For ordinals, if tokenUri points to ord.io, don't try to fetch metadata
      // (it will cause CORS errors). The imageUrl should already be set to use our proxy.
      if (tokenUri.includes('ord.io/') && initialImageUrl && initialImageUrl.includes('/api/ordinal-image')) {
        // We already have a proxy URL, don't try to fetch metadata
        setLoading(false)
        return
      }
      
      console.log(`[NFTImage] Fetching metadata from tokenUri for ${alt || contractAddress || 'NFT'}:`, tokenUri.substring(0, 100))
      setLoading(true)
      fetchNFTMetadata(tokenUri, contractAddress, tokenId)
        .then((result) => {
          if (result?.image) {
            const normalizedUrl = getImageUrlWithIPFSFallback(result.image)
            setImageUrl(normalizedUrl)
            setError(false)
            console.log(`[NFTImage] Successfully fetched image from metadata: ${normalizedUrl?.substring(0, 100)}`)
          } else {
            // Don't log as warning - it's normal for some NFTs to not have images in metadata
            setError(true)
          }
        })
        .catch((err) => {
          // Don't log CORS/network errors as warnings - they're expected for some external APIs
          if (err?.message && !err.message.includes('Failed to fetch') && !err.message.includes('CORS')) {
            console.warn(`[NFTImage] Failed to fetch metadata for ${alt || contractAddress || 'NFT'} from ${tokenUri}:`, err)
          }
          setError(true)
        })
        .finally(() => {
          setLoading(false)
        })
    } else if (!tokenUri && !initialImageUrl) {
      // No imageUrl and no tokenUri - can't load image
      console.warn(`[NFTImage] No imageUrl or tokenUri for ${alt || contractAddress || 'NFT'} (contract: ${contractAddress}, tokenId: ${tokenId})`)
      setError(true)
      setLoading(false)
    }
  }, [initialImageUrl, tokenUri, contractAddress, tokenId])

  // Handle image load errors with IPFS fallback and ordinal URL fallbacks
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const currentSrc = e.currentTarget.src
    console.warn(`[NFTImage] Image load error for ${alt || contractAddress || 'NFT'}: ${currentSrc} (retry ${retryCount}/${maxRetries})`)
    
    if (retryCount >= maxRetries) {
      console.error(`[NFTImage] Max retries reached for ${alt || contractAddress || 'NFT'}, showing error state. Final URL: ${currentSrc}`)
      setError(true)
      return
    }
    
    // If it's our proxy API that failed, try direct sources
    if (currentSrc.includes('/api/ordinal-image') && tokenId) {
      const inscriptionId = tokenId
      // Try direct ordinal sources as fallback
      const directSources = [
        `https://ord.io/preview/${inscriptionId}`,
        `https://api.hiro.so/ordinals/v1/inscriptions/${inscriptionId}/content`,
        `https://ordinals.com/content/${inscriptionId}`,
      ]
      const nextSource = directSources[retryCount % directSources.length]
      console.log(`[NFTImage] Trying direct source: ${nextSource}`)
      setImageUrl(nextSource)
      setRetryCount(prev => prev + 1)
      return
    }
    
    // If it's an ordinal URL (ord.io) - try our proxy instead
    if (currentSrc.includes('ord.io/') && tokenId) {
      const inscriptionId = tokenId
      const proxyUrl = `/api/ordinal-image?id=${encodeURIComponent(inscriptionId)}`
      console.log(`[NFTImage] Direct ord.io URL failed, trying proxy: ${proxyUrl}`)
      setImageUrl(proxyUrl)
      setRetryCount(prev => prev + 1)
      return
    }
    
    // If it's an IPFS URL and we haven't tried all gateways yet, try next one
    if (currentSrc.includes('ipfs')) {
      const hashMatch = currentSrc.match(/ipfs\/([^/?]+)/)
      if (hashMatch) {
        const hash = hashMatch[1]
        const gateways = [
          'https://ipfs.io/ipfs/',
          'https://gateway.pinata.cloud/ipfs/',
          'https://cloudflare-ipfs.com/ipfs/',
          'https://dweb.link/ipfs/',
          'https://ipfs.filebase.io/ipfs/',
        ]
        const currentGateway = gateways.find(g => currentSrc.includes(g))
        if (currentGateway) {
          const currentIndex = gateways.indexOf(currentGateway)
          if (currentIndex < gateways.length - 1) {
            const nextUrl = gateways[currentIndex + 1] + hash
            console.log(`[NFTImage] Trying next IPFS gateway: ${nextUrl}`)
            setImageUrl(nextUrl)
            setRetryCount(prev => prev + 1)
            return
          }
        } else {
          // Try first gateway if current URL doesn't match any
          const nextUrl = gateways[0] + hash
          console.log(`[NFTImage] Trying IPFS gateway: ${nextUrl}`)
          setImageUrl(nextUrl)
          setRetryCount(prev => prev + 1)
          return
        }
      }
    }
    
    // If all gateways failed or not IPFS, try tokenUri as fallback for ordinals
    if (tokenUri && tokenUri !== currentSrc && !tokenUri.startsWith('data:')) {
      console.log(`[NFTImage] Trying tokenUri as fallback: ${tokenUri}`)
      setImageUrl(tokenUri)
      setRetryCount(prev => prev + 1)
      return
    }
    
    // If all fallbacks failed, show error state
    console.log(`[NFTImage] All image load attempts failed`)
    setError(true)
  }

  const handleImageLoad = () => {
    // Reset error and retry count on successful load
    setError(false)
    setRetryCount(0)
  }

  // Show fallback UI with diagnostic info
  if (error && showFallback) {
    const diagnosticInfo: string[] = []
    if (!initialImageUrl && !tokenUri) {
      diagnosticInfo.push('No imageUrl or tokenUri')
    } else if (!initialImageUrl && tokenUri) {
      diagnosticInfo.push('Has tokenUri, fetch failed')
    } else if (initialImageUrl) {
      diagnosticInfo.push('imageUrl failed to load')
    }
    
    return (
      <div 
        className={fallbackClassName}
        title={`Image diagnostic: ${diagnosticInfo.join(', ')}${tokenUri ? ` | tokenUri: ${tokenUri.substring(0, 50)}...` : ''}${initialImageUrl ? ` | imageUrl: ${initialImageUrl.substring(0, 50)}...` : ''}`}
      >
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-xs text-gray-500 mt-1 text-center px-1">Image unavailable</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            const info = [
              `Image Diagnostic for: ${alt || 'NFT'}`,
              `imageUrl: ${initialImageUrl || 'none'}`,
              `tokenUri: ${tokenUri || 'none'}`,
              `contractAddress: ${contractAddress || 'none'}`,
              `tokenId: ${tokenId || 'none'}`,
              `Retry count: ${retryCount}/${maxRetries}`,
              `Error: ${error ? 'Yes' : 'No'}`,
            ].join('\n')
            console.log('[NFTImage Diagnostic]', info)
            alert(info)
          }}
          className="text-xs text-blue-600 hover:text-blue-800 mt-1 underline"
          title="Click to see diagnostic info in console"
        >
          Why?
        </button>
      </div>
    )
  }

  if (error && !showFallback) {
    return null
  }

  if (loading) {
    return (
      <div className={fallbackClassName}>
        <svg className="w-8 h-8 text-gray-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }

  if (!imageUrl) {
    return showFallback ? (
      <div className={fallbackClassName}>
        <span className="text-xs text-gray-500">No image</span>
      </div>
    ) : null
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={handleImageError}
      onLoad={handleImageLoad}
      loading="lazy"
      crossOrigin="anonymous"
    />
  )
}

