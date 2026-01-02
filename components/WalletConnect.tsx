'use client'

import { useAccount, useConnect, useDisconnect, useConnectorClient } from 'wagmi'
import { useState, useEffect } from 'react'

interface WalletConnectProps {
  onBitcoinConnect?: (address: string, provider?: string) => void
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
  },
  'Bankr': {
    color: '#8B5CF6',
    hoverColor: '#7C3AED',
    bgColor: '#8B5CF6',
    icon: '🤖'
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
  const [bankrAddress, setBankrAddress] = useState<string>('')
  const [bankrXHandle, setBankrXHandle] = useState<string>('')
  const [connectingBankr, setConnectingBankr] = useState(false)
  const [resolvingXHandle, setResolvingXHandle] = useState(false)
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bitcoin Wallet</h3>
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
        alert('Please install Xverse wallet extension from https://www.xverse.app/')
        return
      }

      const win = window as any
      
      // Check if we're on localhost (extensions sometimes don't inject on localhost)
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      if (isLocalhost) {
        console.warn('Running on localhost - some extensions may not inject properly')
      }
      
      // Try to wake up the extension service worker by attempting to communicate with it
      // This might help if the service worker is inactive
      // Based on Xverse troubleshooting: https://support.xverse.app/hc/en-us/categories/23262882625293-Troubleshooting-Errors
      console.log('Attempting to wake up Xverse extension...')
      
      // Try to trigger service worker activation by accessing extension APIs
      // Some extensions need a user interaction to activate
      try {
        // Attempt to access extension context
        if (win.btc_providers) {
          console.log('[Xverse] Extension context detected, attempting activation...')
        }
      } catch (e) {
        console.log('[Xverse] Extension context check:', e)
      }
      
      // Wait for extension to inject (poll for up to 10 seconds to allow service worker to activate)
      let attempts = 0
      const maxAttempts = 100 // 10 seconds with 100ms intervals (longer to allow service worker to wake up)
      
      // Always poll at least once to ensure attempts is tracked
      // Check immediately first, then poll if not found
      let hasProvider = win.btc || 
        (win.btc_providers && Array.isArray(win.btc_providers) && win.btc_providers.length > 0) || 
        win.XverseProviders || 
        win.bitcoin
      
      if (!hasProvider) {
        // Provider not found immediately, start polling
        while (attempts < maxAttempts) {
          attempts++
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // Check if any wallet provider is available
          hasProvider = win.btc || 
            (win.btc_providers && Array.isArray(win.btc_providers) && win.btc_providers.length > 0) || 
            win.XverseProviders || 
            win.bitcoin
          
          if (hasProvider) {
            break // Found a provider, exit loop
          }
        }
      } else {
        // Provider found immediately, but we still want to log that we checked
        attempts = 1
      }
      
      // Debug: Log what's available on window
      console.log(`[Xverse Detection] Checked ${attempts} time(s) (max: ${maxAttempts})`)
      console.log('[Xverse Detection] Checking for Xverse wallet...')
      console.log('[Xverse Detection] window.btc:', !!win.btc, typeof win.btc)
      console.log('[Xverse Detection] window.btc_providers:', !!win.btc_providers, Array.isArray(win.btc_providers), win.btc_providers)
      console.log('[Xverse Detection] window.XverseProviders:', !!win.XverseProviders, typeof win.XverseProviders)
      console.log('[Xverse Detection] window.bitcoin:', !!win.bitcoin, typeof win.bitcoin)
      
      // Also check for any injected properties
      const allWindowKeys = Object.keys(win)
      const relevantKeys = allWindowKeys.filter(k => 
        k.toLowerCase().includes('btc') || 
        k.toLowerCase().includes('bitcoin') || 
        k.toLowerCase().includes('xverse') ||
        k.toLowerCase().includes('stacks')
      )
      console.log('Relevant window properties:', relevantKeys)
      
      // Check if any of these properties exist
      if (relevantKeys.length > 0) {
        console.log('Found potentially relevant properties:', relevantKeys.map(k => ({ key: k, value: typeof win[k] })))
      }
      
      // Method 1: Check for window.btc_providers array (Xverse uses this)
      if (win.btc_providers && Array.isArray(win.btc_providers)) {
        try {
          console.log('[Xverse Detection] ✅ Found btc_providers array with', win.btc_providers.length, 'provider(s)')
          console.log('[Xverse Detection] Full btc_providers:', JSON.stringify(win.btc_providers, null, 2))
          
          // Find Xverse provider in the array - try multiple matching strategies
          let xverseProvider = win.btc_providers.find((p: any) => 
            p.name === 'Xverse Wallet' || 
            p.name === 'Xverse' ||
            p.id === 'BitcoinProvider' || 
            p.id === 'xverseProviders.BitcoinProvider' ||
            p.id === 'XverseProviders.BitcoinProvider' ||
            (p.name && p.name.toLowerCase().includes('xverse'))
          )
          
          // If not found by name, try to find any provider that has requestAccounts or getAccounts
          if (!xverseProvider && win.btc_providers.length > 0) {
            console.log('[Xverse Detection] ⚠️ Xverse not found by name, trying first available provider')
            xverseProvider = win.btc_providers[0]
          }
          
          if (xverseProvider) {
            console.log('[Xverse Detection] ✅ Using provider:', xverseProvider)
            console.log('[Xverse Detection] Provider methods:', Object.keys(xverseProvider))
            
            // Try multiple methods to get accounts
            let accounts = null
            
            // Try requestAccounts first - this will show the popup and wait for user approval
            if (typeof xverseProvider.requestAccounts === 'function') {
              try {
                console.log('[Xverse Detection] Trying requestAccounts() - popup should appear, please click Connect...')
                accounts = await xverseProvider.requestAccounts()
                console.log('[Xverse Detection] ✅ requestAccounts result:', accounts)
                // Xverse might return an array of account objects or just addresses
                if (accounts && !Array.isArray(accounts)) {
                  accounts = [accounts]
                }
              } catch (err: any) {
                console.log('[Xverse Detection] ❌ requestAccounts failed:', err.message, err)
                // If user rejected, show error
                if (err.message?.includes('reject') || err.message?.includes('cancel') || err.code === 4001) {
                  setConnecting(false)
                  alert('Connection cancelled. Please try again and click "Connect" in the Xverse popup.')
                  return
                }
              }
            }
            
            // Try request with 'requestAccounts' method (alternative API)
            if (!accounts && typeof xverseProvider.request === 'function') {
              try {
                console.log('[Xverse Detection] Trying request("requestAccounts") - popup should appear...')
                accounts = await xverseProvider.request('requestAccounts', {})
                console.log('[Xverse Detection] ✅ request("requestAccounts") result:', accounts)
                if (accounts && !Array.isArray(accounts)) {
                  accounts = [accounts]
                }
              } catch (err: any) {
                console.log('[Xverse Detection] ❌ request("requestAccounts") failed:', err.message, err)
                if (err.message?.includes('reject') || err.message?.includes('cancel') || err.code === 4001) {
                  setConnecting(false)
                  alert('Connection cancelled. Please try again and click "Connect" in the Xverse popup.')
                  return
                }
              }
            }
            
            // Try getAccounts if requestAccounts didn't work (this won't show popup, only works if already connected)
            if (!accounts && typeof xverseProvider.getAccounts === 'function') {
              try {
                console.log('[Xverse Detection] Trying getAccounts() (may not work if not already connected)...')
                accounts = await xverseProvider.getAccounts()
                console.log('[Xverse Detection] ✅ getAccounts result:', accounts)
                if (accounts && !Array.isArray(accounts)) {
                  accounts = [accounts]
                }
              } catch (err: any) {
                console.log('[Xverse Detection] ❌ getAccounts failed:', err.message)
              }
            }
            
            // Try request with 'getAccounts' method
            if (!accounts && typeof xverseProvider.request === 'function') {
              try {
                console.log('[Xverse Detection] Trying request("getAccounts")...')
                accounts = await xverseProvider.request('getAccounts', {})
                console.log('[Xverse Detection] ✅ request("getAccounts") result:', accounts)
                if (accounts && !Array.isArray(accounts)) {
                  accounts = [accounts]
                }
              } catch (err: any) {
                console.log('[Xverse Detection] ❌ request("getAccounts") failed:', err.message)
              }
            }
            
            if (accounts && accounts.length > 0) {
              // Xverse might return account objects with different structures
              let address = null
              const account = accounts[0]
              
              // Try different address formats
              if (typeof account === 'string') {
                address = account
              } else if (account.address) {
                address = account.address
              } else if (account.paymentsAddress) {
                address = account.paymentsAddress
              } else if (account.payments_address) {
                address = account.payments_address
              } else if (account.paymentAddress) {
                address = account.paymentAddress
              } else if (account.payment_address) {
                address = account.payment_address
              } else if (account.legacyAddress) {
                address = account.legacyAddress
              } else if (account.legacy_address) {
                address = account.legacy_address
              }
              
              console.log('[Xverse Detection] Account object:', account)
              console.log('[Xverse Detection] Extracted address:', address)
              
              if (address) {
                console.log('[Xverse Detection] 🎉 SUCCESS! Connected address:', address)
                setBtcAddress(address)
                setConnecting(false)
                onBitcoinConnect?.(address)
                return
              } else {
                console.log('[Xverse Detection] ⚠️ Could not extract address from account:', account)
              }
            } else {
              console.log('[Xverse Detection] ⚠️ Provider found but no accounts returned')
            }
          } else {
            console.log('[Xverse Detection] ⚠️ btc_providers array found but no Xverse provider in it')
          }
        } catch (err: any) {
          console.error('[Xverse Detection] ❌ btc_providers method failed:', err)
        }
      }
      
      // Method 2: Check for window.btc (standard Bitcoin Provider API)
      if (win.btc) {
        try {
          console.log('[Xverse Detection] ✅ Found window.btc, trying multiple methods...')
          
          // Try request('requestAccounts') first - this shows popup and waits for user approval
          try {
            console.log('[Xverse Detection] Trying btc.request("requestAccounts") - popup should appear, please click Connect...')
            const accounts = await win.btc.request('requestAccounts', {})
            console.log('[Xverse Detection] ✅ btc.request("requestAccounts") result:', accounts)
            if (accounts && accounts.length > 0) {
              const address = extractBitcoinAddress(accounts[0])
              if (address) {
                setBtcAddress(address)
                setConnecting(false)
                onBitcoinConnect?.(address)
                return
              }
            }
          } catch (err: any) {
            console.log('[Xverse Detection] ❌ btc.request("requestAccounts") failed:', err.message, err)
            if (err.message?.includes('reject') || err.message?.includes('cancel') || err.code === 4001) {
              setConnecting(false)
              alert('Connection cancelled. Please try again and click "Connect" in the Xverse popup.')
              return
            }
          }
          
          // Try request('getAccounts') - may not show popup if already connected
          try {
            console.log('[Xverse Detection] Trying btc.request("getAccounts")...')
            const accounts = await win.btc.request('getAccounts', {})
            console.log('[Xverse Detection] ✅ btc.request("getAccounts") result:', accounts)
            if (accounts && accounts.length > 0) {
              const address = extractBitcoinAddress(accounts[0])
              if (address) {
                setBtcAddress(address)
                setConnecting(false)
                onBitcoinConnect?.(address)
                return
              }
            }
          } catch (err: any) {
            console.log('[Xverse Detection] ❌ btc.request("getAccounts") failed:', err.message)
          }
          
          // Try direct getAccounts method
          if (typeof win.btc.getAccounts === 'function') {
            try {
              console.log('[Xverse Detection] Trying btc.getAccounts()...')
              const accounts = await win.btc.getAccounts()
              console.log('[Xverse Detection] ✅ btc.getAccounts() result:', accounts)
              if (accounts && accounts.length > 0) {
                const address = extractBitcoinAddress(accounts[0])
                if (address) {
                  setBtcAddress(address)
                  setConnecting(false)
                  onBitcoinConnect?.(address)
                  return
                }
              }
            } catch (err: any) {
              console.log('[Xverse Detection] ❌ btc.getAccounts() failed:', err.message)
            }
          }
          
          // Try direct requestAccounts method - this shows popup and waits for user approval
          if (typeof win.btc.requestAccounts === 'function') {
            try {
              console.log('[Xverse Detection] Trying btc.requestAccounts() - popup should appear, please click Connect...')
              const accounts = await win.btc.requestAccounts()
              console.log('[Xverse Detection] ✅ btc.requestAccounts() result:', accounts)
              if (accounts && accounts.length > 0) {
                const address = extractBitcoinAddress(accounts[0])
                if (address) {
                  setBtcAddress(address)
                  setConnecting(false)
                  onBitcoinConnect?.(address)
                  return
                }
              }
            } catch (err: any) {
              console.log('[Xverse Detection] ❌ btc.requestAccounts() failed:', err.message, err)
              if (err.message?.includes('reject') || err.message?.includes('cancel') || err.code === 4001) {
                setConnecting(false)
                alert('Connection cancelled. Please try again and click "Connect" in the Xverse popup.')
                return
              }
            }
          }
        } catch (err: any) {
          console.error('[Xverse Detection] ❌ window.btc methods all failed:', err)
        }
      }

      // Method 3: Check for XverseProviders (Xverse-specific API)
      // This is the actual provider object, not just metadata
      if (win.XverseProviders && win.XverseProviders.BitcoinProvider) {
        try {
          console.log('[Xverse Detection] ✅ Found XverseProviders.BitcoinProvider')
          const provider = win.XverseProviders.BitcoinProvider
          console.log('[Xverse Detection] Provider methods available:', Object.keys(provider))
          
          let accounts = null
          
          // Try getAddresses() first - might be simpler and not need purposes
          if (typeof provider.getAddresses === 'function') {
            try {
              console.log('[Xverse Detection] Trying XverseProviders.BitcoinProvider.getAddresses()...')
              const addresses = await provider.getAddresses()
              console.log('[Xverse Detection] ✅ getAddresses() result:', addresses)
              if (addresses && addresses.length > 0) {
                accounts = addresses // Use addresses as accounts
              }
            } catch (err: any) {
              console.log('[Xverse Detection] ❌ getAddresses() failed:', err.message)
            }
          }
          
          // Note: getAccounts() requires purposes parameter, so we use request() instead below
          
          // Try request with 'getAccounts' - Xverse requires 'purposes' parameter
          if (!accounts && typeof provider.request === 'function') {
            try {
              console.log('[Xverse Detection] Trying provider.request("getAccounts") with purposes...')
              // Xverse getAccounts requires purposes parameter (payment, ordinals, staking, etc.)
              accounts = await provider.request('getAccounts', { 
                purposes: ['payment', 'ordinals'] // Common Bitcoin purposes
              })
              console.log('[Xverse Detection] ✅ request("getAccounts") result:', accounts)
            } catch (err: any) {
              console.log('[Xverse Detection] ❌ request("getAccounts") failed:', err.message)
              // Try with just payment purpose
              try {
                console.log('[Xverse Detection] Trying with just "payment" purpose...')
                accounts = await provider.request('getAccounts', { purposes: ['payment'] })
                console.log('[Xverse Detection] ✅ request("getAccounts") with payment result:', accounts)
              } catch (err2: any) {
                console.log('[Xverse Detection] ❌ request("getAccounts") with payment failed:', err2.message)
              }
            }
          }
          
          // Try getAddresses - might not need purposes
          if (!accounts && typeof provider.getAddresses === 'function') {
            try {
              console.log('[Xverse Detection] Trying getAddresses()...')
              const addresses = await provider.getAddresses()
              console.log('[Xverse Detection] ✅ getAddresses() result:', addresses)
              if (addresses && addresses.length > 0) {
                accounts = addresses // Use addresses as accounts
              }
            } catch (err: any) {
              console.log('[Xverse Detection] ❌ getAddresses() failed:', err.message)
            }
          }
          
          // Try request with 'getAddresses'
          if (!accounts && typeof provider.request === 'function') {
            try {
              console.log('[Xverse Detection] Trying provider.request("getAddresses")...')
              accounts = await provider.request('getAddresses', {})
              console.log('[Xverse Detection] ✅ request("getAddresses") result:', accounts)
            } catch (err: any) {
              console.log('[Xverse Detection] ❌ request("getAddresses") failed:', err.message)
            }
          }
          
          // Handle different response formats
          let address = null
          
          if (accounts) {
            console.log('[Xverse Detection] Raw accounts response:', accounts, 'Type:', typeof accounts)
            
            if (Array.isArray(accounts)) {
              console.log('[Xverse Detection] Accounts is an array with', accounts.length, 'items')
              if (accounts.length > 0) {
                const first = accounts[0]
                console.log('[Xverse Detection] First account item:', first, 'Type:', typeof first)
                address = first?.address || first?.value || first?.publicKey || first
                if (typeof first === 'object' && first !== null) {
                  // Try common property names
                  address = first.address || first.value || first.publicKey || first.account || first.btcAddress || first
                }
              }
            } else if (typeof accounts === 'object' && accounts !== null) {
              console.log('[Xverse Detection] Accounts is an object, keys:', Object.keys(accounts))
              address = accounts.address || accounts.value || accounts.publicKey || accounts.account || accounts.btcAddress
              // If it's an object with an array property
              if (!address && accounts.accounts && Array.isArray(accounts.accounts) && accounts.accounts.length > 0) {
                const first = accounts.accounts[0]
                address = first?.address || first?.value || first
              }
              if (!address && accounts.addresses && Array.isArray(accounts.addresses) && accounts.addresses.length > 0) {
                const first = accounts.addresses[0]
                address = first?.address || first?.value || first
              }
            } else if (typeof accounts === 'string') {
              address = accounts
            }
            
            if (address) {
              console.log('[Xverse Detection] 🎉 SUCCESS! Extracted address:', address)
              setBtcAddress(address)
              setConnecting(false)
              onBitcoinConnect?.(address)
              return
            } else {
              try {
                const accountsStr = JSON.stringify(accounts, null, 2)
                console.log('[Xverse Detection] ⚠️ Accounts returned but couldn\'t extract address. Full response:', accountsStr)
              } catch (e) {
                console.log('[Xverse Detection] ⚠️ Accounts returned but couldn\'t extract address. Response type:', typeof accounts, 'Value:', accounts)
              }
            }
          }
        } catch (err: any) {
          console.error('[Xverse Detection] ❌ XverseProviders method failed:', err)
        }
      }

      // Method 4: Check for window.bitcoin (some wallets use this)
      if (win.bitcoin) {
        try {
          console.log('Trying window.bitcoin...')
          const accounts = await win.bitcoin.requestAccounts()
          if (accounts && accounts.length > 0) {
            const address = extractBitcoinAddress(accounts[0])
            if (address) {
              setBtcAddress(address)
              setConnecting(false)
              onBitcoinConnect?.(address)
              return
            }
          }
        } catch (err: any) {
          console.log('window.bitcoin failed:', err)
        }
      }

      // Method 5: Check for Stacks provider (Xverse also supports Stacks)
      if (win.StacksProvider) {
        try {
          console.log('Trying StacksProvider (Xverse)...')
          const provider = win.StacksProvider
          if (provider.getAccounts) {
            const accounts = await provider.getAccounts()
            console.log('Accounts from StacksProvider:', accounts)
            if (accounts && accounts.length > 0) {
              const address = accounts[0]
              if (address) {
                setBtcAddress(address)
                setConnecting(false)
                onBitcoinConnect?.(address)
                return
              }
            }
          }
        } catch (err: any) {
          console.log('StacksProvider method failed:', err)
        }
      }

      // If we get here, Xverse is not detected
      // Reuse the relevantKeys that were already defined earlier for debugging
      const finalAttempts = attempts >= maxAttempts ? maxAttempts : attempts
      console.error('Xverse wallet not found after', finalAttempts, 'polling attempts')
      console.error('Relevant window properties:', relevantKeys)
      console.error('Sample of all window properties (first 30):', allWindowKeys.slice(0, 30))
      
      // Provide helpful troubleshooting
      // Reuse isLocalhost that was already defined earlier in the function
      const troubleshooting = `Xverse wallet not detected after ${finalAttempts} attempts.

⚠️ IMPORTANT: If you see "service worker (Inactive)" in chrome://extensions/:

1. ACTIVATE THE SERVICE WORKER:
   - Click the Xverse extension icon in your browser toolbar
   - This will wake up the inactive service worker
   - Wait 2-3 seconds, then try connecting again

2. IF SERVICE WORKER STAYS INACTIVE:
   - Go to chrome://extensions/
   - Find Xverse extension
   - Click "service worker" link to open it
   - Or click the "Reload" button (circular arrow icon) on the extension card
   - Then try connecting again

3. VERIFY INSTALLATION:
   - Make sure Xverse is ENABLED (toggle should be ON)
   - Check that it has permission to access this site

4. OTHER FIXES:
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Close and reopen your browser completely
   ${isLocalhost ? '\n⚠️ NOTE: You are on localhost. Some extensions may not inject on localhost.\n   Try deploying to a public URL or use a tunneling service.' : ''}

5. ALTERNATIVE:
   - You can manually enter your Bitcoin address below
   - Or try using Xverse on a deployed version of this app`

      alert(troubleshooting)
      
      // Offer manual address entry as fallback
      const useManual = confirm('Would you like to manually enter your Bitcoin address instead?')
      if (useManual) {
        const address = prompt('Please enter your Bitcoin address:')
        if (address && address.trim()) {
          // Basic validation - Bitcoin addresses start with 1, 3, or bc1
          const btcAddressRegex = /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/
          const trimmedAddress = address.trim()
          if (btcAddressRegex.test(trimmedAddress)) {
            setBtcAddress(trimmedAddress)
            onBitcoinConnect?.(trimmedAddress)
            return
          } else {
            alert('Invalid Bitcoin address format. Please enter a valid address (starts with 1, 3, or bc1).')
          }
        }
      }
    } catch (error: any) {
      console.error('Error connecting Bitcoin wallet:', error)
      if (error.message && error.message.includes('User rejected')) {
        // User rejected, don't show error
        return
      }
      alert(`Failed to connect Bitcoin wallet: ${error.message || 'Unknown error'}\n\nPlease make sure Xverse is installed and enabled.`)
    } finally {
      setConnecting(false)
    }
  }

  // Filter and sort connectors - WalletConnect first, then only top 3 injected wallets
  const top3Wallets = ['MetaMask', 'Coinbase Wallet', 'Rainbow']
  const availableConnectors = (connectors?.filter(c => {
    if (!c || !c.uid) return false
    // Only show WalletConnect and top 3 injected wallets
    if (c.name === 'WalletConnect') return true
    if (c.type === 'injected' && top3Wallets.includes(c.name)) return true
    return false
  }) || []).sort((a, b) => {
    // WalletConnect first, then top 3 wallets in order
    if (a.name === 'WalletConnect') return -1
    if (b.name === 'WalletConnect') return 1
    const aIndex = top3Wallets.indexOf(a.name)
    const bIndex = top3Wallets.indexOf(b.name)
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return 0
  })

  // Separate WalletConnect from injected wallets
  const walletConnectConnector = availableConnectors.find(c => c.name === 'WalletConnect')
  const injectedConnectors = availableConnectors.filter(c => c.name !== 'WalletConnect')

  return (
    <div className="space-y-6">
      {/* Always show connection options - don't show wagmi connected status here, parent manages that */}
      <div>
        <h3 className="text-xl font-bold text-gray-950 mb-4">
          Connect EVM Wallet (Ethereum, Base, Arbitrum, Polygon)
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Each wallet requires signature verification to prove ownership before assets can be loaded.
        </p>
        
        {/* WalletConnect button at the top */}
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

        {/* Top 3 Popular Wallets */}
        {injectedConnectors.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Popular Browser Wallets
            </h4>
            <div className="space-y-3">
              {injectedConnectors.map((connector) => {
                const config = getWalletConfig(connector.name)
                return (
                <button
                  key={connector.uid}
                  onClick={async () => {
                    try {
                      // Explicitly use the clicked connector - don't let wagmi auto-select
                      console.log('Connecting with connector:', connector.name, connector.uid, connector.type)
                      
                      // For injected connectors, check if wallet is actually available
                      // If not, fall back to WalletConnect QR code
                      if (connector.type === 'injected' && connector.name !== 'WalletConnect') {
                        try {
                          // Try to check if wallet is available
                          const accounts = await connector.getAccounts?.().catch(() => [])
                          if (!accounts || accounts.length === 0) {
                            // Wallet not available, use WalletConnect QR instead
                            const walletConnectConnector = connectors?.find(c => c.name === 'WalletConnect')
                            if (walletConnectConnector) {
                              console.log(`${connector.name} not available, using WalletConnect QR instead`)
                              await connect({ connector: walletConnectConnector })
                              return
                            }
                          }
                        } catch (e) {
                          // If check fails, try WalletConnect QR as fallback
                          const walletConnectConnector = connectors?.find(c => c.name === 'WalletConnect')
                          if (walletConnectConnector) {
                            console.log(`${connector.name} check failed, using WalletConnect QR instead`)
                            await connect({ connector: walletConnectConnector })
                            return
                          }
                        }
                      }
                      
                      // Connect with the specific connector
                      await connect({ connector })
                    } catch (error: any) {
                      // Don't show error for user rejection
                      if (error?.name !== 'UserRejectedRequestError' && error?.message !== 'User rejected the request.') {
                        console.error('Error connecting to', connector.name, ':', error)
                        // If injected wallet fails, try WalletConnect QR as fallback
                        if (connector.type === 'injected' && connector.name !== 'WalletConnect') {
                          const walletConnectConnector = connectors?.find(c => c.name === 'WalletConnect')
                          if (walletConnectConnector) {
                            try {
                              console.log('Falling back to WalletConnect QR')
                              await connect({ connector: walletConnectConnector })
                              return
                            } catch (fallbackError) {
                              // Fallback also failed
                            }
                          }
                        }
                        alert(`Failed to connect ${connector.name}. Please make sure the wallet extension is installed and unlocked.`)
                      }
                    }
                  }}
                  disabled={isPending}
                  className="w-full rounded-xl border-2 p-4 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group"
                  style={{
                    borderColor: config.color,
                    backgroundColor: 'white',
                    color: config.color,
                  } as React.CSSProperties}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${config.bgColor}20`
                    e.currentTarget.style.borderColor = config.hoverColor
                    e.currentTarget.style.color = config.hoverColor
                    // Update text and icon colors on hover
                    const textSpan = e.currentTarget.querySelector('span.font-semibold') as HTMLElement
                    const svg = e.currentTarget.querySelector('svg') as SVGSVGElement
                    if (textSpan) textSpan.style.color = config.hoverColor
                    if (svg) svg.style.color = config.hoverColor
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.borderColor = config.color
                    e.currentTarget.style.color = config.color
                    // Reset text and icon colors
                    const textSpan = e.currentTarget.querySelector('span.font-semibold') as HTMLElement
                    const svg = e.currentTarget.querySelector('svg') as SVGSVGElement
                    if (textSpan) textSpan.style.color = config.color
                    if (svg) svg.style.color = config.color
                  }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">{config.icon}</span>
                    <span 
                      className="font-semibold flex-1" 
                      style={{ 
                        color: config.color, 
                        fontWeight: 600,
                      } as React.CSSProperties}
                    >
                      {connector.name}
                    </span>
                  </div>
                  <svg 
                    className="w-5 h-5 flex-shrink-0" 
                    style={{ color: config.color } as React.CSSProperties} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                )
              })}
            </div>
          </div>
        )}

        {availableConnectors.length === 0 && (
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

      {/* Bankr Wallet Connection */}
      <div className="border-t dark:border-gray-700 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Bankr Wallet (Social Media Wallet)
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Connect your Bankr wallet linked to your X (Twitter) account. Enter your X handle or wallet address.
        </p>
        <div className="space-y-3">
          {/* X Handle Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              X (Twitter) Handle
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={bankrXHandle}
                onChange={(e) => {
                  setBankrXHandle(e.target.value)
                  setResolvedAddress(null) // Clear resolved address when handle changes
                }}
                placeholder="@yourhandle or yourhandle"
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 p-3 text-sm focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <button
                onClick={async () => {
                  if (!bankrXHandle.trim()) {
                    alert('Please enter your X handle')
                    return
                  }

                  setResolvingXHandle(true)
                  try {
                    const response = await fetch('/api/bankr/resolve', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ xHandle: bankrXHandle }),
                    })

                    const data = await response.json()

                    if (response.ok && data.walletAddress) {
                      setResolvedAddress(data.walletAddress)
                      setBankrAddress(data.walletAddress) // Auto-fill wallet address
                    } else {
                      alert(data.error || 'Failed to resolve X handle. Make sure your X account is connected to Bankr.')
                    }
                  } catch (error: any) {
                    console.error('Error resolving X handle:', error)
                    alert('Failed to resolve X handle. Please try entering your wallet address manually.')
                  } finally {
                    setResolvingXHandle(false)
                  }
                }}
                disabled={resolvingXHandle || !bankrXHandle.trim()}
                className="px-4 py-3 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {resolvingXHandle ? 'Resolving...' : 'Resolve'}
              </button>
            </div>
            {resolvedAddress && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                ✓ Resolved: {resolvedAddress}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter your X handle to automatically find your Bankr wallet
            </p>
          </div>

          {/* Wallet Address Input (Manual or Auto-filled) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Or Enter Wallet Address Manually
            </label>
            <input
              type="text"
              value={bankrAddress}
              onChange={(e) => setBankrAddress(e.target.value)}
              placeholder="0xce561ebc384d48146997b9cf2dc41335c4ee9477"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-3 text-sm font-mono focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter your Bankr wallet address directly (starts with 0x)
            </p>
          </div>

          <button
            onClick={async () => {
              const addressToUse = resolvedAddress || bankrAddress.trim()
              
              if (!addressToUse) {
                alert('Please enter your X handle and click "Resolve" or enter your wallet address manually')
                return
              }
              
              const trimmedAddress = addressToUse.trim().toLowerCase()
              
              // Validate Ethereum address format
              if (!trimmedAddress.startsWith('0x') || trimmedAddress.length !== 42) {
                alert('Invalid wallet address. Please enter a valid Ethereum address (starts with 0x, 42 characters).')
                return
              }
              
              setConnectingBankr(true)
              try {
                // Connect Bankr wallet as an EVM wallet with provider "Bankr"
                await onEvmConnect?.(trimmedAddress, 'Bankr')
                // Clear inputs on success
                setBankrAddress('')
                setBankrXHandle('')
                setResolvedAddress(null)
              } catch (error: any) {
                console.error('Error connecting Bankr wallet:', error)
                alert(`Failed to connect Bankr wallet: ${error.message || 'Unknown error'}`)
              } finally {
                setConnectingBankr(false)
              }
            }}
            disabled={connectingBankr || (!bankrAddress.trim() && !resolvedAddress)}
            className="w-full rounded-xl border-2 p-4 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group"
            style={{
              borderColor: walletConfig.Bankr.color,
              backgroundColor: 'white',
              color: walletConfig.Bankr.color,
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${walletConfig.Bankr.bgColor}20`
              e.currentTarget.style.borderColor = walletConfig.Bankr.hoverColor
              e.currentTarget.style.color = walletConfig.Bankr.hoverColor
              const textSpan = e.currentTarget.querySelector('span.font-semibold') as HTMLElement
              const svg = e.currentTarget.querySelector('svg') as SVGSVGElement
              if (textSpan) textSpan.style.color = walletConfig.Bankr.hoverColor
              if (svg) svg.style.color = walletConfig.Bankr.hoverColor
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white'
              e.currentTarget.style.borderColor = walletConfig.Bankr.color
              e.currentTarget.style.color = walletConfig.Bankr.color
              const textSpan = e.currentTarget.querySelector('span.font-semibold') as HTMLElement
              const svg = e.currentTarget.querySelector('svg') as SVGSVGElement
              if (textSpan) textSpan.style.color = walletConfig.Bankr.color
              if (svg) svg.style.color = walletConfig.Bankr.color
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{walletConfig.Bankr.icon}</span>
              <div>
                <span className="font-semibold block" style={{ color: walletConfig.Bankr.color } as React.CSSProperties}>
                  Connect Bankr Wallet
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Connect your social media wallet</span>
              </div>
            </div>
            {connectingBankr ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: walletConfig.Bankr.color } as React.CSSProperties}></div>
            ) : (
              <svg className="w-5 h-5 transition-colors" style={{ color: walletConfig.Bankr.color } as React.CSSProperties} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      <div className="border-t dark:border-gray-700 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {btcAddress ? 'Connect Another Bitcoin Wallet' : 'Bitcoin Wallet'}
        </h3>
        <button
          onClick={handleBitcoinConnect}
          disabled={connecting}
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
            // Update text and icon colors on hover
            const textSpan = e.currentTarget.querySelector('span.font-semibold') as HTMLElement
            const svg = e.currentTarget.querySelector('svg') as SVGSVGElement
            if (textSpan) textSpan.style.color = walletConfig.Xverse.hoverColor
            if (svg) svg.style.color = walletConfig.Xverse.hoverColor
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white'
            e.currentTarget.style.borderColor = walletConfig.Xverse.color
            e.currentTarget.style.color = walletConfig.Xverse.color
            // Reset text and icon colors
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
                Xverse Wallet
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Connect your Bitcoin wallet</span>
            </div>
          </div>
          {connecting ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: walletConfig.Xverse.color } as React.CSSProperties}></div>
          ) : (
            <svg className="w-5 h-5 transition-colors" style={{ color: walletConfig.Xverse.color } as React.CSSProperties} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
