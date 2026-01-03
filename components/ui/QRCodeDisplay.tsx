'use client'

import { useState, useEffect } from 'react'

interface QRCodeDisplayProps {
  data: string
  size?: number
  className?: string
}

export function QRCodeDisplay({ data, size = 200, className = '' }: QRCodeDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  useEffect(() => {
    // Use a QR code API service
    const encodedData = encodeURIComponent(data)
    const qrSize = size
    // Using qr-server.com API (free, no API key needed)
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodedData}`)
  }, [data, size])

  if (!qrCodeUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`} style={{ width: size, height: size }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
      </div>
    )
  }

  return (
    <div className={`inline-block ${className}`}>
      <img
        src={qrCodeUrl}
        alt="QR Code"
        className="rounded-lg border-2 border-gray-300"
        style={{ width: size, height: size }}
      />
    </div>
  )
}

