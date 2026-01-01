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
    }

    onBeneficiariesChange([...beneficiaries, newBeneficiary])
    setName('')
    setWalletAddress('')
    setEnsName(null)
    setResolvedAddress(null)
  }

  const handleRemove = (id: string) => {
    onBeneficiariesChange(beneficiaries.filter((b) => b.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4 space-y-4">
        <h4 className="font-semibold text-gray-900">Add Beneficiary</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Wallet Address or ENS Name
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              placeholder="0x... or name.eth (e.g., crazypretty.eth)"
            />
            {resolvingEns && (
              <p className="text-xs text-gray-500 mt-1">Resolving ENS...</p>
            )}
            {ensName && resolvedAddress && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-800 font-semibold">
                  ✓ ENS Name: <span className="font-bold">{ensName}</span>
                </p>
                <p className="text-xs text-green-700 font-mono break-all mt-1">
                  Address: {resolvedAddress}
                </p>
              </div>
            )}
            {!ensName && resolvedAddress && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 font-semibold">
                  ✓ Valid Address: <span className="font-mono">{resolvedAddress}</span>
                </p>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleAdd}
          disabled={!name.trim() || !walletAddress.trim() || beneficiaries.length >= 10}
          className="w-full rounded-lg bg-blue-600 text-white p-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add Beneficiary ({beneficiaries.length}/10)
        </button>
      </div>

      {beneficiaries.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900 text-sm">Beneficiaries ({beneficiaries.length})</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {beneficiaries.map((beneficiary) => (
              <div
                key={beneficiary.id}
                className="rounded-lg border border-gray-200 p-3 bg-white flex items-start justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{beneficiary.name}</p>
                  {beneficiary.ensName ? (
                    <div className="mt-1">
                      <p className="text-sm font-bold text-green-600">
                        {beneficiary.ensName}
                      </p>
                      <p className="text-xs text-gray-500 font-mono break-all">
                        {beneficiary.walletAddress}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 font-mono break-all mt-1">
                      {beneficiary.walletAddress}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(beneficiary.id)}
                  className="text-red-600 hover:text-red-700 text-xs font-semibold ml-2 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
