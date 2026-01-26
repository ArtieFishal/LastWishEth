'use client'

// Disable static generation - this page requires client-side only features
export const dynamic = 'force-dynamic'
export const dynamicParams = true

import { useState, useEffect, useMemo } from 'react'
import { useAccount, useDisconnect, useSignMessage, useConnect } from 'wagmi'
import { WalletConnect } from '@/components/WalletConnect'
import { AssetList } from '@/components/AssetList'
import { AssetSelector } from '@/components/AssetSelector'
import { WalletNameEditor } from '@/components/WalletNameEditor'
import { reverseResolveAddress, type ResolvedName } from '@/lib/name-resolvers'
import { Asset, QueuedWalletSession } from '@/types'
import axios from 'axios'
import { generateInventoryPDF, InventoryData } from '@/lib/inventory-pdf-generator'
import { getImageUrlWithIPFSFallback } from '@/lib/nft-metadata'
import { clearWagmiIndexedDB } from '@/lib/wallet-cleanup'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

type Step = 'connect' | 'assets' | 'preview' | 'print'

const steps: Array<{ id: Step; label: string; number: number }> = [
  { id: 'connect', label: 'Connect Wallets', number: 1 },
  { id: 'assets', label: 'Select Assets', number: 2 },
  { id: 'preview', label: 'Preview', number: 3 },
  { id: 'print', label: 'Generate PDF', number: 4 },
]

