'use client'

import { useState, useEffect } from 'react'
import { CharityOption } from '@/types'
import { charities, deriveCryptoSupport } from '@/lib/charities'

interface CharitySelectorProps {
  onSelectCharity: (charity: CharityOption | null) => void
  selectedCharityId?: string | null
  className?: string
  /** Match app dark/purple theme when used in beneficiaries section */
  variant?: 'default' | 'dark'
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
  className = '',
  variant = 'default',
}: CharitySelectorProps) {
  const [selectedId, setSelectedId] = useState<string>(selectedCharityId || '')
  const selectedCharity = selectedId ? charities.find(c => c.id === selectedId) : null
  const isDark = variant === 'dark'

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
        <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-white/90' : 'text-gray-900'}`}>
          Quick-add Charity (Optional)
        </label>
        <select
          value={selectedId}
          onChange={handleChange}
          className={`w-full rounded-lg border p-2.5 text-sm focus:outline-none focus:ring-2 ${
            isDark
              ? 'border-white/20 bg-white/10 text-white focus:ring-purple-500/50 focus:border-purple-500/50 [&>option]:bg-gray-900 [&>option]:text-white'
              : 'border-gray-300 text-gray-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 bg-white'
          }`}
        >
          <option value="">-- Select a charity --</option>
          {charities.map((charity) => (
            <option key={charity.id} value={charity.id}>
              {charity.name} {charity.missionCategory ? `(${charity.missionCategory})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Show selected charity info with crypto badge */}
      {selectedCharity && (
        <div className={`rounded-lg border p-3 space-y-2 text-xs ${
          isDark ? 'bg-white/5 border-white/20' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-black'}`}>{selectedCharity.name}</h4>
              {selectedCharity.missionCategory && (
                <p className={`text-xs mt-0.5 ${isDark ? 'text-white/70' : 'text-gray-800'}`}>{selectedCharity.missionCategory}</p>
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

          {/* Crypto Support Badge */}
          {selectedCharity.cryptoSupport === true && selectedCharity.cryptoDonationURL && (
            <div className={`pt-2 border-t ${isDark ? 'border-white/20' : 'border-gray-200'}`}>
              <a
                href={selectedCharity.cryptoDonationURL}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  isDark ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' : 'bg-green-50 text-green-900 hover:bg-green-100'
                }`}
              >
                <span>✓</span>
                <span>Crypto Supported</span>
              </a>
            </div>
          )}

          {selectedCharity.cryptoSupport === false && (
            <div className={`pt-2 border-t ${isDark ? 'border-white/20' : 'border-gray-200'}`}>
              <a
                href={selectedCharity.donationURL}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  isDark ? 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30' : 'bg-yellow-50 text-yellow-900 hover:bg-yellow-100'
                }`}
              >
                <span>ℹ️</span>
                <span>Fiat Only</span>
              </a>
            </div>
          )}

          {/* Links */}
          <div className="flex flex-wrap gap-2 pt-1">
            {selectedCharity.websiteURL && (
              <a
                href={selectedCharity.websiteURL}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs underline ${isDark ? 'text-purple-300 hover:text-purple-200' : 'text-blue-600 hover:text-blue-800'}`}
              >
                Website
              </a>
            )}
            {selectedCharity.donationURL && (
              <a
                href={selectedCharity.donationURL}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs underline ${isDark ? 'text-purple-300 hover:text-purple-200' : 'text-blue-600 hover:text-blue-800'}`}
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
