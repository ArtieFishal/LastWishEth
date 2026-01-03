'use client'

import { useState, useEffect } from 'react'
import { UserData, Asset } from '@/types'
import { generatePDF } from '@/lib/pdf-generator'

interface PDFPreviewProps {
  userData: UserData
  assets: Asset[]
  walletProviderMap: Record<string, string>
  className?: string
}

export function PDFPreview({ userData, assets, walletProviderMap, className = '' }: PDFPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const generatePreview = async () => {
      setLoading(true)
      setError(null)
      try {
        const pdfBytes = await generatePDF(userData, assets, walletProviderMap)
        const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
      } catch (err) {
        console.error('Error generating PDF preview:', err)
        setError('Failed to generate preview')
      } finally {
        setLoading(false)
      }
    }

    generatePreview()
  }, [userData, assets, walletProviderMap])

  useEffect(() => {
    // Cleanup URL on unmount
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  if (loading) {
    return (
      <div className={`bg-gray-50 rounded-lg border-2 border-gray-200 p-8 text-center ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Generating PDF preview...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center ${className}`}>
        <p className="text-red-800 font-semibold">{error}</p>
      </div>
    )
  }

  if (!previewUrl) {
    return null
  }

  return (
    <div className={`bg-white rounded-lg border-2 border-gray-200 overflow-hidden ${className}`}>
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">PDF Preview</h3>
      </div>
      <div className="p-4">
        <iframe
          src={previewUrl}
          className="w-full h-[600px] border border-gray-300 rounded"
          title="PDF Preview"
          aria-label="PDF document preview"
        />
      </div>
    </div>
  )
}