export default function InventoryPage() {
  const { address: evmAddress, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const { connect, connectors } = useConnect()
  const { signMessageAsync } = useSignMessage({
    mutation: {
      onError: (error) => {
        console.error('Sign message error:', error)
      }
    }
  })

  const [step, setStep] = useState<Step>('connect')
  const [btcAddress, setBtcAddress] = useState<string | null>(null)
  const [btcOrdinalsAddress, setBtcOrdinalsAddress] = useState<string | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ownerName, setOwnerName] = useState('')
  const [walletNames, setWalletNames] = useState<Record<string, string>>({})
  const [resolvedEnsNames, setResolvedEnsNames] = useState<Record<string, string>>({})
  const [walletProviders, setWalletProviders] = useState<Record<string, string>>({})
  const [connectedEVMAddresses, setConnectedEVMAddresses] = useState<Set<string>>(new Set())
  const [connectedSolanaAddresses, setConnectedSolanaAddresses] = useState<Set<string>>(new Set())
  const [verifiedAddresses, setVerifiedAddresses] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [selectedWalletForLoading, setSelectedWalletForLoading] = useState<string | null>(null)
  const [queuedSessions, setQueuedSessions] = useState<QueuedWalletSession[]>([])
  const [hideSpamTokens, setHideSpamTokens] = useState(true)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Verify wallet ownership with signature
  const verifyWalletOwnership = async (address: string) => {
    if (verifiedAddresses.has(address)) {
      return true
    }

    if (address !== evmAddress) {
      setError('Please connect the wallet you want to verify')
      return false
    }

    setError(null)

    try {
      const message = `I am the owner of this wallet address: ${address}\n\nThis signature proves I control this wallet and authorize LastWishCrypto to access my asset information.\n\nTimestamp: ${Date.now()}`
      
      const signature = await signMessageAsync({ 
        message,
      })

      if (signature && signature.length > 0) {
        setVerifiedAddresses(prev => new Set([...prev, address]))
        setError(null)
        return true
      } else {
        setError('Signature verification failed. Please try again.')
        return false
      }
    } catch (error: any) {
      if (error?.name === 'UserRejectedRequestError' || error?.message?.includes('rejected')) {
        setError('Signature request was cancelled. You must sign to verify wallet ownership.')
      } else {
        setError('Error verifying wallet: ' + (error?.message || 'Unknown error'))
      }
      return false
    }
  }

  // Resolve wallet names - always resolve ENS names for all connected wallets
  useEffect(() => {
    const resolveWalletNames = async () => {
      const newWalletNames: Record<string, string> = { ...walletNames }
      let updated = false

      const resolveWithTimeout = async (address: string, timeoutMs = 8000): Promise<ResolvedName | null> => {
        try {
          const timeoutPromise = new Promise<null>((resolve) => 
            setTimeout(() => resolve(null), timeoutMs)
          )
          const resolvePromise = reverseResolveAddress(address)
          const result = await Promise.race([resolvePromise, timeoutPromise])
          return result
        } catch (error) {
          console.warn(`[Inventory] Failed to resolve name for ${address}:`, error)
          return null
        }
      }

      // Resolve current EVM address
      const evmAddressLower = evmAddress?.toLowerCase()
      if (evmAddress && evmAddressLower) {
        // Always try to resolve, even if we already have a name
        const resolved = await resolveWithTimeout(evmAddress)
        if (resolved) {
          newWalletNames[evmAddress] = resolved.name
          setResolvedEnsNames(prev => {
            const key = evmAddressLower
            if (prev[key] === resolved.name) return prev
            return { ...prev, [key]: resolved.name }
          })
          updated = true
          console.log(`[Inventory] Resolved ENS name for ${evmAddress}: ${resolved.name}`)
        }
      }

      // Resolve all connected EVM addresses - always try to resolve
      const allEVMAddresses = Array.from(connectedEVMAddresses)
      const resolutionPromises = allEVMAddresses.map(async (addr) => {
        if (!addr) return null
        const addrLower = addr.toLowerCase()
        // Always try to resolve, even if we think we already have it
        const resolved = await resolveWithTimeout(addr)
        if (resolved) {
          setResolvedEnsNames(prev => {
            if (prev[addrLower] === resolved.name) return prev
            return { ...prev, [addrLower]: resolved.name }
          })
          newWalletNames[addr] = resolved.name
          updated = true
          console.log(`[Inventory] Resolved ENS name for ${addr}: ${resolved.name}`)
        }
        return resolved
      })

      await Promise.allSettled(resolutionPromises)

      if (updated) {
        setWalletNames(newWalletNames)
      }
    }

    // Always resolve when we have EVM addresses
    if (evmAddress || connectedEVMAddresses.size > 0) {
      resolveWalletNames()
    }
  }, [evmAddress, connectedEVMAddresses.size, queuedSessions.length])

  // Load assets for selected wallet
  const loadAssets = async (walletAddress: string, walletType: 'evm' | 'btc' | 'solana', provider?: string) => {
    setLoading(true)
    setError(null)

    try {
      console.log(`[Inventory] Loading assets for ${walletType} wallet: ${walletAddress}`)
      let response
      if (walletType === 'evm') {
        response = await axios.post('/api/portfolio/evm', {
          addresses: [walletAddress]
        }, {
          timeout: 60000 // 60 second timeout for EVM
        })
      } else if (walletType === 'btc') {
        console.log(`[Inventory] Fetching Bitcoin assets from: ${walletAddress}`)
        response = await axios.post('/api/portfolio/btc', {
          address: walletAddress
        }, {
          timeout: 60000 // 60 second timeout for Bitcoin (ordinals can take time)
        })
        console.log(`[Inventory] Bitcoin API response:`, response.data)
      } else if (walletType === 'solana') {
        response = await axios.post('/api/portfolio/solana', {
          address: walletAddress
        }, {
          timeout: 60000 // 60 second timeout for Solana
        })
      } else {
        throw new Error('Unknown wallet type')
      }

      const loadedAssets: Asset[] = response.data.assets || []
      console.log(`[Inventory] Loaded ${loadedAssets.length} assets from ${walletAddress}`)
      
      // Add wallet address and provider to each asset, and ensure image data is preserved and normalized
      const assetsWithWallet = loadedAssets.map(asset => {
        // For NFTs, ensure we have imageUrl or image field
        const isNFT = asset.type === 'erc721' || asset.type === 'erc1155' || asset.type === 'nft'
        let imageUrl = asset.imageUrl || asset.image
        
        // Normalize IPFS URLs immediately so they're ready to display
        if (imageUrl) {
          const normalized = getImageUrlWithIPFSFallback(imageUrl)
          if (normalized) {
            imageUrl = normalized
          }
        }
        
        // If no imageUrl but we have metadata with token_uri, that's okay - NFTImage will fetch it
        // But log it for debugging
        if (isNFT && !imageUrl) {
          const tokenUri = asset.metadata?.token_uri || asset.metadata?.tokenUri || asset.contentUri
          if (tokenUri) {
            console.log(`[Inventory] NFT ${asset.name} (${asset.tokenId}) has tokenUri but no imageUrl:`, tokenUri)
          } else {
            console.warn(`[Inventory] NFT ${asset.name} (${asset.tokenId}) has no imageUrl or tokenUri`)
          }
        }
        
        return {
          ...asset,
          walletAddress,
          walletProvider: provider || 'Unknown',
          // Ensure imageUrl is normalized and set
          imageUrl: imageUrl,
          // Ensure image field is also set for compatibility
          image: imageUrl || asset.image,
        }
      })

      // Create queued session
      const session: QueuedWalletSession = {
        id: `${walletType}-${walletAddress}-${Date.now()}`,
        walletAddress,
        walletType,
        walletProvider: provider,
        ensName: resolvedEnsNames[walletAddress.toLowerCase()],
        walletName: walletNames[walletAddress] || resolvedEnsNames[walletAddress.toLowerCase()],
        assets: assetsWithWallet,
        allocations: [],
        verified: verifiedAddresses.has(walletAddress),
        createdAt: Date.now(),
      }

      setQueuedSessions(prev => {
        const existingIndex = prev.findIndex(s => 
          s.walletAddress.toLowerCase() === walletAddress.toLowerCase() && s.walletType === walletType
        )
        if (existingIndex >= 0) {
          const updated = [...prev]
          updated[existingIndex] = session
          return updated
        }
        return [...prev, session]
      })

      setAssets(prev => [...prev, ...assetsWithWallet])
      setSelectedWalletForLoading(null)
      
      // Show success message
      if (assetsWithWallet.length > 0) {
        console.log(`Successfully loaded ${assetsWithWallet.length} assets from ${walletAddress}`)
      } else {
        console.log(`No assets found for wallet ${walletAddress}`)
      }
    } catch (error: any) {
      console.error('Error loading assets:', error)
      setError(error.response?.data?.error || error.message || 'Failed to load assets')
    } finally {
      setLoading(false)
    }
  }

  // Handle EVM wallet connection
  const onEvmConnect = async (address: string, provider?: string) => {
    const addressLower = address.toLowerCase()
    if (connectedEVMAddresses.has(addressLower)) {
      return
    }

    setConnectedEVMAddresses(prev => new Set([...prev, addressLower]))
    if (provider) {
      setWalletProviders(prev => ({ ...prev, [addressLower]: provider }))
    }

    // Auto-verify if already connected via wagmi
    if (evmAddress?.toLowerCase() === addressLower) {
      const verified = await verifyWalletOwnership(address)
      // Auto-load assets after verification
      if (verified) {
        setTimeout(() => {
          loadAssets(address, 'evm', provider)
        }, 500)
      }
    }
  }

  // Handle Bitcoin wallet connection (with ordinals address support)
  const onBtcConnect = async (address: string, provider?: string, ordinalsAddress?: string) => {
    setBtcAddress(address)
    if (ordinalsAddress && ordinalsAddress !== address) {
      setBtcOrdinalsAddress(ordinalsAddress)
      console.log(`[Inventory] Bitcoin wallet connected: payment=${address}, ordinals=${ordinalsAddress}`)
    } else {
      setBtcOrdinalsAddress(null)
      console.log(`[Inventory] Bitcoin wallet connected: ${address}`)
    }
    if (provider) {
      setWalletProviders(prev => ({ ...prev, [address]: provider }))
      if (ordinalsAddress && ordinalsAddress !== address) {
        setWalletProviders(prev => ({ ...prev, [ordinalsAddress]: provider }))
      }
    }
    
    // Auto-load assets after connection
    setTimeout(() => {
      loadAssets(address, 'btc', provider)
      // Also load from ordinals address if different
      if (ordinalsAddress && ordinalsAddress !== address) {
        setTimeout(() => {
          loadAssets(ordinalsAddress, 'btc', provider)
        }, 1000)
      }
    }, 500)
  }

  // Handle Solana wallet connection
  const onSolanaConnect = async (address: string, provider?: string) => {
    if (connectedSolanaAddresses.has(address)) {
      return
    }

    setConnectedSolanaAddresses(prev => new Set([...prev, address]))
    if (provider) {
      setWalletProviders(prev => ({ ...prev, [address]: provider }))
    }
  }

  // Get all assets from queued sessions
  const allAssets = useMemo(() => {
    return queuedSessions.flatMap(s => s.assets)
  }, [queuedSessions])

  // Filter spam tokens
  const filterSpamTokens = (assets: Asset[]): Asset[] => {
    if (!hideSpamTokens) return assets
    
    return assets.filter(asset => {
      if (asset.type === 'native' || asset.type === 'btc') return true
      if (asset.type === 'erc721' || asset.type === 'erc1155' || asset.type === 'nft') return true
      if (asset.type === 'ethscription' || asset.type === 'ordinal') return true
      
      if (asset.type === 'erc20') {
        const balance = parseFloat(asset.balance) / Math.pow(10, asset.decimals || 18)
        if (balance < 0.000001) return false
      }
      
      return true
    })
  }

  // Selected assets to include in inventory
  const selectedAssets = useMemo(() => {
    const all = filterSpamTokens(allAssets)
    if (selectedAssetIds.length === 0) {
      return all
    }
    return all.filter(asset => selectedAssetIds.includes(asset.id))
  }, [allAssets, selectedAssetIds, hideSpamTokens])

  // Generate inventory PDF
  const handleGeneratePDF = async () => {
    setGeneratingPDF(true)
    setError(null)

    try {
      const inventoryData: InventoryData = {
        ownerName: ownerName || undefined,
        connectedWallets: {
          evm: Array.from(connectedEVMAddresses),
          btc: btcAddress || undefined,
          solana: Array.from(connectedSolanaAddresses),
        },
        walletNames,
        resolvedEnsNames,
        walletProviders,
      }

      const pdfBytes = await generateInventoryPDF(inventoryData, selectedAssets)
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      // Create iframe for printing
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = url
      document.body.appendChild(iframe)

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

      iframe.onload = () => {
        setTimeout(() => {
          try {
            if (!isMobile && iframe.contentWindow) {
              iframe.contentWindow.focus()
              iframe.contentWindow.print()
            }
          } catch (e) {
            console.error('Error printing from iframe:', e)
          }
        }, isMobile ? 500 : 1000)
      }

      // Always download the file
      const a = document.createElement('a')
      a.href = url
      a.download = `crypto-inventory-${Date.now()}.pdf`
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()

      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a)
        }
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe)
        }
        URL.revokeObjectURL(url)
      }, 5000)

      setStep('print')
    } catch (error: any) {
      console.error('Error generating PDF:', error)
      setError('Failed to generate PDF: ' + (error?.message || 'Unknown error'))
    } finally {
      setGeneratingPDF(false)
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Crypto Asset Inventory</h1>
          <p className="text-gray-600">
            Create a printable inventory of your crypto assets with blank sections for seed phrases, private keys, and passwords.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-between">
          {steps.map((s, index) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step === s.id 
                    ? 'bg-blue-600 text-white' 
                    : index < steps.findIndex(st => st.id === step)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index < steps.findIndex(st => st.id === step) ? '✓' : s.number}
                </div>
                <span className={`mt-2 text-sm font-medium ${
                  step === s.id ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {s.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-1 flex-1 mx-2 ${
                  index < steps.findIndex(st => st.id === step) ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Connect Step */}
        {step === 'connect' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallets</h2>
            <p className="text-gray-600 mb-6">
              Connect your wallets to load your crypto assets. You can connect multiple wallets.
              {connectedEVMAddresses.size > 0 && verifiedAddresses.size === 0 && (
                <span className="block mt-2 text-sm text-yellow-600 font-medium">
                  ⚠️ Please verify your wallet(s) by clicking the "Verify" button, then click "Load Assets" to continue.
                </span>
              )}
            </p>
            
            <WalletConnect
              onEvmConnect={onEvmConnect}
              onBitcoinConnect={onBtcConnect}
              onSolanaConnect={onSolanaConnect}
              onVerify={verifyWalletOwnership}
              connectedEVMAddresses={connectedEVMAddresses}
              connectedSolanaAddresses={connectedSolanaAddresses}
              verifiedAddresses={verifiedAddresses}
              btcAddress={btcAddress}
              walletNames={walletNames}
              resolvedEnsNames={resolvedEnsNames}
              walletProviders={walletProviders}
            />

            {/* Show connected wallets */}
            {(connectedEVMAddresses.size > 0 || btcAddress || connectedSolanaAddresses.size > 0) && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Connected Wallets</h3>
                {btcOrdinalsAddress && btcOrdinalsAddress !== btcAddress && (
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                    ℹ️ Xverse detected: Using payment address for BTC balance and ordinals address for inscriptions
                  </div>
                )}
                <div className="space-y-2 mb-4">
                  {Array.from(connectedEVMAddresses).map((addr) => {
                    const session = queuedSessions.find(s => 
                      s.walletAddress.toLowerCase() === addr.toLowerCase() && s.walletType === 'evm'
                    )
                    const isVerified = verifiedAddresses.has(addr)
                    const provider = walletProviders[addr] || 'Unknown'
                    const name = walletNames[addr] || resolvedEnsNames[addr.toLowerCase()] || addr
                    
                    return (
                      <div key={addr} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{name}</p>
                            <p className="text-sm text-gray-500">{provider}</p>
                            <p className="text-xs text-gray-400 font-mono mt-1 break-all" title={addr}>
                              {addr}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isVerified && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Verified</span>
                            )}
                            {session ? (
                              <span className="text-xs text-gray-500">{session.assets.length} assets</span>
                            ) : (
                              <>
                                {!isVerified && (
                                  <button
                                    onClick={() => verifyWalletOwnership(addr)}
                                    disabled={loading}
                                    className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200 disabled:opacity-50"
                                  >
                                    Verify
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedWalletForLoading(addr)
                                    loadAssets(addr, 'evm', provider)
                                  }}
                                  disabled={loading || !isVerified}
                                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
                                >
                                  {loading && selectedWalletForLoading === addr ? 'Loading...' : 'Load Assets'}
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                if (evmAddress?.toLowerCase() === addr.toLowerCase()) {
                                  disconnect()
                                }
                                setConnectedEVMAddresses(prev => {
                                  const next = new Set(prev)
                                  next.delete(addr.toLowerCase())
                                  return next
                                })
                                setVerifiedAddresses(prev => {
                                  const next = new Set(prev)
                                  next.delete(addr.toLowerCase())
                                  return next
                                })
                                setQueuedSessions(prev => prev.filter(s => 
                                  s.walletAddress.toLowerCase() !== addr.toLowerCase() || s.walletType !== 'evm'
                                ))
                                setAssets(prev => prev.filter(a => a.walletAddress?.toLowerCase() !== addr.toLowerCase()))
                              }}
                              className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
                              title="Disconnect this wallet"
                            >
                              Disconnect
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {btcAddress && (() => {
                    // Check for sessions from both payment and ordinals addresses
                    const paymentSession = queuedSessions.find(s => 
                      s.walletAddress === btcAddress && s.walletType === 'btc'
                    )
                    const ordinalsSession = btcOrdinalsAddress ? queuedSessions.find(s => 
                      s.walletAddress === btcOrdinalsAddress && s.walletType === 'btc'
                    ) : null
                    const totalAssets = (paymentSession?.assets.length || 0) + (ordinalsSession?.assets.length || 0)
                    const provider = walletProviders[btcAddress] || 'Unknown'
                    
                    return (
                      <div key={btcAddress} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Bitcoin Wallet</p>
                            <p className="text-sm text-gray-500">{provider}</p>
                            <p className="text-xs text-gray-400 font-mono mt-1 break-all" title={btcAddress}>
                              Payment: {btcAddress}
                            </p>
                            {btcOrdinalsAddress && btcOrdinalsAddress !== btcAddress && (
                              <p className="text-xs text-gray-400 font-mono mt-1 break-all" title={btcOrdinalsAddress}>
                                Ordinals: {btcOrdinalsAddress}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {paymentSession || ordinalsSession ? (
                              <span className="text-xs text-gray-500">{totalAssets} assets</span>
                            ) : (
                              <button
                                onClick={async () => {
                                  setSelectedWalletForLoading(btcAddress)
                                  await loadAssets(btcAddress, 'btc', provider)
                                  // Also load from ordinals address if different
                                  if (btcOrdinalsAddress && btcOrdinalsAddress !== btcAddress) {
                                    setTimeout(async () => {
                                      setSelectedWalletForLoading(btcOrdinalsAddress)
                                      await loadAssets(btcOrdinalsAddress, 'btc', provider)
                                    }, 1000)
                                  }
                                }}
                                disabled={loading}
                                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
                              >
                                {loading && (selectedWalletForLoading === btcAddress || selectedWalletForLoading === btcOrdinalsAddress) ? 'Loading...' : 'Load Assets'}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setBtcAddress(null)
                                setBtcOrdinalsAddress(null)
                                setQueuedSessions(prev => prev.filter(s => 
                                  (s.walletAddress !== btcAddress && s.walletAddress !== btcOrdinalsAddress) || s.walletType !== 'btc'
                                ))
                                setAssets(prev => prev.filter(a => 
                                  a.walletAddress !== btcAddress && a.walletAddress !== btcOrdinalsAddress
                                ))
                              }}
                              className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
                              title="Disconnect this wallet"
                            >
                              Disconnect
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                  
                  {Array.from(connectedSolanaAddresses).map((addr) => {
                    const session = queuedSessions.find(s => 
                      s.walletAddress === addr && s.walletType === 'solana'
                    )
                    const provider = walletProviders[addr] || 'Unknown'
                    
                    return (
                      <div key={addr} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Solana Wallet</p>
                            <p className="text-sm text-gray-500">{provider}</p>
                            <p className="text-xs text-gray-400 font-mono mt-1 break-all" title={addr}>
                              {addr}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {session ? (
                              <span className="text-xs text-gray-500">{session.assets.length} assets</span>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedWalletForLoading(addr)
                                  loadAssets(addr, 'solana', provider)
                                }}
                                disabled={loading}
                                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 disabled:opacity-50"
                              >
                                {loading && selectedWalletForLoading === addr ? 'Loading...' : 'Load Assets'}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setConnectedSolanaAddresses(prev => {
                                  const next = new Set(prev)
                                  next.delete(addr)
                                  return next
                                })
                                setQueuedSessions(prev => prev.filter(s => 
                                  s.walletAddress !== addr || s.walletType !== 'solana'
                                ))
                                setAssets(prev => prev.filter(a => a.walletAddress !== addr))
                              }}
                              className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
                              title="Disconnect this wallet"
                            >
                              Disconnect
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {queuedSessions.length > 0 && allAssets.length > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => setStep('assets')}
                      className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Continue to Select Assets ({allAssets.length} assets loaded) →
                    </button>
                  </div>
                )}
                
                {queuedSessions.length > 0 && allAssets.length === 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Assets loaded but none found. You may need to load assets for each connected wallet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Assets Step */}
        {step === 'assets' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Select Assets</h2>
            <p className="text-gray-600 mb-6">
              Choose which assets to include in your inventory. All assets are selected by default.
            </p>

            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideSpamTokens}
                  onChange={(e) => setHideSpamTokens(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Hide Spam/Dust Tokens</span>
              </label>
            </div>

            <AssetSelector
              walletNames={walletNames}
              resolvedEnsNames={resolvedEnsNames}
              assets={filterSpamTokens(allAssets)}
              selectedAssetIds={selectedAssetIds}
              onSelectionChange={setSelectedAssetIds}
            />

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => setStep('connect')}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep('preview')}
                disabled={selectedAssets.length === 0}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Preview →
              </button>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Preview Inventory</h2>
            <p className="text-gray-600 mb-6">
              Review your assets and optionally add your name to the inventory document.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name (Optional)
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Assets to Include ({selectedAssets.length})
                </h3>
                <button
                  onClick={() => setStep('assets')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium underline"
                >
                  ← Back to Select Assets
                </button>
              </div>
              <AssetList assets={selectedAssets.slice(0, 10)} />
              {selectedAssets.length > 10 && (
                <p className="text-sm text-gray-500 mt-2">
                  ... and {selectedAssets.length - 10} more assets
                </p>
              )}
            </div>
            
            {/* Image Diagnostics Section */}
            {selectedAssets.some(a => (a.type === 'erc721' || a.type === 'erc1155' || a.type === 'nft') && !a.imageUrl && !a.image) && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Image Loading Issues Detected</h4>
                <p className="text-sm text-yellow-800 mb-2">
                  Some NFTs don't have image URLs. They will attempt to load from metadata, but may show "Image unavailable" if metadata fetch fails.
                </p>
                <details className="text-sm text-yellow-800">
                  <summary className="cursor-pointer font-medium hover:text-yellow-900">
                    Show assets with missing images ({selectedAssets.filter(a => (a.type === 'erc721' || a.type === 'erc1155' || a.type === 'nft') && !a.imageUrl && !a.image).length})
                  </summary>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    {selectedAssets
                      .filter(a => (a.type === 'erc721' || a.type === 'erc1155' || a.type === 'nft') && !a.imageUrl && !a.image)
                      .slice(0, 10)
                      .map(asset => (
                        <li key={asset.id}>
                          {asset.name} (Token ID: {asset.tokenId || 'N/A'})
                          {asset.metadata?.token_uri ? (
                            <span className="text-xs text-gray-600 ml-2">Has tokenUri</span>
                          ) : (
                            <span className="text-xs text-red-600 ml-2">No tokenUri</span>
                          )}
                        </li>
                      ))}
                  </ul>
                </details>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-2">What's Included:</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Wallet addresses and provider information</li>
                <li>Complete asset catalog with images (in color)</li>
                <li>Blank sections for 12-word and 24-word seed phrases</li>
                <li>Blank sections for private keys</li>
                <li>Blank sections for passwords</li>
                <li>Additional notes section</li>
              </ul>
            </div>

            <div className="flex gap-4 items-center">
              <button
                onClick={() => setStep('assets')}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                ← Back to Select Assets
              </button>
              <button
                onClick={() => {
                  const nftsWithoutImages = selectedAssets.filter(a => 
                    (a.type === 'erc721' || a.type === 'erc1155' || a.type === 'nft') && 
                    !a.imageUrl && 
                    !a.image
                  )
                  const diagnosticInfo = nftsWithoutImages.map(asset => ({
                    name: asset.name,
                    tokenId: asset.tokenId,
                    contractAddress: asset.contractAddress,
                    hasTokenUri: !!(asset.metadata?.token_uri || asset.metadata?.tokenUri || asset.contentUri),
                    tokenUri: asset.metadata?.token_uri || asset.metadata?.tokenUri || asset.contentUri || 'none',
                  }))
                  console.log('[Image Diagnostics] NFTs without images:', diagnosticInfo)
                  alert(`Found ${nftsWithoutImages.length} NFTs without image URLs.\n\nCheck browser console (F12) for detailed diagnostic info.\n\nFirst 5:\n${diagnosticInfo.slice(0, 5).map(d => `- ${d.name} (ID: ${d.tokenId})\n  Has tokenUri: ${d.hasTokenUri ? 'Yes' : 'No'}`).join('\n')}`)
                }}
                className="px-4 py-2 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-lg hover:bg-yellow-200 transition-colors"
              >
                🔍 Check Image Issues
              </button>
              <button
                onClick={handleGeneratePDF}
                disabled={generatingPDF}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ml-auto"
              >
                {generatingPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  'Generate Inventory PDF'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Print Step */}
        {step === 'print' && (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Inventory Generated!</h2>
              <p className="text-gray-600 mb-4">
                Your crypto asset inventory PDF has been generated and downloaded.
              </p>
              <p className="text-sm text-gray-500">
                The PDF includes blank sections for writing in seed phrases, private keys, and passwords by hand.
                Keep this document secure.
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={async () => {
                  console.log('[Inventory] Starting complete disconnect and reset...')
                  
                  // Disconnect wagmi wallet first
                  if (isConnected && evmAddress) {
                    try {
                      await disconnect()
                      console.log('[Inventory] Wagmi wallet disconnected')
                    } catch (err) {
                      console.error('[Inventory] Error disconnecting wagmi:', err)
                    }
                  }
                  
                  // Clear wagmi indexedDB to prevent auto-restore
                  try {
                    await clearWagmiIndexedDB()
                    console.log('[Inventory] Cleared wagmi indexedDB')
                  } catch (err) {
                    console.error('[Inventory] Error clearing indexedDB:', err)
                  }
                  
                  // Clear localStorage
                  try {
                    localStorage.removeItem('lastwish_state')
                    // Clear wagmi localStorage keys
                    Object.keys(localStorage).forEach(key => {
                      if (key.startsWith('wagmi.') && !key.includes('walletconnect')) {
                        localStorage.removeItem(key)
                      }
                    })
                    console.log('[Inventory] Cleared localStorage')
                  } catch (err) {
                    console.error('[Inventory] Error clearing localStorage:', err)
                  }
                  
                  // Clear all state
                  setConnectedEVMAddresses(new Set())
                  setConnectedSolanaAddresses(new Set())
                  setBtcAddress(null)
                  setBtcOrdinalsAddress(null)
                  setVerifiedAddresses(new Set())
                  setQueuedSessions([])
                  setAssets([])
                  setSelectedAssetIds([])
                  setOwnerName('')
                  setWalletNames({})
                  setResolvedEnsNames({})
                  setWalletProviders({})
                  setError(null)
                  setStep('connect')
                  
                  console.log('[Inventory] Complete reset finished')
                  
                  // Force page reload to ensure clean state
                  setTimeout(() => {
                    window.location.reload()
                  }, 500)
                }}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Another Inventory
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Go to Home
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

