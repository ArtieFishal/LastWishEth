'use client'

import { useState, useEffect } from 'react'
import { useAccount, useDisconnect, useSignMessage } from 'wagmi'

export function useWalletConnection() {
  const { address: evmAddress, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const { signMessageAsync } = useSignMessage({
    mutation: {
      onError: (error) => {
        console.error('Sign message error:', error)
      }
    }
  })

  const [connectedEVMAddresses, setConnectedEVMAddresses] = useState<Set<string>>(new Set())
  const [verifiedAddresses, setVerifiedAddresses] = useState<Set<string>>(new Set())
  const [pendingVerification, setPendingVerification] = useState<string | null>(null)
  const [walletProviders, setWalletProviders] = useState<Record<string, string>>({})
  const [btcAddress, setBtcAddress] = useState<string | null>(null)

  // Track connected EVM addresses
  useEffect(() => {
    if (evmAddress && !connectedEVMAddresses.has(evmAddress)) {
      setConnectedEVMAddresses(prev => new Set([...prev, evmAddress]))
    }
  }, [evmAddress, connectedEVMAddresses])

  const verifyWalletOwnership = async (address: string): Promise<boolean> => {
    if (verifiedAddresses.has(address)) {
      return true
    }

    if (address !== evmAddress) {
      return false
    }

    setPendingVerification(address)

    try {
      const message = `I am the owner of this wallet address: ${address}\n\nThis signature proves I control this wallet and authorize LastWish.eth to access my asset information.\n\nTimestamp: ${Date.now()}`
      
      const signature = await signMessageAsync({ message })

      if (signature && signature.length > 0) {
        setVerifiedAddresses(prev => new Set([...prev, address]))
        setPendingVerification(null)
        return true
      } else {
        setPendingVerification(null)
        return false
      }
    } catch (error: any) {
      setPendingVerification(null)
      if (error?.name === 'UserRejectedRequestError' || error?.message?.includes('rejected')) {
        throw new Error('Signature request was cancelled')
      }
      throw error
    }
  }

  const addEVMAddress = (address: string, provider?: string) => {
    setConnectedEVMAddresses(prev => new Set([...prev, address]))
    if (provider) {
      setWalletProviders(prev => ({ ...prev, [address]: provider }))
    }
  }

  const removeEVMAddress = (address: string) => {
    setConnectedEVMAddresses(prev => {
      const next = new Set(prev)
      next.delete(address)
      return next
    })
    setVerifiedAddresses(prev => {
      const next = new Set(prev)
      next.delete(address)
      return next
    })
  }

  const clearAllWallets = () => {
    setConnectedEVMAddresses(new Set())
    setVerifiedAddresses(new Set())
    setBtcAddress(null)
    setWalletProviders({})
    if (isConnected) {
      disconnect()
    }
  }

  return {
    evmAddress,
    isConnected,
    chain,
    disconnect,
    connectedEVMAddresses: Array.from(connectedEVMAddresses),
    verifiedAddresses: Array.from(verifiedAddresses),
    pendingVerification,
    walletProviders,
    btcAddress,
    setBtcAddress,
    verifyWalletOwnership,
    addEVMAddress,
    removeEVMAddress,
    clearAllWallets,
    isVerified: (address: string) => verifiedAddresses.has(address)
  }
}

