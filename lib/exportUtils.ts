// Export utilities for saving/loading drafts and exporting data

import { UserData, QueuedWalletSession, Asset, Beneficiary, Allocation } from '@/types'

export interface ExportData {
  version: string
  timestamp: number
  ownerData: {
    ownerName: string
    ownerFullName: string
    ownerEnsName?: string
    ownerAddress: string
    ownerCity: string
    ownerState: string
    ownerZipCode: string
    ownerPhone: string
  }
  executorData: {
    executorName: string
    executorAddress: string
    executorPhone?: string
    executorEmail?: string
    executorTwitter?: string
    executorLinkedIn?: string
  }
  beneficiaries: Beneficiary[]
  queuedSessions: QueuedWalletSession[]
  keyInstructions: string
}

export function exportToJSON(data: ExportData): string {
  return JSON.stringify(data, null, 2)
}

export function exportToCSV(data: ExportData): string {
  // Export beneficiaries to CSV
  const headers = ['Name', 'Wallet Address', 'ENS Name', 'Phone', 'Email', 'Notes']
  const rows = data.beneficiaries.map(ben => [
    ben.name,
    ben.walletAddress,
    ben.ensName || '',
    ben.phone || '',
    ben.email || '',
    ben.notes || '',
  ])

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return csv
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function loadFromJSON(json: string): ExportData | null {
  try {
    const data = JSON.parse(json)
    // Validate structure
    if (data.version && data.timestamp && data.ownerData && data.executorData) {
      return data as ExportData
    }
    return null
  } catch (error) {
    console.error('Error parsing JSON:', error)
    return null
  }
}

