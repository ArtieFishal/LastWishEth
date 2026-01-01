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
  
  // Resolve ENS name when wallet address changes
  useEffect(() => {
    const resolveENS = async () => {
      if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length < 42) {
        setEnsName(null)
        return
      }
      
      setResolvingEns(true)
      try {
        const publicClient = createPublicClient({
          chain: mainnet,
          transport: http(),
        })
        const resolved = await publicClient.getEnsName({ address: walletAddress as `0x${string}` })
        setEnsName(resolved || null)
      } catch (error) {
        console.error('Error resolving ENS:', error)
        setEnsName(null)
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

    const newBeneficiary: Beneficiary = {
      id: `ben-${Date.now()}`,
      name: name.trim(),
      walletAddress: walletAddress.trim(),
      ensName: ensName || undefined,
    }

    onBeneficiariesChange([...beneficiaries, newBeneficiary])
    setName('')
    setWalletAddress('')
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
              Wallet Address {ensName && <span className="text-green-600">✓ ENS: {ensName}</span>}
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              placeholder="0x... or bc1... or name.eth"
            />
            {resolvingEns && (
              <p className="text-xs text-gray-500 mt-1">Resolving ENS name...</p>
            )}
            {ensName && (
              <p className="text-xs text-green-600 font-semibold mt-1">
                ✓ Resolved: {ensName}
              </p>
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
