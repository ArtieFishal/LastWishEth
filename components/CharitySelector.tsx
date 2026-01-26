'use client'

import { useState, useEffect } from 'react'
import { CharityOption } from '@/types'
import { charities, deriveCryptoSupport } from '@/lib/charities'

interface CharitySelectorProps {
  onSelectCharity: (charity: CharityOption | null) => void
  selectedCharityId?: string | null
  className?: string
}

/**
 * Charity Beneficiary Selector Component
 * 
 * Features:
 * - Dropdown with all available charities
 * - Crypto badge that appears ONLY when cryptoDonationURL exists
 * - Custom charity option for manual entry
 * - Autofills beneficiary form fields when charity is selected
 */
export function CharitySelector({ 
  onSelectCharity, 
  selectedCharityId,
  className = '' 
}: CharitySelectorProps) {
  const [selectedId, setSelectedId] = useState<string>(selectedCharityId || '')
  const selectedCharity = selectedId ? charities.find(c => c.id === selectedId) : null

  // Sync internal state when prop changes
  useEffect(() => {
    setSelectedId(selectedCharityId || '')
  }, [selectedCharityId])

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const charityId = event.target.value
    setSelectedId(charityId)
    
    if (charityId === '') {
      onSelectCharity(null)
      return
    }
    
    const charity = charities.find(c => c.id === charityId)
    if (charity) {
      // Derive cryptoSupport from cryptoDonationURL presence
      const cryptoSupport = deriveCryptoSupport(charity)
      const charityWithDerivedSupport: CharityOption = {
        ...charity,
        cryptoSupport,
      }
      onSelectCharity(charityWithDerivedSupport)
    } else {
      onSelectCharity(null)
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div>
        <label className="block text-xs font-medium text-gray-900 mb-1">
          Quick-add Charity (Optional)
        </label>
        <select
          value={selectedId}
          onChange={handleChange}
          className="w-full rounded-lg border border-gray-300 p-1.5 text-xs text-gray-900 focus:border-blue-400 focus:outline-none bg-white"
        >
          <option value="">-- Select a charity --</option>
          {charities.map((charity) => (
            <option key={charity.id} value={charity.id}>
              {charity.name} {charity.missionCategory ? `(${charity.missionCategory})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Show selected charity info with crypto badge - compact version */}
      {selectedCharity && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5 space-y-1.5 text-xs">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 text-xs">{selectedCharity.name}</h4>
              {selectedCharity.missionCategory && (
                <p className="text-xs text-gray-700 mt-0.5">{selectedCharity.missionCategory}</p>
              )}
            </div>
            {selectedCharity.logoAssetPath && (
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center ml-2">
                <img
                  src={selectedCharity.logoAssetPath}
                  alt={`${selectedCharity.name} logo`}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          {/* Crypto Support Badge - smaller */}
          {selectedCharity.cryptoSupport === true && selectedCharity.cryptoDonationURL && (
            <div className="pt-1.5 border-t border-gray-200">
              <a
                href={selectedCharity.cryptoDonationURL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-900 rounded text-xs font-medium hover:bg-green-100 transition-colors"
              >
                <span>✓</span>
                <span>Crypto Supported</span>
              </a>
            </div>
          )}

          {selectedCharity.cryptoSupport === false && (
            <div className="pt-1.5 border-t border-gray-200">
              <a
                href={selectedCharity.donationURL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-900 rounded text-xs font-medium hover:bg-yellow-100 transition-colors"
              >
                <span>ℹ️</span>
                <span>Fiat Only</span>
              </a>
            </div>
          )}

          {/* Links - smaller */}
          <div className="flex flex-wrap gap-2 pt-1">
            {selectedCharity.websiteURL && (
              <a
                href={selectedCharity.websiteURL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Website
              </a>
            )}
            {selectedCharity.donationURL && (
              <a
                href={selectedCharity.donationURL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Donate
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
