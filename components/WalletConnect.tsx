'use client'

import { useAccount, useConnect, useDisconnect, useConnectorClient } from 'wagmi'
import { useState, useEffect, useRef } from 'react'

interface WalletConnectProps {
  onBitcoinConnect?: (address: string, provider?: string, ordinalsAddress?: string) => void
  onEvmConnect?: (address: string, provider?: string) => void
}

// Wallet configuration with colors and icons
const walletConfig: Record<string, { color: string; hoverColor: string; bgColor: string; icon: string }> = {
  'MetaMask': {
    color: '#F6851B',
    hoverColor: '#E2761B',
    bgColor: '#F6851B',
    icon: '🦊'
  },
  'WalletConnect': {
    color: '#3B99FC',
    hoverColor: '#2E7CD6',
    bgColor: '#3B99FC',
    icon: '🔗'
  },
  'Coinbase Wallet': {
    color: '#0052FF',
    hoverColor: '#0040CC',
    bgColor: '#0052FF',
    icon: '🔵'
  },
  'Phantom': {
    color: '#AB9FF2',
    hoverColor: '#8B7DD9',
    bgColor: '#AB9FF2',
    icon: '👻'
  },
  'Rainbow': {
    color: '#00D9FF',
    hoverColor: '#00B8D9',
    bgColor: '#00D9FF',
    icon: '🌈'
  },
  'Trust Wallet': {
    color: '#3375BB',
    hoverColor: '#2A5F99',
    bgColor: '#3375BB',
    icon: '🔷'
  },
  'Ledger': {
    color: '#000000',
    hoverColor: '#333333',
    bgColor: '#000000',
    icon: '🔒'
  },
  'Xverse': {
    color: '#F7931A',
    hoverColor: '#E6820A',
    bgColor: '#F7931A',
    icon: '₿'
  }
}

// Get wallet config or default
const getWalletConfig = (walletName: string) => {
  return walletConfig[walletName] || {
    color: '#6366F1',
    hoverColor: '#4F46E5',
    bgColor: '#6366F1',
    icon: '💼'
  }
}

// Helper function to extract Bitcoin address from various account formats
const extractBitcoinAddress = (account: any): string | null => {
  if (!account) return null
  
  // If it's already a string, return it
  if (typeof account === 'string') {
    return account
  }
  
  // Try different address property names that Xverse might use
  const addressFields = [
    'address',
    'paymentsAddress',
    'payments_address',
    'paymentAddress',
    'payment_address',
    'legacyAddress',
    'legacy_address',
    'p2pkhAddress',
    'p2pkh_address',
    'p2shAddress',
    'p2sh_address'
  ]
  
  for (const field of addressFields) {
    if (account[field] && typeof account[field] === 'string') {
      return account[field]
    }
  }
  
  return null
}

