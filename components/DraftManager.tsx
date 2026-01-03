'use client'

import { useState } from 'react'
import { ExportData, exportToJSON, loadFromJSON, downloadFile } from '@/lib/exportUtils'
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog'

interface DraftManagerProps {
  onLoadDraft: (data: ExportData) => void
  currentData: ExportData | null
  className?: string
}

export function DraftManager({ onLoadDraft, currentData, className = '' }: DraftManagerProps) {
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  const handleSaveDraft = () => {
    if (!currentData) {
      alert('No data to save')
      return
    }

    const json = exportToJSON(currentData)
    downloadFile(json, `lastwish-draft-${Date.now()}.json`, 'application/json')
    setShowSaveDialog(false)
  }

  const handleLoadDraft = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        const data = loadFromJSON(content)
        if (data) {
          onLoadDraft(data)
          setShowLoadDialog(false)
        } else {
          alert('Invalid draft file format')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="text-sm font-bold text-gray-900">Draft Management</h4>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowSaveDialog(true)}
          disabled={!currentData}
          className="px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          💾 Save Draft
        </button>
        <button
          onClick={() => setShowLoadDialog(true)}
          className="px-4 py-2 text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
        >
          📂 Load Draft
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Save your progress as a draft file, or load a previously saved draft
      </p>

      <ConfirmationDialog
        isOpen={showSaveDialog}
        title="Save Draft"
        message="This will download a JSON file with your current progress. You can load it later to continue where you left off."
        confirmText="Save"
        cancelText="Cancel"
        onConfirm={handleSaveDraft}
        onCancel={() => setShowSaveDialog(false)}
        variant="info"
      />

      <ConfirmationDialog
        isOpen={showLoadDialog}
        title="Load Draft"
        message="This will replace your current data with the loaded draft. Make sure you want to overwrite your current progress."
        confirmText="Load"
        cancelText="Cancel"
        onConfirm={handleLoadDraft}
        onCancel={() => setShowLoadDialog(false)}
        variant="warning"
      />
    </div>
  )
}

