'use client'

import { useState, useEffect } from 'react'
import { Beneficiary } from '@/types'
import { resolveBlockchainName, reverseResolveAddress } from '@/lib/name-resolvers'

interface BeneficiaryFormProps {
  beneficiaries: Beneficiary[]
  onBeneficiariesChange: (beneficiaries: Beneficiary[]) => void
}

export function BeneficiaryForm({ beneficiaries, onBeneficiariesChange }: BeneficiaryFormProps) {
  const [name, setName] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [notes, setNotes] = useState('')
  const [resolvingEns, setResolvingEns] = useState(false)
  const [ensName, setEnsName] = useState<string | null>(null)
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Format phone number with automatic dashes (865-851-2242)
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '')
    
    // Limit to 10 digits
    const limited = digits.slice(0, 10)
    
    // Format: XXX-XXX-XXXX
    if (limited.length <= 3) {
      return limited
    } else if (limited.length <= 6) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhone(formatted)
  }
  
  // Resolve blockchain name or address when wallet address changes
  useEffect(() => {
    const resolveName = async () => {
      if (!walletAddress || walletAddress.trim().length === 0) {
        setResolvedAddress(null)
        setEnsName(null)
        return
      }
      
      const input = walletAddress.trim()
      
      setResolvingEns(true)
      try {
        // Try unified blockchain name resolver first
        const resolved = await resolveBlockchainName(input)
        
        if (resolved) {
          setResolvedAddress(resolved.address)
          setEnsName(resolved.name) // Keep the resolved name
          console.log(`Resolved ${resolved.resolver} name "${resolved.name}" to address: ${resolved.address}`)
          return
        }
        
        // If not a name, try reverse lookup if it's an address
        if (input.startsWith('0x') && input.length === 42) {
          // Reverse lookup: address -> name across all systems
          const reverseResolved = await reverseResolveAddress(input)
          if (reverseResolved) {
            setEnsName(reverseResolved.name)
            setResolvedAddress(reverseResolved.address)
            console.log(`Reverse resolved address "${input}" to ${reverseResolved.resolver} name: ${reverseResolved.name}`)
            return
          }
        }
        
        // Fallback: if it's an address, just use it
        if (input.startsWith('0x') && input.length === 42) {
            setEnsName(null)
            setResolvedAddress(input.toLowerCase())
        } else {
          // Not a valid name or address
          setEnsName(null)
          setResolvedAddress(null)
        }
      } catch (error) {
        console.error('Error resolving name:', error)
        setEnsName(null)
        setResolvedAddress(null)
      } finally {
        setResolvingEns(false)
      }
    }
    
    // Debounce name resolution
    const timeoutId = setTimeout(resolveName, 500)
    return () => clearTimeout(timeoutId)
  }, [walletAddress])

  const handleAdd = () => {
    if (!name.trim()) {
      alert('Please fill in the name')
      return
    }
    if (beneficiaries.length >= 10) {
      alert('Maximum 10 beneficiaries allowed')
      return
    }

    // Only validate address format if an address is provided
    let finalAddress: string | undefined = undefined
    if (walletAddress.trim()) {
      const resolved = resolvedAddress || walletAddress.trim()
      
      // Validate address format only if provided
      if (resolved.startsWith('0x') && resolved.length === 42) {
        finalAddress = resolved.toLowerCase()
      } else {
        alert('Invalid wallet address. Please enter a valid Ethereum address (0x...) or ENS name (.eth), or leave it blank')
        return
      }
    }

    const newBeneficiary: Beneficiary = {
      id: `ben-${Date.now()}`,
      name: name.trim(),
      walletAddress: finalAddress,
      ensName: ensName || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      zipCode: zipCode.trim() || undefined,
      notes: notes.trim() || undefined,
    }

    onBeneficiariesChange([...beneficiaries, newBeneficiary])
    setName('')
    setWalletAddress('')
    setPhone('')
    setEmail('')
    setAddress('')
    setCity('')
    setState('')
    setZipCode('')
    setNotes('')
    setEnsName(null)
    setResolvedAddress(null)
  }

  const handleRemove = (id: string) => {
    onBeneficiariesChange(beneficiaries.filter((b) => b.id !== id))
  }

  const handleEdit = (beneficiary: Beneficiary) => {
    setEditingId(beneficiary.id)
    setName(beneficiary.name)
    setWalletAddress(beneficiary.ensName || beneficiary.walletAddress || '')
    setPhone(beneficiary.phone || '')
    setEmail(beneficiary.email || '')
    setAddress(beneficiary.address || '')
    setCity(beneficiary.city || '')
    setState(beneficiary.state || '')
    setZipCode(beneficiary.zipCode || '')
    setNotes(beneficiary.notes || '')
    setEnsName(beneficiary.ensName || null)
    setResolvedAddress(beneficiary.walletAddress || null)
  }

  const handleSaveEdit = () => {
    if (!editingId) return
    if (!name.trim()) {
      alert('Name is required')
      return
    }

    let finalAddress: string | undefined = undefined
    if (walletAddress.trim()) {
      const resolved = resolvedAddress || walletAddress.trim()
      
      if (resolved.startsWith('0x') && resolved.length === 42) {
        finalAddress = resolved.toLowerCase()
      } else {
        alert('Invalid wallet address. Please enter a valid Ethereum address (0x...) or ENS name (.eth), or leave it blank')
        return
      }
    }

    const updatedBeneficiaries = beneficiaries.map(b => 
      b.id === editingId
        ? {
            ...b,
            name: name.trim(),
            walletAddress: finalAddress,
            ensName: ensName || undefined,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            address: address.trim() || undefined,
            city: city.trim() || undefined,
            state: state.trim() || undefined,
            zipCode: zipCode.trim() || undefined,
            notes: notes.trim() || undefined,
          }
        : b
    )

    onBeneficiariesChange(updatedBeneficiaries)
    handleCancelEdit()
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setName('')
    setWalletAddress('')
    setPhone('')
    setEmail('')
    setAddress('')
    setCity('')
    setState('')
    setZipCode('')
    setNotes('')
    setEnsName(null)
    setResolvedAddress(null)
  }

  return (
    <div className="space-y-3">
      {/* Main fields - horizontal */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-900 mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="John Doe"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-900 mb-1">
            Wallet Address or ENS Name (Optional)
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
            placeholder="0x... or name.eth"
          />
          {resolvingEns && (
            <p className="text-xs text-gray-500 mt-1">Resolving ENS...</p>
          )}
          {ensName && resolvedAddress && (
            <div className="mt-1 text-sm text-green-600">
              <span className="font-semibold">✓ {ensName}</span>
              <span className="text-gray-500 ml-2 font-mono text-xs">({resolvedAddress})</span>
            </div>
          )}
          {!ensName && resolvedAddress && (
            <div className="mt-1 text-sm text-green-600">
              <span className="font-semibold">✓ Valid Address</span>
              <span className="text-gray-500 ml-2 font-mono text-xs">({resolvedAddress})</span>
            </div>
          )}
        </div>
        {editingId ? (
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={!name.trim()}
              className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              ✓ Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="rounded-lg bg-gray-600 text-white px-4 py-2 text-sm font-semibold hover:bg-gray-700 transition-colors whitespace-nowrap"
            >
              ✕ Cancel
            </button>
          </div>
        ) : (
        <button
          onClick={handleAdd}
          disabled={!name.trim() || beneficiaries.length >= 10}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          Add ({beneficiaries.length}/10)
        </button>
        )}
      </div>

      {/* Optional fields - horizontal */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-900 mb-1">Phone (Optional)</label>
          <input
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="865-851-2242"
            maxLength={12}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-900 mb-1">Email (Optional)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="john@example.com"
          />
        </div>
      </div>

      {/* Address fields */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-900 mb-1">Street Address (Optional)</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="123 Main St"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-900 mb-1">City (Optional)</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="City"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-900 mb-1">State (Optional)</label>
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="State"
            maxLength={2}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-900 mb-1">ZIP Code (Optional)</label>
          <input
            type="text"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="12345"
            maxLength={5}
          />
        </div>
      </div>

      {/* Notes field */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-900 mb-1">Notes (Optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Additional info to find them"
          />
        </div>
      </div>
    </div>
  )
}
