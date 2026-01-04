'use client'

import { useState } from 'react'

interface WalletNameEditorProps {
  address: string
  currentName: string
  isENS: boolean
  onNameChange: (name: string) => void
}

export function WalletNameEditor({ address, currentName, isENS, onNameChange }: WalletNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(currentName)

  const handleSave = () => {
    if (editedName.trim()) {
      onNameChange(editedName.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedName(currentName)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave()
            } else if (e.key === 'Escape') {
              handleCancel()
            }
          }}
          className="flex-1 px-2 py-1 text-sm font-semibold border-2 border-blue-500 rounded focus:outline-none"
          autoFocus
          placeholder="Enter wallet name..."
        />
        <button
          onClick={handleSave}
          className="px-2 py-1 text-xs font-semibold bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          ✓
        </button>
        <button
          onClick={handleCancel}
          className="px-2 py-1 text-xs font-semibold bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 mb-1">
      <h4 className="text-base font-bold text-gray-900 flex-1 min-w-0">
        {currentName || address.slice(0, 10) + '...' + address.slice(-8)}
      </h4>
      {isENS && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">
          ENS
        </span>
      )}
      <button
        onClick={() => setIsEditing(true)}
        className="px-2 py-1 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
        title="Edit wallet name"
      >
        ✏️
      </button>
    </div>
  )
}