export function WalletConnect({ onBitcoinConnect, onEvmConnect }: WalletConnectProps) {
  const { address, isConnected, connector } = useAccount()
  const { connect, connectors, isPending, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const [btcAddress, setBtcAddress] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [detectedBtcWallets, setDetectedBtcWallets] = useState<Array<{ name: string; provider: any; method: string; icon: string }>>([])
  const [scanningWallets, setScanningWallets] = useState(false)
  const [activeTab, setActiveTab] = useState<'evm' | 'bitcoin'>('evm')
  const manualBtcInputRef = useRef<HTMLInputElement>(null)

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Scan for Bitcoin wallets on mount
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      scanForBitcoinWallets()
    }
  }, [mounted])

  // Function to scan for available Bitcoin wallets
  const scanForBitcoinWallets = async () => {
    if (typeof window === 'undefined') return
    
    setScanningWallets(true)
    const win = window as any
    const providers: Array<{ name: string; provider: any; method: string; icon: string }> = []
    
    // Wait a bit for extensions to inject
    await new Promise(resolve => setTimeout(resolve, 500))
    
        // Check for btc_providers array (standard for multiple wallets) - PRIMARY METHOD
        if (win.btc_providers && Array.isArray(win.btc_providers)) {
          for (const provider of win.btc_providers) {
            const providerName = provider.name || provider.id || 'Unknown Bitcoin Wallet'
            // Normalize name to avoid duplicates
            const normalizedName = providerName.toLowerCase().includes('xverse') ? 'Xverse' :
                                  providerName.toLowerCase().includes('okx') ? 'OKX' :
                                  providerName.toLowerCase().includes('blockchain') ? 'Blockchain.com' :
                                  providerName
            
            // Determine icon based on name
            let icon = '₿'
            if (normalizedName === 'Xverse') icon = '₿'
            else if (normalizedName === 'OKX') icon = '🔷'
            else if (normalizedName === 'Blockchain.com') icon = '🔗'
            
            // Only add if we don't already have this wallet
            if (!providers.some(p => p.name === normalizedName)) {
              providers.push({
                name: normalizedName,
                provider: provider,
                method: 'btc_providers',
                icon: icon
              })
            }
          }
        }
        
        // Check for individual wallet providers (fallback - only if not already found)
        if (win.btc && !providers.some(p => p.method === 'window.btc')) {
          providers.push({
            name: 'Bitcoin Provider',
            provider: win.btc,
            method: 'window.btc',
            icon: '₿'
          })
        }
        
        // XverseProviders - only add if not already found in btc_providers
        if (win.XverseProviders?.BitcoinProvider && !providers.some(p => p.name === 'Xverse')) {
          providers.push({
            name: 'Xverse',
            provider: win.XverseProviders.BitcoinProvider,
            method: 'XverseProviders',
            icon: '₿'
          })
        }
        
        // OKX - only add if not already found
        if (win.okxwallet?.bitcoin && !providers.some(p => p.name === 'OKX')) {
          providers.push({
            name: 'OKX',
            provider: win.okxwallet.bitcoin,
            method: 'okxwallet',
            icon: '🔷'
          })
        }
        
        // Blockchain.com - only add if not already found
        if (win.blockchain?.bitcoin && !providers.some(p => p.name === 'Blockchain.com')) {
          providers.push({
            name: 'Blockchain.com',
            provider: win.blockchain.bitcoin,
            method: 'blockchain',
            icon: '🔗'
          })
        }
        
        if (win.bitcoin && !providers.some(p => p.method === 'window.bitcoin')) {
          providers.push({
            name: 'Bitcoin Wallet',
            provider: win.bitcoin,
            method: 'window.bitcoin',
            icon: '₿'
          })
        }
    
    setDetectedBtcWallets(providers)
    setScanningWallets(false)
    console.log(`[Bitcoin Wallet Scan] Detected ${providers.length} wallet(s):`, providers.map(p => p.name))
  }

  // Call onEvmConnect when EVM wallet connects
  useEffect(() => {
    if (isConnected && address && connector) {
      // Get the connector name to track wallet provider
      const provider = connector.name || 'Unknown'
      onEvmConnect?.(address, provider)
    }
  }, [isConnected, address, connector, onEvmConnect])

  useEffect(() => {
    if (connectError) {
      // Don't log user rejection errors - they're expected
      if (connectError.name !== 'UserRejectedRequestError' && connectError.message !== 'User rejected the request.') {
        console.error('Connection error:', connectError)
      }
    }
  }, [connectError])

  // Prevent hydration mismatch - show skeleton UI instead of just "Loading..."
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">EVM Wallets (Ethereum, Base, Arbitrum, Polygon)</h3>
          <div className="rounded-lg border-2 border-gray-300 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
            <div className="animate-pulse space-y-3">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </div>
        </div>
        <div className="border-t dark:border-gray-700 pt-6">
          <h3 className="text-2xl font-bold text-black dark:text-white mb-4">Bitcoin/Sat's Wallet</h3>
          <div className="rounded-lg border-2 border-gray-300 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleBitcoinConnect = async () => {
    setConnecting(true)
    try {
      if (typeof window === 'undefined') {
        alert('Please install a Bitcoin wallet extension (Xverse, OKX, Blockchain.com, etc.)')
        return
      }

      const win = window as any
      
      // Check if we're on localhost (extensions sometimes don't inject on localhost)
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      if (isLocalhost) {
        console.warn('Running on localhost - some extensions may not inject properly')
      }
      
      console.log('[Bitcoin Wallet] Detecting available Bitcoin wallet providers...')
      
      // Wait for extensions to inject (poll for up to 10 seconds)
      let attempts = 0
      const maxAttempts = 100
      
      // Detect all available Bitcoin wallet providers
      const detectProviders = () => {
        const providers: Array<{ name: string; provider: any; method: string }> = []
        
        // Check for btc_providers array (standard for multiple wallets)
        // This is the PRIMARY method - most wallets use this
        if (win.btc_providers && Array.isArray(win.btc_providers)) {
          for (const provider of win.btc_providers) {
            const providerName = provider.name || provider.id || 'Unknown Bitcoin Wallet'
            // Don't add duplicates - if we already have this provider, skip it
            if (!providers.some(p => p.name === providerName)) {
              providers.push({
                name: providerName,
                provider: provider,
                method: 'btc_providers'
              })
            }
          }
        }
        
        // Check for individual wallet providers (fallback methods)
        // window.btc is a standard Bitcoin Provider API
        if (win.btc && !providers.some(p => p.method === 'window.btc')) {
          providers.push({
            name: 'Bitcoin Provider',
            provider: win.btc,
            method: 'window.btc'
          })
        }
        
        // XverseProviders is Xverse-specific
        if (win.XverseProviders?.BitcoinProvider && !providers.some(p => p.name === 'Xverse')) {
          providers.push({
            name: 'Xverse',
            provider: win.XverseProviders.BitcoinProvider,
            method: 'XverseProviders'
          })
        }
        
        // Check for OKX wallet
        if (win.okxwallet?.bitcoin) {
          providers.push({
            name: 'OKX',
            provider: win.okxwallet.bitcoin,
            method: 'okxwallet'
          })
        }
        
        // Check for Blockchain.com wallet
        if (win.blockchain?.bitcoin) {
          providers.push({
            name: 'Blockchain.com',
            provider: win.blockchain.bitcoin,
            method: 'blockchain'
          })
        }
        
        // Check for window.bitcoin
        if (win.bitcoin) {
          providers.push({
            name: 'Bitcoin Wallet',
            provider: win.bitcoin,
            method: 'window.bitcoin'
          })
        }
        
        return providers
      }
      
      // Poll for providers
      let detectedProviders = detectProviders()
      while (detectedProviders.length === 0 && attempts < maxAttempts) {
        attempts++
        await new Promise(resolve => setTimeout(resolve, 100))
        detectedProviders = detectProviders()
      }
      
      console.log(`[Bitcoin Wallet] Detected ${detectedProviders.length} provider(s) after ${attempts} attempts`)
      
      // If no providers found, offer manual entry
      if (detectedProviders.length === 0) {
        const useManual = confirm('No Bitcoin wallet detected. Would you like to manually enter your Bitcoin address?')
        if (useManual) {
          const address = prompt('Please enter your Bitcoin address:')
          if (address && address.trim()) {
            const btcAddressRegex = /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/
            const trimmedAddress = address.trim()
            if (btcAddressRegex.test(trimmedAddress)) {
              setBtcAddress(trimmedAddress)
              onBitcoinConnect?.(trimmedAddress, 'Manual')
              setConnecting(false)
              return
            } else {
              alert('Invalid Bitcoin address format. Please enter a valid address (starts with 1, 3, or bc1).')
            }
          }
        }
        setConnecting(false)
        return
      }
      
      // Select provider
      let selectedProvider = null
      let providerName = 'Unknown'
      
      if (detectedProviders.length === 1) {
        selectedProvider = detectedProviders[0].provider
        providerName = detectedProviders[0].name
        console.log(`[Bitcoin Wallet] Using single provider: ${providerName}`)
      } else {
        // Multiple providers - show selection dialog
        const providerList = detectedProviders.map((p, i) => `${i + 1}. ${p.name}`).join('\n')
        const choice = prompt(`Multiple Bitcoin wallets detected:\n\n${providerList}\n\nEnter the number of the wallet you want to connect (or Cancel to use manual entry):`)
        const index = parseInt(choice || '') - 1
        if (index >= 0 && index < detectedProviders.length) {
          selectedProvider = detectedProviders[index].provider
          providerName = detectedProviders[index].name
          console.log(`[Bitcoin Wallet] User selected: ${providerName}`)
        } else {
          // User cancelled or invalid choice, offer manual entry
          const useManual = confirm('Would you like to manually enter your Bitcoin address instead?')
          if (useManual) {
            const address = prompt('Please enter your Bitcoin address:')
            if (address && address.trim()) {
              const btcAddressRegex = /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/
              const trimmedAddress = address.trim()
              if (btcAddressRegex.test(trimmedAddress)) {
                setBtcAddress(trimmedAddress)
                onBitcoinConnect?.(trimmedAddress, 'Manual')
                setConnecting(false)
                return
              } else {
                alert('Invalid Bitcoin address format.')
              }
            }
          }
          setConnecting(false)
          return
        }
      }
      
      // Try to connect with selected provider
      console.log(`[Bitcoin Wallet] Attempting to connect with ${providerName}...`)
      let accounts = null
      let address = null
      let ordinalsAddress: string | null = null
      
      // Try requestAccounts first (shows popup) - this is the standard method
      if (typeof selectedProvider.requestAccounts === 'function') {
        try {
          console.log(`[Bitcoin Wallet] Trying requestAccounts() - popup should appear...`)
          accounts = await selectedProvider.requestAccounts()
          console.log(`[Bitcoin Wallet] ✅ requestAccounts result:`, accounts)
          // Normalize response - some wallets return arrays, some return objects
          if (accounts && !Array.isArray(accounts) && typeof accounts === 'object') {
            // If it's an object, try to extract array from common properties
            if (accounts.accounts && Array.isArray(accounts.accounts)) {
              accounts = accounts.accounts
            } else if (accounts.result && Array.isArray(accounts.result)) {
              accounts = accounts.result
            } else if (accounts.addresses && Array.isArray(accounts.addresses)) {
              accounts = accounts.addresses
            }
          }
        } catch (err: any) {
          console.log(`[Bitcoin Wallet] ❌ requestAccounts failed:`, err.message, err)
          if (err.message?.includes('reject') || err.message?.includes('cancel') || err.code === 4001) {
            setConnecting(false)
            return
          }
        }
      }
      
      // Try request('requestAccounts') - alternative API format
      if (!accounts && typeof selectedProvider.request === 'function') {
        try {
          console.log(`[Bitcoin Wallet] Trying request("requestAccounts") - popup should appear...`)
          accounts = await selectedProvider.request('requestAccounts', {})
          console.log(`[Bitcoin Wallet] ✅ request("requestAccounts") result:`, accounts)
          // Normalize response
          if (accounts && !Array.isArray(accounts) && typeof accounts === 'object') {
            if (accounts.accounts && Array.isArray(accounts.accounts)) {
              accounts = accounts.accounts
            } else if (accounts.result && Array.isArray(accounts.result)) {
              accounts = accounts.result
            } else if (accounts.addresses && Array.isArray(accounts.addresses)) {
              accounts = accounts.addresses
            }
          }
        } catch (err: any) {
          console.log(`[Bitcoin Wallet] ❌ request("requestAccounts") failed:`, err.message, err)
          if (err.message?.includes('reject') || err.message?.includes('cancel') || err.code === 4001) {
            setConnecting(false)
            return
          }
        }
      }
      
      // Try getAccounts (may not show popup)
      if (!accounts && typeof selectedProvider.getAccounts === 'function') {
        try {
          console.log(`[Bitcoin Wallet] Trying getAccounts()...`)
          accounts = await selectedProvider.getAccounts()
          console.log(`[Bitcoin Wallet] ✅ getAccounts result:`, accounts)
        } catch (err: any) {
          console.log(`[Bitcoin Wallet] ❌ getAccounts failed:`, err.message)
        }
      }
      
      // For XverseProviders, try getAccounts with purposes (Xverse-specific API)
      if (!accounts && (providerName === 'Xverse' || providerName.includes('Xverse')) && typeof selectedProvider.request === 'function') {
        try {
          console.log(`[Bitcoin Wallet] Trying Xverse getAccounts with purposes...`)
          accounts = await selectedProvider.request('getAccounts', { purposes: ['payment', 'ordinals'] })
          console.log(`[Bitcoin Wallet] ✅ Xverse getAccounts result:`, accounts)
        } catch (err: any) {
          console.log(`[Bitcoin Wallet] ❌ Xverse getAccounts failed:`, err.message)
          // Try with just payment purpose
          try {
            console.log(`[Bitcoin Wallet] Trying Xverse with just payment purpose...`)
            accounts = await selectedProvider.request('getAccounts', { purposes: ['payment'] })
            console.log(`[Bitcoin Wallet] ✅ Xverse payment-only result:`, accounts)
          } catch (err2: any) {
            console.log(`[Bitcoin Wallet] ❌ Xverse payment-only failed:`, err2.message)
          }
        }
      }
      
      // For XverseProviders, also try getAddresses if available
      if (!accounts && (providerName === 'Xverse' || providerName.includes('Xverse')) && typeof selectedProvider.getAddresses === 'function') {
        try {
          console.log(`[Bitcoin Wallet] Trying Xverse getAddresses()...`)
          const addresses = await selectedProvider.getAddresses()
          console.log(`[Bitcoin Wallet] ✅ Xverse getAddresses result:`, addresses)
          if (addresses && Array.isArray(addresses) && addresses.length > 0) {
            accounts = addresses
          }
        } catch (err: any) {
          console.log(`[Bitcoin Wallet] ❌ Xverse getAddresses failed:`, err.message)
        }
      }
      
      // Extract address from accounts
      if (accounts) {
        console.log(`[Bitcoin Wallet] Processing accounts response:`, accounts, 'Type:', typeof accounts, 'IsArray:', Array.isArray(accounts))
        
        // Handle JSON-RPC response format
        if (typeof accounts === 'object' && accounts !== null && accounts.result && Array.isArray(accounts.result)) {
          const resultArray = accounts.result
          console.log(`[Bitcoin Wallet] JSON-RPC format detected, ${resultArray.length} accounts`)
          if (resultArray.length > 0) {
            const paymentAccount = resultArray.find((acc: any) => acc.purpose === 'payment')
            const ordinalsAccount = resultArray.find((acc: any) => acc.purpose === 'ordinals')
            const account = paymentAccount || resultArray[0]
            console.log(`[Bitcoin Wallet] Selected account:`, account)
            address = extractBitcoinAddress(account)
            if (ordinalsAccount) {
              ordinalsAddress = extractBitcoinAddress(ordinalsAccount)
              console.log(`[Bitcoin Wallet] Found ordinals address:`, ordinalsAddress)
            }
            console.log(`[Bitcoin Wallet] Extracted payment address:`, address)
          }
        } else if (Array.isArray(accounts)) {
          // Prefer payment address over ordinals address, but also extract ordinals address
          console.log(`[Bitcoin Wallet] Array format detected, ${accounts.length} accounts`)
          const paymentAccount = accounts.find((acc: any) => acc.purpose === 'payment')
          const ordinalsAccount = accounts.find((acc: any) => acc.purpose === 'ordinals')
          const account = paymentAccount || accounts[0]
          console.log(`[Bitcoin Wallet] Selected account:`, account)
          address = extractBitcoinAddress(account)
          if (ordinalsAccount) {
            ordinalsAddress = extractBitcoinAddress(ordinalsAccount)
            console.log(`[Bitcoin Wallet] Found ordinals address:`, ordinalsAddress)
          }
          console.log(`[Bitcoin Wallet] Extracted payment address:`, address)
        } else if (typeof accounts === 'string') {
          console.log(`[Bitcoin Wallet] String format detected:`, accounts)
          address = accounts
        } else if (typeof accounts === 'object' && accounts !== null) {
          // Try to extract address from object directly
          console.log(`[Bitcoin Wallet] Object format detected, keys:`, Object.keys(accounts))
          address = extractBitcoinAddress(accounts)
          console.log(`[Bitcoin Wallet] Extracted address:`, address)
          
          // If that didn't work, try common nested structures
          if (!address) {
            if (accounts.accounts && Array.isArray(accounts.accounts) && accounts.accounts.length > 0) {
              const paymentAccount = accounts.accounts.find((acc: any) => acc.purpose === 'payment')
              const ordinalsAccount = accounts.accounts.find((acc: any) => acc.purpose === 'ordinals')
              const account = paymentAccount || accounts.accounts[0]
              address = extractBitcoinAddress(account)
              if (ordinalsAccount) {
                ordinalsAddress = extractBitcoinAddress(ordinalsAccount)
              }
            } else if (accounts.addresses && Array.isArray(accounts.addresses) && accounts.addresses.length > 0) {
              address = accounts.addresses[0]
            } else if (accounts.address) {
              address = accounts.address
            }
          }
        }
      } else {
        console.log(`[Bitcoin Wallet] No accounts returned from any method`)
      }
      
      if (address) {
        console.log(`[Bitcoin Wallet] 🎉 SUCCESS! Connected payment address: ${address} via ${providerName}`)
        if (ordinalsAddress && ordinalsAddress !== address) {
          console.log(`[Bitcoin Wallet] Also found ordinals address: ${ordinalsAddress}`)
          // Store both addresses - we'll use payment for BTC balance, ordinals address for ordinals
          // Pass ordinals address as metadata
          setBtcAddress(address)
          setConnecting(false)
          // Pass ordinals address as a third parameter (we'll need to update the callback signature)
          // For now, we'll store it and fetch from both addresses
          onBitcoinConnect?.(address, providerName, ordinalsAddress)
        } else {
          setBtcAddress(address)
          setConnecting(false)
          onBitcoinConnect?.(address, providerName)
        }
        return
      }
      
      // If we get here, connection failed - provide detailed error info
      console.error(`[Bitcoin Wallet] ❌ Failed to extract address from ${providerName}`)
      console.error(`[Bitcoin Wallet] Accounts response:`, accounts)
      console.error(`[Bitcoin Wallet] Provider object:`, selectedProvider)
      console.error(`[Bitcoin Wallet] Available methods:`, Object.keys(selectedProvider || {}))
      
      // For Xverse specifically, provide more helpful error message
      if (providerName === 'Xverse' || providerName.includes('Xverse')) {
        alert(`Failed to connect to Xverse wallet. This might be because:\n\n1. The Xverse extension service worker is inactive - try clicking the Xverse icon in your browser toolbar first\n2. You need to approve the connection in the Xverse popup\n3. The extension needs to be reloaded\n\nCheck the browser console for detailed error messages.\n\nWould you like to manually enter your Bitcoin address instead?`)
      } else {
        alert(`Failed to connect to ${providerName}. Please try again or enter your address manually.`)
      }
      
      // Offer manual entry as fallback
      const useManual = confirm('Would you like to manually enter your Bitcoin address instead?')
      if (useManual) {
        const address = prompt('Please enter your Bitcoin address:')
        if (address && address.trim()) {
          const btcAddressRegex = /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/
          const trimmedAddress = address.trim()
          if (btcAddressRegex.test(trimmedAddress)) {
            setBtcAddress(trimmedAddress)
            onBitcoinConnect?.(trimmedAddress, 'Manual')
            setConnecting(false)
            return
          } else {
            alert('Invalid Bitcoin address format.')
          }
        }
      }
      
    } catch (error: any) {
      console.error('Error connecting Bitcoin wallet:', error)
      if (error.message && error.message.includes('User rejected')) {
        // User rejected, don't show error
        setConnecting(false)
        return
      }
      alert(`Failed to connect Bitcoin wallet: ${error.message || 'Unknown error'}\n\nPlease try again or enter your address manually.`)
    } finally {
      setConnecting(false)
    }
  }

  // Only show WalletConnect - no injected wallets
  const walletConnectConnector = connectors?.find((c: any) => c.name === 'WalletConnect')

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b-2 border-gray-200">
        <button
          onClick={() => setActiveTab('evm')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'evm'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          EVM Wallets
        </button>
        <button
          onClick={() => setActiveTab('bitcoin')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'bitcoin'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Bitcoin Wallets
        </button>
      </div>

      {/* EVM Wallets Tab */}
      {activeTab === 'evm' && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Connect Any Certified EVM Wallet
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Ethereum, Base, Arbitrum, Polygon, ApeChain
          </p>
          <p className="text-xs text-gray-500 mb-6">
            Each wallet requires signature verification to prove ownership before assets can be loaded.
          </p>
          
          {/* WalletConnect button */}
          {walletConnectConnector && (
            <div className="mb-6">
              <button
                key={walletConnectConnector.uid}
                onClick={async () => {
                  try {
                    await connect({ connector: walletConnectConnector })
                  } catch (error: any) {
                    if (error?.name !== 'UserRejectedRequestError' && error?.message !== 'User rejected the request.') {
                      console.error('Error connecting:', error)
                    }
                  }
                }}
                disabled={isPending}
                className="w-full rounded-xl border-2 p-4 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group"
                style={{
                  borderColor: '#3B99FC',
                  backgroundColor: 'white',
                  color: '#3B99FC',
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B99FC20'
                  e.currentTarget.style.borderColor = '#2E7CD6'
                  e.currentTarget.style.color = '#2E7CD6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.borderColor = '#3B99FC'
                  e.currentTarget.style.color = '#3B99FC'
                }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">🔗</span>
                  <span className="font-semibold flex-1">WalletConnect</span>
                </div>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Connect any wallet via QR code
              </p>
            </div>
          )}

          {!walletConnectConnector && (
            <div className="rounded-xl border-2 border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>WalletConnect not configured.</strong> Please add <code className="bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> to your .env.local file.
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
                Get your Project ID from <a href="https://cloud.reown.com" target="_blank" rel="noopener noreferrer" className="underline">Reown Cloud</a>
              </p>
            </div>
          )}
          {connectError && connectError.name !== 'UserRejectedRequestError' && (
            <div className="mt-3 rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
              <p className="text-sm text-red-800 dark:text-red-400">Connection error: {connectError.message || 'Failed to connect'}</p>
            </div>
          )}
        </div>
      )}

      {/* Bitcoin Wallets Tab */}
      {activeTab === 'bitcoin' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              {btcAddress ? 'Connect Another Bitcoin Wallet' : 'Connect Bitcoin Wallet'}
            </h3>
            <button
              onClick={scanForBitcoinWallets}
              disabled={scanningWallets}
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
              title="Scan for available Bitcoin wallets"
            >
              {scanningWallets ? 'Scanning...' : '🔍 Scan'}
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Connect your Bitcoin wallet to view BTC, Ordinals, and Rare SATs
          </p>
        
          {/* Show detected wallets as individual buttons */}
          {detectedBtcWallets.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-sm text-gray-600 mb-2">
                Detected {detectedBtcWallets.length} Bitcoin wallet{detectedBtcWallets.length !== 1 ? 's' : ''}:
              </p>
            {detectedBtcWallets.map((wallet, index) => {
              const walletColor = wallet.name.toLowerCase().includes('xverse') ? '#F7931A' :
                                 wallet.name.toLowerCase().includes('okx') ? '#000000' :
                                 wallet.name.toLowerCase().includes('blockchain') ? '#0C6CF2' :
                                 '#F7931A'
              return (
                <button
                  key={`${wallet.method}-${index}`}
                  onClick={async () => {
                    setConnecting(true)
                    try {
                      const selectedProvider = wallet.provider
                      const providerName = wallet.name
                      console.log(`[Bitcoin Wallet] Connecting to ${providerName}...`)
                      let accounts = null
                      let address = null
                      
                      // Try requestAccounts first
                      if (typeof selectedProvider.requestAccounts === 'function') {
                        try {
                          accounts = await selectedProvider.requestAccounts()
                          if (accounts && !Array.isArray(accounts) && typeof accounts === 'object') {
                            if (accounts.accounts && Array.isArray(accounts.accounts)) accounts = accounts.accounts
                            else if (accounts.result && Array.isArray(accounts.result)) accounts = accounts.result
                            else if (accounts.addresses && Array.isArray(accounts.addresses)) accounts = accounts.addresses
                          }
                        } catch (err: any) {
                          if (err.message?.includes('reject') || err.code === 4001) {
                            setConnecting(false)
                            return
                          }
                        }
                      }
                      
                      // Try request('requestAccounts')
                      if (!accounts && typeof selectedProvider.request === 'function') {
                        try {
                          accounts = await selectedProvider.request('requestAccounts', {})
                          if (accounts && !Array.isArray(accounts) && typeof accounts === 'object') {
                            if (accounts.accounts && Array.isArray(accounts.accounts)) accounts = accounts.accounts
                            else if (accounts.result && Array.isArray(accounts.result)) accounts = accounts.result
                            else if (accounts.addresses && Array.isArray(accounts.addresses)) accounts = accounts.addresses
                          }
                        } catch (err: any) {
                          if (err.message?.includes('reject') || err.code === 4001) {
                            setConnecting(false)
                            return
                          }
                        }
                      }
                      
                      // For Xverse, try getAccounts with purposes
                      if (!accounts && wallet.name === 'Xverse' && typeof selectedProvider.request === 'function') {
                        try {
                          accounts = await selectedProvider.request('getAccounts', { purposes: ['payment', 'ordinals'] })
                        } catch (err: any) {
                          try {
                            accounts = await selectedProvider.request('getAccounts', { purposes: ['payment'] })
                          } catch (err2: any) {
                            console.log(`[${providerName}] getAccounts failed:`, err2.message)
                          }
                        }
                      }
                      
                      // Extract address
                      if (accounts) {
                        if (Array.isArray(accounts) && accounts.length > 0) {
                          const paymentAccount = accounts.find((acc: any) => acc.purpose === 'payment')
                          const account = paymentAccount || accounts[0]
                          address = extractBitcoinAddress(account)
                        } else if (typeof accounts === 'string') {
                          address = accounts
                        } else {
                          address = extractBitcoinAddress(accounts)
                        }
                      }
                      
                      if (address) {
                        setBtcAddress(address)
                        onBitcoinConnect?.(address, providerName)
                        setConnecting(false)
                      } else {
                        alert(`Failed to connect to ${providerName}. Please try manual entry.`)
                        setConnecting(false)
                      }
                    } catch (error: any) {
                      console.error(`Error connecting to ${wallet.name}:`, error)
                      alert(`Failed to connect to ${wallet.name}: ${error.message || 'Unknown error'}`)
                      setConnecting(false)
                    }
                  }}
                  disabled={connecting}
                  className="w-full rounded-xl border-2 p-4 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group"
                  style={{
                    borderColor: walletColor,
                    backgroundColor: 'white',
                    color: walletColor,
                  } as React.CSSProperties}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${walletColor}20`
                    e.currentTarget.style.borderColor = walletColor
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.borderColor = walletColor
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{wallet.icon}</span>
                    <div>
                      <span className="font-semibold block" style={{ color: walletColor } as React.CSSProperties}>
                        {wallet.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click to connect</span>
                    </div>
                  </div>
                  {connecting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: walletColor } as React.CSSProperties}></div>
                  ) : (
                    <svg className="w-5 h-5 transition-colors" style={{ color: walletColor } as React.CSSProperties} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )}
        
          {/* Fallback: Auto-detect button if no wallets detected */}
          {detectedBtcWallets.length === 0 && (
          <button
            onClick={handleBitcoinConnect}
            disabled={connecting || scanningWallets}
            className="w-full rounded-xl border-2 p-4 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group"
            style={{
              borderColor: walletConfig.Xverse.color,
              backgroundColor: 'white',
              color: walletConfig.Xverse.color,
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${walletConfig.Xverse.bgColor}20`
              e.currentTarget.style.borderColor = walletConfig.Xverse.hoverColor
              e.currentTarget.style.color = walletConfig.Xverse.hoverColor
              const textSpan = e.currentTarget.querySelector('span.font-semibold') as HTMLElement
              const svg = e.currentTarget.querySelector('svg') as SVGSVGElement
              if (textSpan) textSpan.style.color = walletConfig.Xverse.hoverColor
              if (svg) svg.style.color = walletConfig.Xverse.hoverColor
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
              e.currentTarget.style.borderColor = walletConfig.Xverse.color
              e.currentTarget.style.color = walletConfig.Xverse.color
              const textSpan = e.currentTarget.querySelector('span.font-semibold') as HTMLElement
              const svg = e.currentTarget.querySelector('svg') as SVGSVGElement
              if (textSpan) textSpan.style.color = walletConfig.Xverse.color
              if (svg) svg.style.color = walletConfig.Xverse.color
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{walletConfig.Xverse.icon}</span>
              <div>
                <span className="font-semibold block" style={{ color: walletConfig.Xverse.color } as React.CSSProperties}>
                  Auto-Detect Bitcoin Wallet
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Scans for Xverse, OKX, Blockchain.com, etc.</span>
              </div>
            </div>
            {connecting || scanningWallets ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: walletConfig.Xverse.color } as React.CSSProperties}></div>
            ) : (
              <svg className="w-5 h-5 transition-colors" style={{ color: walletConfig.Xverse.color } as React.CSSProperties} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        )}
        
          {/* Manual address entry - always visible as fallback */}
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs font-semibold text-gray-600 mb-2">Or enter Bitcoin address manually:</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Bitcoin address (1, 3, or bc1...)"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.currentTarget as HTMLInputElement
                  const address = input.value.trim()
                  if (address) {
                    const btcAddressRegex = /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/
                    if (btcAddressRegex.test(address)) {
                      setBtcAddress(address)
                      onBitcoinConnect?.(address, 'Manual')
                      input.value = ''
                    } else {
                      alert('Invalid Bitcoin address format. Please enter a valid address (starts with 1, 3, or bc1).')
                    }
                  }
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.querySelector('input[placeholder*="Bitcoin address"]') as HTMLInputElement
                if (input) {
                  const address = input.value.trim()
                  if (address) {
                    const btcAddressRegex = /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/
                    if (btcAddressRegex.test(address)) {
                      setBtcAddress(address)
                      onBitcoinConnect?.(address, 'Manual')
                      input.value = ''
                    } else {
                      alert('Invalid Bitcoin address format. Please enter a valid address (starts with 1, 3, or bc1).')
                    }
                  }
                }
              }}
              className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>
        </div>
      )}
    </div>
  )
}
