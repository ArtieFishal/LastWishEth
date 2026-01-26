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
    <div className={`space-y-3 ${className}`}>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">
          Select Charity Beneficiary (Optional)
        </label>
        <select
          value={selectedId}
          onChange={handleChange}
          className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none bg-white"
        >
          <option value="">-- Select a charity or enter manually --</option>
          {charities.map((charity) => (
            <option key={charity.id} value={charity.id}>
              {charity.name} {charity.missionCategory ? `(${charity.missionCategory})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Show selected charity info with crypto badge */}
      {selectedCharity && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{selectedCharity.name}</h4>
              {selectedCharity.missionCategory && (
                <p className="text-xs text-gray-600 mt-1">{selectedCharity.missionCategory}</p>
              )}
              {selectedCharity.ein && (
                <p className="text-xs text-gray-500 mt-1">EIN: {selectedCharity.ein}</p>
              )}
            </div>
            {selectedCharity.logoAssetPath && (
              <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
                <img
                  src={selectedCharity.logoAssetPath}
                  alt={`${selectedCharity.name} logo`}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    // Hide image if it fails to load
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          {/* Crypto Support Badge */}
          {selectedCharity.cryptoSupport === true && selectedCharity.cryptoDonationURL && (
            <div className="mt-2 pt-2 border-t border-blue-200">
              <a
                href={selectedCharity.cryptoDonationURL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-md text-xs font-semibold hover:bg-green-200 transition-colors"
              >
                <span>✓</span>
                <span>Crypto Supported</span>
                <span className="text-green-600">→</span>
              </a>
            </div>
          )}

          {selectedCharity.cryptoSupport === false && (
            <div className="mt-2 pt-2 border-t border-blue-200">
              <a
                href={selectedCharity.donationURL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-md text-xs font-semibold hover:bg-yellow-200 transition-colors"
              >
                <span>ℹ️</span>
                <span>Fiat Only – crypto requires conversion</span>
                <span className="text-yellow-600">→</span>
              </a>
            </div>
          )}

          {selectedCharity.cryptoSupport === null && selectedCharity.id === 'custom_charity' && (
            <div className="mt-2 pt-2 border-t border-blue-200">
              <p className="text-xs text-gray-600">
                Custom charity – please fill in donation details manually
              </p>
            </div>
          )}

          {/* Links */}
          <div className="flex flex-wrap gap-2 mt-2">
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
                Donation Page
              </a>
            )}
          </div>

          {selectedCharity.notes && (
            <p className="text-xs text-gray-500 italic mt-1">{selectedCharity.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}
