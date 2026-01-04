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
}

export function NFTImage({
  imageUrl: initialImageUrl,
  tokenUri,
  contractAddress,
  tokenId,
  alt = 'NFT',
  className = 'w-20 h-20 object-cover rounded border border-gray-200',
  fallbackClassName = 'w-20 h-20 rounded border border-gray-200 bg-gray-100 flex items-center justify-center',
}: NFTImageProps) {
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialImageUrl)
  const [loading, setLoading] = useState(!initialImageUrl && !!tokenUri)
  const [error, setError] = useState(false)

  useEffect(() => {
    // If we have an initial image URL, use it
    if (initialImageUrl) {
      setImageUrl(getImageUrlWithIPFSFallback(initialImageUrl))
      return
    }

    // If we have a token URI but no image, fetch metadata
    if (tokenUri && !imageUrl && !error) {
      setLoading(true)
      fetchNFTMetadata(tokenUri, contractAddress, tokenId)
        .then((result) => {
          if (result?.image) {
            const normalizedUrl = getImageUrlWithIPFSFallback(result.image)
            setImageUrl(normalizedUrl)
          } else {
            setError(true)
          }
        })
        .catch((err) => {
          console.warn(`[NFTImage] Failed to fetch metadata for ${tokenUri}:`, err)
          setError(true)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [initialImageUrl, tokenUri, contractAddress, tokenId, error])

  // Handle image load errors with IPFS fallback
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const currentSrc = e.currentTarget.src
    
    // If it's an IPFS URL and we haven't tried all gateways yet, try next one
    if (currentSrc.includes('ipfs.io/ipfs/') || currentSrc.includes('gateway.pinata.cloud/ipfs/')) {
      // Extract hash and try next gateway
      const hashMatch = currentSrc.match(/ipfs\/([^/?]+)/)
      if (hashMatch) {
        const hash = hashMatch[1]
        const gateways = [
          'https://ipfs.io/ipfs/',
          'https://gateway.pinata.cloud/ipfs/',
          'https://cloudflare-ipfs.com/ipfs/',
          'https://dweb.link/ipfs/',
        ]
        const currentGateway = gateways.find(g => currentSrc.includes(g))
        if (currentGateway) {
          const currentIndex = gateways.indexOf(currentGateway)
          if (currentIndex < gateways.length - 1) {
            const nextUrl = gateways[currentIndex + 1] + hash
            setImageUrl(nextUrl)
            return
          }
        }
      }
    }
    
    // If all gateways failed or not IPFS, hide image
    setError(true)
    e.currentTarget.style.display = 'none'
  }

  if (error) {
    return null // Don't show anything if image fails
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
    return null
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={handleImageError}
      loading="lazy"
    />
  )
}

