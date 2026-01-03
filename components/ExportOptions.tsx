'use client'

import { ExportData, exportToJSON, exportToCSV, downloadFile } from '@/lib/exportUtils'
import { QueuedWalletSession, Beneficiary } from '@/types'

interface ExportOptionsProps {
  exportData: ExportData
  className?: string
}

export function ExportOptions({ exportData, className = '' }: ExportOptionsProps) {
  const handleExportJSON = () => {
    const json = exportToJSON(exportData)
    downloadFile(json, `lastwish-export-${Date.now()}.json`, 'application/json')
  }

  const handleExportCSV = () => {
    const csv = exportToCSV(exportData)
    downloadFile(csv, `lastwish-beneficiaries-${Date.now()}.csv`, 'text/csv')
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="text-sm font-bold text-gray-900">Export Options</h4>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExportJSON}
          className="px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
        >
          📥 Export JSON
        </button>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
        >
          📊 Export CSV
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Export your data as JSON (full backup) or CSV (beneficiaries only)
      </p>
    </div>
  )
}

