'use client'

import { useState, useEffect } from 'react'
import { Beneficiary } from '@/types'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

interface BeneficiaryFormProps {
  beneficiaries: Beneficiary[]
  onBeneficiariesChange: (beneficiaries: Beneficiary[]) => void
}

export function BeneficiaryForm({ beneficiaries, onBeneficiariesChange }: BeneficiaryFormProps) {
  const [name, setName] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [resolvingEns, setResolvingEns] = useState(false)
  const [ensName, setEnsName] = useState<string | null>(null)
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  
  // Resolve ENS name or address when wallet address changes
  useEffect(() => {
    const resolveENS = async () => {
      if (!walletAddress || walletAddress.trim().length === 0) {
        setEnsName(null)
        setResolvedAddress(null)
        return
      }
      
      const input = walletAddress.trim()
      
      setResolvingEns(true)
      try {
        const publicClient = createPublicClient({
          chain: mainnet,
          transport: http(),
        })
        
        // Check if input is an ENS name (ends with .eth)
        if (input.endsWith('.eth')) {
          // Forward lookup: ENS name -> address
          const address = await publicClient.getEnsAddress({ name: input })
          if (address) {
            setResolvedAddress(address)
            setEnsName(input) // Keep the ENS name
            console.log(`Resolved ENS "${input}" to address: ${address}`)
          } else {
            setResolvedAddress(null)
            setEnsName(null)
          }
        } 
        // Check if input is an Ethereum address (starts with 0x and is 42 chars)
        else if (input.startsWith('0x') && input.length === 42) {
          // Reverse lookup: address -> ENS name
          const resolved = await publicClient.getEnsName({ address: input as `0x${string}` })
          if (resolved) {
            setEnsName(resolved)
            setResolvedAddress(input.toLowerCase())
            console.log(`Resolved address "${input}" to ENS: ${resolved}`)
          } else {
            setEnsName(null)
            setResolvedAddress(input.toLowerCase())
          }
        } else {
          // Not a valid ENS name or address
          setEnsName(null)
          setResolvedAddress(null)
        }
      } catch (error) {
        console.error('Error resolving ENS:', error)
        setEnsName(null)
        setResolvedAddress(null)
      } finally {
        setResolvingEns(false)
      }
    }
    
    // Debounce ENS resolution
    const timeoutId = setTimeout(resolveENS, 500)
    return () => clearTimeout(timeoutId)
  }, [walletAddress])

  const handleAdd = () => {
    if (!name.trim() || !walletAddress.trim()) {
      alert('Please fill in both name and wallet address')
      return
    }
    if (beneficiaries.length >= 10) {
      alert('Maximum 10 beneficiaries allowed')
      return
    }

    // Use resolved address if available (from ENS lookup), otherwise use input
    const finalAddress = resolvedAddress || walletAddress.trim()
    
    // Validate address format
    if (!finalAddress.startsWith('0x') || finalAddress.length !== 42) {
      alert('Invalid wallet address. Please enter a valid Ethereum address (0x...) or ENS name (.eth)')
      return
    }

    const newBeneficiary: Beneficiary = {
      id: `ben-${Date.now()}`,
      name: name.trim(),
      walletAddress: finalAddress.toLowerCase(),
      ensName: ensName || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    }

    onBeneficiariesChange([...beneficiaries, newBeneficiary])
    setName('')
    setWalletAddress('')
    setPhone('')
    setEmail('')
    setNotes('')
    setEnsName(null)
    setResolvedAddress(null)
  }

  const handleRemove = (id: string) => {
    onBeneficiariesChange(beneficiaries.filter((b) => b.id !== id))
  }

  return (
    <div className="space-y-3">
      {/* Main fields - horizontal */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="John Doe"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Wallet Address or ENS Name
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
        <button
          onClick={handleAdd}
          disabled={!name.trim() || !walletAddress.trim() || beneficiaries.length >= 10}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          Add ({beneficiaries.length}/10)
        </button>
      </div>

      {/* Optional fields - horizontal */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Phone (Optional)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="+1 (555) 123-4567"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Email (Optional)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="john@example.com"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Notes (Optional)</label>
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
