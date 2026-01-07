'use client'

// Disable static generation - this page requires client-side only features (wallet connections, indexedDB)
export const dynamic = 'force-dynamic'
export const dynamicParams = true

import { useState, useEffect, useMemo } from 'react'
import { useAccount, useDisconnect, useSignMessage, useSendTransaction, useWaitForTransactionReceipt, useConnect } from 'wagmi'
import { createPublicClient, http, parseEther, formatEther, isAddress } from 'viem'
import { mainnet } from 'viem/chains'
import { WalletConnect } from '@/components/WalletConnect'
import { AssetList } from '@/components/AssetList'
import { AssetSelector } from '@/components/AssetSelector'
import { BeneficiaryForm } from '@/components/BeneficiaryForm'
import { AllocationPanel } from '@/components/AllocationPanel'
import { WalletNameEditor } from '@/components/WalletNameEditor'
import { resolveBlockchainName, reverseResolveAddress } from '@/lib/name-resolvers'
import { Asset, Beneficiary, Allocation, UserData, QueuedWalletSession } from '@/types'
import axios from 'axios'
import { generatePDF } from '@/lib/pdf-generator'
import { getCurrentPricing, getPaymentAmountETH, getFormattedPrice, getTierPricing, getAllTiers, PricingTier } from '@/lib/pricing'
import { clearAllWalletData, clearWalletDataFromStorage, clearWalletConnectionsOnLoad, clearWagmiIndexedDB } from '@/lib/wallet-cleanup'

type Step = 'connect' | 'assets' | 'allocate' | 'details' | 'payment' | 'download'

const steps: Array<{ id: Step; label: string; number: number }> = [
 { id: 'connect', label: 'Connect', number: 1 },
 { id: 'assets', label: 'Assets', number: 2 },
 { id: 'allocate', label: 'Allocate', number: 3 },
 { id: 'details', label: 'Details', number: 4 },
 { id: 'payment', label: 'Payment', number: 5 },
 { id: 'download', label: 'Download', number: 6 },
]

export default function Home() {
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
 
 // Payment transaction hooks
 const [paymentRecipientAddress, setPaymentRecipientAddress] = useState<`0x${string}` | null>(null)
 const { data: sendTxHash, sendTransaction, isPending: isSendingPayment, error: sendError, reset: resetSendTransaction } = useSendTransaction({
 mutation: {
 onError: (error) => {
 // Clear error state when user tries again
 console.error('Send transaction error:', error)
 }
 }
 })
 const { isLoading: isConfirming, isSuccess: isPaymentSent } = useWaitForTransactionReceipt({
 hash: sendTxHash,
 })
 const [step, setStep] = useState<Step>('connect')
 const [btcAddress, setBtcAddress] = useState<string | null>(null)
 const [btcOrdinalsAddress, setBtcOrdinalsAddress] = useState<string | null>(null) // Store ordinals address separately
 const [assets, setAssets] = useState<Asset[]>([])
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
 const [allocations, setAllocations] = useState<Allocation[]>([])
  const [ownerName, setOwnerName] = useState('')
  const [ownerFullName, setOwnerFullName] = useState('')
  const [ownerEnsName, setOwnerEnsName] = useState('')
  const [ownerAddress, setOwnerAddress] = useState('')
 const [ownerCity, setOwnerCity] = useState('')
 const [ownerState, setOwnerState] = useState('')
 const [ownerZipCode, setOwnerZipCode] = useState('')
 const [ownerPhone, setOwnerPhone] = useState('')
 const [executorName, setExecutorName] = useState('')
 const [executorAddress, setExecutorAddress] = useState('')
 const [executorPhone, setExecutorPhone] = useState('')
 const [executorEmail, setExecutorEmail] = useState('')
 const [executorTwitter, setExecutorTwitter] = useState('')
 const [executorLinkedIn, setExecutorLinkedIn] = useState('')
 const [executorEnsName, setExecutorEnsName] = useState<string | null>(null)
 const [executorResolvedAddress, setExecutorResolvedAddress] = useState<string | null>(null)
 const [ownerResolvedAddress, setOwnerResolvedAddress] = useState<string | null>(null)
 const [ownerEnsResolvedName, setOwnerEnsResolvedName] = useState<string | null>(null)
 const [keyInstructions, setKeyInstructions] = useState('')
 const [walletNames, setWalletNames] = useState<Record<string, string>>({})
 const [resolvedEnsNames, setResolvedEnsNames] = useState<Record<string, string>>({})
 const [walletProviders, setWalletProviders] = useState<Record<string, string>>({}) // Track wallet provider (MetaMask, Rainbow, etc.)
 const [connectedEVMAddresses, setConnectedEVMAddresses] = useState<Set<string>>(new Set())
 const [mounted, setMounted] = useState(false)
 const [invoiceId, setInvoiceId] = useState<string | null>(null)
 const [paymentVerified, setPaymentVerified] = useState(false)
 const [verifyingPayment, setVerifyingPayment] = useState(false)
 const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
 const [hideSpamTokens, setHideSpamTokens] = useState(true) // Default: hide spam tokens
 const [discountCode, setDiscountCode] = useState('')
 const [discountApplied, setDiscountApplied] = useState(false)
 const [paymentWalletAddress, setPaymentWalletAddress] = useState<string | null>(null) // First verified wallet for payment
 const [selectedTier, setSelectedTier] = useState<PricingTier>('free') // Default to free tier
 
 // Get current pricing based on selected tier - memoized to avoid recalculation
 const pricing = useMemo(() => getTierPricing(selectedTier), [selectedTier])
 const paymentAmountETH = useMemo(() => getPaymentAmountETH(selectedTier), [selectedTier])
 const [selectedWalletForLoading, setSelectedWalletForLoading] = useState<string | null>(null) // Currently selected wallet for loading assets
 const [queuedSessions, setQueuedSessions] = useState<QueuedWalletSession[]>([])
 const [currentSessionWallet, setCurrentSessionWallet] = useState<string | null>(null)

 // CRITICAL: Clear wallet connections IMMEDIATELY on page load
 // This must happen BEFORE wagmi tries to auto-restore connections from indexedDB
 useEffect(() => {
   if (typeof window !== 'undefined') {
     // Clear connections immediately - don't wait
     clearWalletConnectionsOnLoad().catch(err => {
       console.error('[Wallet Cleanup] Error clearing on load:', err)
     })
     
     // FORCE clear queuedSessions state immediately
     setQueuedSessions([])
     setBtcAddress(null)
     setBtcOrdinalsAddress(null)
     setConnectedEVMAddresses(new Set())
     setVerifiedAddresses(new Set())
     setPaymentWalletAddress(null)
     setCurrentSessionWallet(null)
     
     console.log('[Wallet Cleanup] ✅ Cleared all wallet state on page load')
   }
 }, [])

 // Prevent hydration mismatch
 useEffect(() => {
 setMounted(true)
 // Load persisted state from localStorage
 // CRITICAL: We NEVER restore queuedSessions - they are cleared on browser close
 if (typeof window !== 'undefined') {
 try {
 const saved = localStorage.getItem('lastwish_state')
 if (saved) {
 const parsed = JSON.parse(saved)
 
 // FORCE clear queuedSessions from parsed data - even if they exist
 if (parsed.queuedSessions && parsed.queuedSessions.length > 0) {
   console.warn('[Wallet Cleanup] ⚠️ Found queuedSessions in localStorage - clearing:', parsed.queuedSessions.length)
   parsed.queuedSessions = []
   // Save the cleaned version back immediately
   localStorage.setItem('lastwish_state', JSON.stringify(parsed))
 }
 parsed.paymentWalletAddress = undefined
 parsed.queuedSessions = [] // Double-check - always empty
 
 // FORCE clear state before restoring
 setQueuedSessions([])
 setBtcAddress(null)
 setBtcOrdinalsAddress(null)
 setConnectedEVMAddresses(new Set())
 setVerifiedAddresses(new Set())
 setPaymentWalletAddress(null)
 setCurrentSessionWallet(null)
 
 // Restore all state (except wallet connections which need to be re-established)
 if (parsed.assets) setAssets(parsed.assets)
 if (parsed.beneficiaries) setBeneficiaries(parsed.beneficiaries)
 if (parsed.allocations) setAllocations(parsed.allocations)
 if (parsed.selectedAssetIds) setSelectedAssetIds(parsed.selectedAssetIds)
    if (parsed.ownerName) setOwnerName(parsed.ownerName)
    if (parsed.ownerFullName) setOwnerFullName(parsed.ownerFullName)
    if (parsed.ownerEnsName) setOwnerEnsName(parsed.ownerEnsName)
    if (parsed.ownerAddress) setOwnerAddress(parsed.ownerAddress)
 if (parsed.ownerCity) setOwnerCity(parsed.ownerCity)
 if (parsed.ownerState) setOwnerState(parsed.ownerState)
 if (parsed.ownerZipCode) setOwnerZipCode(parsed.ownerZipCode)
 if (parsed.ownerPhone) setOwnerPhone(parsed.ownerPhone)
 if (parsed.executorName) setExecutorName(parsed.executorName)
 if (parsed.executorAddress) setExecutorAddress(parsed.executorAddress)
 if (parsed.executorPhone) setExecutorPhone(parsed.executorPhone)
 if (parsed.executorEmail) setExecutorEmail(parsed.executorEmail)
 if (parsed.executorTwitter) setExecutorTwitter(parsed.executorTwitter)
 if (parsed.executorLinkedIn) setExecutorLinkedIn(parsed.executorLinkedIn)
 if (parsed.keyInstructions) setKeyInstructions(parsed.keyInstructions)
 if (parsed.resolvedEnsNames) setResolvedEnsNames(parsed.resolvedEnsNames)
 // Don't restore paymentWalletAddress - wallet connections are cleared
 // Don't restore queuedSessions - wallet connections are cleared on browser close
 if (parsed.step) setStep(parsed.step)
 if (parsed.invoiceId) setInvoiceId(parsed.invoiceId)
 if (parsed.paymentVerified) setPaymentVerified(parsed.paymentVerified)
 if (parsed.discountCode) setDiscountCode(parsed.discountCode)
 if (parsed.discountApplied) setDiscountApplied(parsed.discountApplied)
 if (parsed.selectedTier) setSelectedTier(parsed.selectedTier)
 }
 } catch (err) {
 console.error('Error loading saved state:', err)
 }
 }
 }, [])

 // Save state to localStorage whenever it changes
 // CRITICAL: queuedSessions are NEVER saved - always save empty array
 useEffect(() => {
 if (typeof window !== 'undefined' && mounted) {
 try {
 // ALWAYS clear queuedSessions before saving - even if state has them
 const stateToSave = {
 assets,
 beneficiaries,
 allocations,
 selectedAssetIds,
    ownerName,
    ownerFullName,
    ownerEnsName: ownerEnsName || undefined,
    ownerAddress,
 ownerCity,
 ownerState,
 ownerZipCode,
 ownerPhone,
 executorName,
 executorAddress,
 executorPhone,
 executorEmail,
 executorTwitter,
 executorLinkedIn,
 keyInstructions,
 resolvedEnsNames,
 paymentWalletAddress: undefined, // Don't save payment wallet - cleared on browser close
 step,
 invoiceId,
 paymentVerified,
 discountCode,
 discountApplied,
 queuedSessions: [], // ALWAYS save empty array - NEVER save actual queuedSessions
 selectedTier,
 }
 localStorage.setItem('lastwish_state', JSON.stringify(stateToSave))
 
 // Double-check: if queuedSessions somehow got saved, clear them again
 const verify = localStorage.getItem('lastwish_state')
 if (verify) {
   const verifyParsed = JSON.parse(verify)
   if (verifyParsed.queuedSessions && verifyParsed.queuedSessions.length > 0) {
     verifyParsed.queuedSessions = []
     localStorage.setItem('lastwish_state', JSON.stringify(verifyParsed))
     console.warn('[Wallet Cleanup] ⚠️ Detected queuedSessions in save - cleared again')
   }
 }
 } catch (err) {
 console.error('Error saving state:', err)
 }
 }
  }, [
    assets,
    beneficiaries,
    allocations,
    selectedAssetIds,
    ownerName,
    ownerFullName,
    ownerEnsName,
    ownerAddress,
 ownerCity,
 ownerState,
 ownerZipCode,
 ownerPhone,
 executorName,
 executorAddress,
 executorPhone,
 executorEmail,
 executorTwitter,
 executorLinkedIn,
 keyInstructions,
 resolvedEnsNames,
 paymentWalletAddress,
 step,
 invoiceId,
 paymentVerified,
 discountCode,
 discountApplied,
 queuedSessions,
 selectedTier,
 mounted,
 ])

 // Track loaded wallet addresses to avoid duplicates
 const [loadedWallets, setLoadedWallets] = useState<Set<string>>(new Set())
 const [verifiedAddresses, setVerifiedAddresses] = useState<Set<string>>(new Set()) // Addresses that have signed
 const [pendingVerification, setPendingVerification] = useState<string | null>(null) // Address waiting for signature

 // Disconnect any existing wallet connections on mount (if wagmi restored them)
 useEffect(() => {
   if (mounted && isConnected) {
     console.log('[Wallet Cleanup] 🚨 Detected restored wallet connection - disconnecting immediately...')
     try {
       disconnect()
       // Also clear state
       setBtcAddress(null)
       setBtcOrdinalsAddress(null)
       setConnectedEVMAddresses(new Set())
       setVerifiedAddresses(new Set())
       setQueuedSessions([])
       setPaymentWalletAddress(null)
       setCurrentSessionWallet(null)
     } catch (error) {
       console.error('[Wallet Cleanup] Error disconnecting on mount:', error)
     }
   }
 }, [mounted, isConnected, disconnect])

 // Clear wallet connections and data when browser/tab closes
 useEffect(() => {
   if (typeof window === 'undefined' || !mounted) return

   const handlePageHide = () => {
     console.log('[Wallet Cleanup] 🔒 Page hiding - clearing wallet connections...')
     
     // Disconnect wagmi wallet connection
     if (isConnected) {
       try {
         disconnect()
       } catch (error) {
         console.error('[Wallet Cleanup] Error disconnecting wallet:', error)
       }
     }
     
     // Clear wallet data from localStorage
     clearWalletDataFromStorage()
     
     // Clear indexedDB (pagehide allows more time than beforeunload)
     clearWagmiIndexedDB().catch(err => {
       console.error('[Wallet Cleanup] Error clearing indexedDB:', err)
     })
   }

   const handleBeforeUnload = () => {
     console.log('[Wallet Cleanup] 🔒 Browser/tab closing - clearing wallet connections...')
     
     // Disconnect wagmi wallet connection
     if (isConnected) {
       try {
         disconnect()
       } catch (error) {
         console.error('[Wallet Cleanup] Error disconnecting wallet:', error)
       }
     }
     
     // Clear wallet data from localStorage
     // Note: beforeunload has limited time, so we do synchronous operations only
     clearWalletDataFromStorage()
   }

   const handleVisibilityChange = async () => {
     // When tab becomes hidden (user switches tabs or closes), clear wallet connections
     if (document.hidden) {
       console.log('[Wallet Cleanup] 🔒 Tab hidden - clearing wallet connections...')
       
       // Disconnect wagmi wallet connection
       if (isConnected) {
         try {
           disconnect()
         } catch (error) {
           console.error('[Wallet Cleanup] Error disconnecting wallet:', error)
         }
       }
       
       // Clear all wallet-related state
       setBtcAddress(null)
       setBtcOrdinalsAddress(null)
       setConnectedEVMAddresses(new Set())
       setVerifiedAddresses(new Set())
       setQueuedSessions([])
       setPaymentWalletAddress(null)
       setCurrentSessionWallet(null)
       
       // Clear wallet data from localStorage and indexedDB (async operations allowed here)
       await clearAllWalletData()
     }
   }

   // Add event listeners - pagehide is more reliable than beforeunload
   window.addEventListener('pagehide', handlePageHide)
   window.addEventListener('beforeunload', handleBeforeUnload)
   document.addEventListener('visibilitychange', handleVisibilityChange)

   // Cleanup
   return () => {
     window.removeEventListener('pagehide', handlePageHide)
     window.removeEventListener('beforeunload', handleBeforeUnload)
     document.removeEventListener('visibilitychange', handleVisibilityChange)
   }
 }, [mounted, isConnected, disconnect])

  // Verify wallet ownership with signature
  const verifyWalletOwnership = async (address: string) => {
    if (verifiedAddresses.has(address)) {
      return true // Already verified
    }

    if (address !== evmAddress) {
      setError('Please connect the wallet you want to verify')
      return false
    }

    setPendingVerification(address)
    setError(null)

    try {
      // Create a message to sign
      const message = `I am the owner of this wallet address: ${address}\n\nThis signature proves I control this wallet and authorize LastWishCrypto to access my asset information.\n\nTimestamp: ${Date.now()}`
      
      // Request signature
      const signature = await signMessageAsync({ 
        message,
      })

      // Verify the signature - use the connected chain instead of mainnet to avoid RPC errors
      // For signature verification, we can verify locally without RPC call
      // The signature itself proves ownership, we don't need to verify on-chain
      if (signature && signature.length > 0) {
        // Signature received - this proves ownership
        setVerifiedAddresses(prev => new Set([...prev, address]))
        // Set as payment wallet if this is the first verified wallet
        if (!paymentWalletAddress) {
          setPaymentWalletAddress(address)
        }
        setPendingVerification(null)
        setError(null)
        return true
      } else {
        setError('Signature verification failed. Please try again.')
        setPendingVerification(null)
        return false
      }
    } catch (error: any) {
      if (error?.name === 'UserRejectedRequestError' || error?.message?.includes('rejected')) {
        setError('Signature request was cancelled. You must sign to verify wallet ownership.')
      } else if (error?.message?.includes('expired') || error?.message?.includes('timeout')) {
        setError('Request timed out. Please try again.')
      } else {
        setError(`Failed to verify wallet: ${error?.message || 'Unknown error'}`)
      }
      setPendingVerification(null)
      return false
    }
  }

 // Old resolveENS function removed - now using unified reverseResolveAddress from name-resolvers

 // Resolve wallet names across all blockchain naming systems when wallets are connected
 useEffect(() => {
 const resolveWalletNames = async () => {
 const newWalletNames: Record<string, string> = { ...walletNames }
 let updated = false
 
 // Resolve name for current EVM address
 if (evmAddress && !newWalletNames[evmAddress]) {
 const resolved = await reverseResolveAddress(evmAddress)
 if (resolved) {
 newWalletNames[evmAddress] = resolved.name
 setResolvedEnsNames(prev => ({ ...prev, [evmAddress.toLowerCase()]: resolved.name }))
 updated = true
 console.log(`Resolved ${resolved.resolver} name for current wallet: ${resolved.name}`)
 }
 }
 
 // Resolve names for all connected EVM addresses
 for (const addr of connectedEVMAddresses) {
 if (addr && !resolvedEnsNames[addr.toLowerCase()] && !newWalletNames[addr]) {
 const resolved = await reverseResolveAddress(addr)
 if (resolved) {
 setResolvedEnsNames(prev => ({ ...prev, [addr.toLowerCase()]: resolved.name }))
 newWalletNames[addr] = resolved.name
 updated = true
 console.log(`Resolved ${resolved.resolver} name for wallet ${addr}: ${resolved.name}`)
 }
 }
 }
 
 if (updated) {
 setWalletNames(newWalletNames)
 }
 }
 
 if (evmAddress || connectedEVMAddresses.size > 0) {
 resolveWalletNames()
 }
 
 // Auto-select first verified wallet if none selected
 if (selectedWalletForLoading === null && connectedEVMAddresses.size > 0) {
 const firstVerified = Array.from(connectedEVMAddresses).find(addr => verifiedAddresses.has(addr))
 if (firstVerified) {
 setSelectedWalletForLoading(firstVerified)
 }
 }
 }, [evmAddress, connectedEVMAddresses, verifiedAddresses, selectedWalletForLoading])

 // Resolve ENS name for executor wallet address (supports .eth, .base.eth, etc.)
 useEffect(() => {
 const resolveExecutorENS = async () => {
 if (!executorAddress || executorAddress.trim().length === 0) {
 setExecutorEnsName(null)
 setExecutorResolvedAddress(null)
 return
 }

 const input = executorAddress.trim()
 setExecutorEnsName(null)
 setExecutorResolvedAddress(null)

 try {
 const publicClient = createPublicClient({
 chain: mainnet,
 transport: http(),
 })

 // Check if input is an ENS name (ends with .eth, .base.eth, etc.)
 // Support: .eth, .base.eth, and other ENS-compatible TLDs
 const isENSName = /\.(eth|base\.eth)$/i.test(input) || input.includes('.')
 
 if (isENSName) {
 // Forward lookup: ENS name -> address
 // Note: .sol and .btc are not ENS-compatible and would need different resolvers
 // For now, we'll try ENS resolution for .eth and .base.eth
 const address = await publicClient.getEnsAddress({ name: input })
 if (address) {
 setExecutorResolvedAddress(address)
 setExecutorEnsName(input) // Keep the ENS name
 // Store in resolvedEnsNames for PDF generation
 setResolvedEnsNames(prev => ({ ...prev, [address.toLowerCase()]: input }))
 console.log(`Resolved executor ENS "${input}" to address: ${address}`)
 } else {
 // If resolution fails, still keep the name but no address
 setExecutorEnsName(input)
 setExecutorResolvedAddress(null)
 console.warn(`Could not resolve ENS name "${input}"`)
 }
 } 
 // Check if input is an Ethereum address (starts with 0x and is 42 chars)
 else if (input.startsWith('0x') && input.length === 42) {
 // Reverse lookup: address -> ENS name
 const resolved = await publicClient.getEnsName({ address: input as `0x${string}` })
 if (resolved) {
 setExecutorEnsName(resolved)
 setExecutorResolvedAddress(input.toLowerCase())
 // Store in resolvedEnsNames for PDF generation
 setResolvedEnsNames(prev => ({ ...prev, [input.toLowerCase()]: resolved }))
 console.log(`Resolved executor address "${input}" to ENS: ${resolved}`)
 } else {
 setExecutorEnsName(null)
 setExecutorResolvedAddress(input.toLowerCase())
 }
 } else {
 // Not a valid ENS name or address - could be .sol, .btc, or other
 // Keep the input as-is but don't try to resolve
 setExecutorEnsName(input.includes('.') ? input : null)
 setExecutorResolvedAddress(null)
 }
 } catch (error) {
 console.error('Error resolving executor ENS:', error)
 // On error, keep the input as-is if it looks like a name
 if (executorAddress && typeof executorAddress === 'string' && executorAddress.includes('.')) {
 setExecutorEnsName(executorAddress.trim())
 }
 setExecutorResolvedAddress(null)
 }
 }

 // Debounce ENS resolution
 const timeoutId = setTimeout(resolveExecutorENS, 500)
 return () => clearTimeout(timeoutId)
 }, [executorAddress])

 // Resolve owner wallet address across all blockchain naming systems
 useEffect(() => {
 const resolveOwnerName = async () => {
 if (!ownerEnsName || ownerEnsName.trim().length === 0) {
 setOwnerEnsResolvedName(null)
 setOwnerResolvedAddress(null)
 return
 }

 const input = ownerEnsName.trim()
 setOwnerEnsResolvedName(null)
 setOwnerResolvedAddress(null)

 try {
 // Try unified blockchain name resolver first
 const resolved = await resolveBlockchainName(input)
 
 if (resolved) {
 setOwnerResolvedAddress(resolved.address)
 setOwnerEnsResolvedName(resolved.name) // Keep the resolved name
 // Store in resolvedEnsNames for PDF generation
 setResolvedEnsNames(prev => ({ ...prev, [resolved.address.toLowerCase()]: resolved.name }))
 console.log(`Resolved owner ${resolved.resolver} name "${resolved.name}" to address: ${resolved.address}`)
 return
 }
 
 // If not a name, check if input is an Ethereum address (starts with 0x and is 42 chars)
 if (input.startsWith('0x') && input.length === 42) {
 // Reverse lookup: address -> name across all systems
 const reverseResolved = await reverseResolveAddress(input)
 if (reverseResolved) {
 setOwnerEnsResolvedName(reverseResolved.name)
 setOwnerResolvedAddress(reverseResolved.address)
 // Store in resolvedEnsNames for PDF generation
 setResolvedEnsNames(prev => ({ ...prev, [reverseResolved.address.toLowerCase()]: reverseResolved.name }))
 console.log(`Resolved owner address "${input}" to ${reverseResolved.resolver} name: ${reverseResolved.name}`)
 } else {
 setOwnerEnsResolvedName(null)
 setOwnerResolvedAddress(input.toLowerCase())
 }
 } else {
 // Not a valid name or address
 setOwnerEnsResolvedName(input.includes('.') ? input : null)
 setOwnerResolvedAddress(null)
 }
 } catch (error) {
 console.error('Error resolving owner name:', error)
 // On error, keep the input as-is if it looks like a name
 if (ownerEnsName && typeof ownerEnsName === 'string' && ownerEnsName.includes('.')) {
 setOwnerEnsResolvedName(ownerEnsName.trim())
 }
 setOwnerResolvedAddress(null)
 }
 }

 // Debounce name resolution
 const timeoutId = setTimeout(resolveOwnerName, 500)
 return () => clearTimeout(timeoutId)
 }, [ownerEnsName])

 // Resolve payment recipient address when on payment step
 useEffect(() => {
 const resolvePaymentAddress = async () => {
 if (step === 'payment' && !paymentRecipientAddress) {
 try {
 const publicClient = createPublicClient({
 chain: mainnet,
 transport: http(),
 })
 const address = await publicClient.getEnsAddress({ name: 'lastwish.eth' })
 if (address) {
 setPaymentRecipientAddress(address as `0x${string}`)
 console.log('Resolved lastwish.eth to:', address)
 } else {
 // Don't set error here - just log it, payment can still proceed with manual entry
 console.warn('Failed to resolve lastwish.eth address, but payment can still proceed')
 }
 } catch (error: any) {
 console.error('Error resolving payment address:', error)
 // Don't block payment flow - just log the error
 // Payment can still proceed if user knows the address
 }
 }
 }
 
 // Only resolve if we're on payment step and don't have address yet
 if (step === 'payment' && !paymentRecipientAddress) {
 resolvePaymentAddress()
 }
 }, [step, paymentRecipientAddress])

 // Auto-select queued assets when navigating to Allocate step
 useEffect(() => {
   if (step === 'allocate' && selectedAssetIds.length === 0 && assets.length === 0) {
     const queuedAssets = queuedSessions.flatMap(s => s.assets)
     if (queuedAssets.length > 0) {
       const queuedAssetIds = queuedAssets.map(a => a.id)
       setSelectedAssetIds(queuedAssetIds)
     }
   }
 }, [step, queuedSessions, selectedAssetIds.length, assets.length])

 // Auto-reallocate when beneficiaries are deleted
 useEffect(() => {
   // Get list of current beneficiary IDs
   const currentBeneficiaryIds = new Set(beneficiaries.map(b => b.id))
   
   // Filter out allocations for deleted beneficiaries
   const validAllocations = allocations.filter(a => currentBeneficiaryIds.has(a.beneficiaryId))
   
   // If allocations were removed, redistribute if needed
   if (validAllocations.length < allocations.length && beneficiaries.length > 0) {
     // Find assets that had allocations to deleted beneficiaries
     const deletedBeneficiaryIds = allocations
       .filter(a => !currentBeneficiaryIds.has(a.beneficiaryId))
       .map(a => a.beneficiaryId)
     const uniqueDeletedIds = new Set(deletedBeneficiaryIds)
     
     // For each asset, redistribute if it was quick-allocated (evenly distributed)
     const affectedAssetIds = new Set(allocations
       .filter(a => !currentBeneficiaryIds.has(a.beneficiaryId))
       .map(a => a.assetId))
     
     const updatedAllocations = [...validAllocations]
     
     affectedAssetIds.forEach(assetId => {
       const asset = assets.find(a => a.id === assetId) || queuedSessions.flatMap(s => s.assets).find(a => a.id === assetId)
       if (!asset) return
       
       const remainingAllocations = validAllocations.filter(a => a.assetId === assetId)
       const isNFT = asset.type === 'erc721' || asset.type === 'erc1155'
       
       if (remainingAllocations.length === 0 && beneficiaries.length > 0) {
         // No allocations left, redistribute evenly
         if (isNFT) {
           // NFTs go to first beneficiary
           updatedAllocations.push({
             assetId,
             beneficiaryId: beneficiaries[0].id,
             type: 'percentage',
             percentage: 100,
           })
         } else {
           // Fungible tokens split evenly
           const percentagePerBeneficiary = 100 / beneficiaries.length
           beneficiaries.forEach(ben => {
             updatedAllocations.push({
               assetId,
               beneficiaryId: ben.id,
               type: 'percentage',
               percentage: percentagePerBeneficiary,
             })
           })
         }
       } else if (remainingAllocations.length > 0 && !isNFT) {
         // Redistribute remaining percentage/amount evenly among remaining beneficiaries
         const totalAllocated = remainingAllocations.reduce((sum, a) => {
           if (a.type === 'percentage') return sum + (a.percentage || 0)
           const assetBalance = parseFloat(asset.balance) / Math.pow(10, asset.decimals || 18)
           return sum + (parseFloat(a.amount || '0') / assetBalance * 100)
         }, 0)
         
         const remainingPercentage = 100 - totalAllocated
         if (remainingPercentage > 0 && beneficiaries.length > 0) {
           const percentagePerBeneficiary = remainingPercentage / beneficiaries.length
           beneficiaries.forEach(ben => {
             // Only add if not already allocated
             if (!remainingAllocations.some(a => a.beneficiaryId === ben.id)) {
               updatedAllocations.push({
                 assetId,
                 beneficiaryId: ben.id,
                 type: 'percentage',
                 percentage: percentagePerBeneficiary,
               })
             }
           })
         }
       }
     })
     
     setAllocations(updatedAllocations)
   } else if (validAllocations.length < allocations.length) {
     // Just remove invalid allocations if no beneficiaries left
     setAllocations(validAllocations)
   }
 }, [beneficiaries.map(b => b.id).join(',')]) // Only run when beneficiary IDs change

 // Auto-verify payment after transaction is confirmed
 useEffect(() => {
 if (isPaymentSent && sendTxHash && evmAddress) {
 // If transaction is confirmed, automatically unlock PDF generation
 // We trust wagmi's transaction confirmation - no need to wait for API verification
 console.log('Payment transaction confirmed, unlocking PDF generation')
 setPaymentVerified(true)
 setStep('download')
 setError(null)
 
 // Still try to verify via API in background (for logging/analytics)
 setTimeout(async () => {
 try {
 const response = await axios.post('/api/invoice/status', {
 invoiceId,
 fromAddress: evmAddress,
 })
 if (response.data.status === 'paid') {
 console.log('Payment verified via API:', response.data.transactionHash)
 } else {
 console.log('API verification pending, but transaction confirmed - proceeding anyway')
 }
 } catch (error: any) {
 console.log('API verification failed, but transaction confirmed - proceeding anyway')
 }
 }, 3000)
 }
 }, [isPaymentSent, sendTxHash, evmAddress, invoiceId])

 // Filter spam tokens (dust, suspicious names, etc.)
 const filterSpamTokens = (assets: Asset[]): Asset[] => {
   if (!hideSpamTokens) return assets
   
  return assets.filter(asset => {
    // Always show native tokens (ETH, BTC, MATIC, APE) regardless of balance
    if (asset.type === 'native') return true
    
    // Always show Bitcoin (BTC) - it uses type 'btc' not 'native'
    if (asset.type === 'btc') {
      console.log(`[Spam Filter] Keeping BTC asset: ${asset.symbol} (${asset.name}) - balance: ${asset.balanceFormatted}`)
      return true
    }
    
    // Always show NFTs
    if (asset.type === 'erc721' || asset.type === 'erc1155') return true
   
   // Always show ethscriptions
    if (asset.type === 'ethscription') return true
    
    // Always show ordinals
    if (asset.type === 'ordinal') return true
     
     // For ERC-20 tokens only, check balance threshold and spam indicators
     if (asset.type === 'erc20') {
       const balance = parseFloat(asset.balance) / Math.pow(10, asset.decimals || 18)
       
       // Filter out tokens with balance below threshold (0.000001)
       if (balance < 0.000001) {
         console.log(`[Spam Filter] Filtered ${asset.symbol} (${asset.name}): balance too low (${balance})`)
         return false
       }
       
       // Additional spam detection: filter tokens with suspicious names
       const suspiciousPatterns = [
         /^test/i,
         /^fake/i,
         /^scam/i,
         /^spam/i,
         /^airdrop/i,
         /^claim/i,
         /^free/i,
         /unknown/i,
         /unnamed/i,
         /^token$/i,
         /^coin$/i,
         /^new/i, // Often spam tokens start with "new"
         /^moon/i, // "Moon" tokens are often spam
         /^pump/i, // "Pump" tokens
         /^safe/i, // Many "safe" tokens are scams
         /^baby/i, // "Baby" tokens are often spam
         /^mini/i, // "Mini" tokens
         /^mini/i, // "Mini" tokens
         /^meme/i, // Many meme tokens are spam
         /^doge/i, // Many doge variants are spam
         /^shib/i, // Many shib variants are spam
         /^floki/i, // Many floki variants are spam
         /^pepe/i, // Many pepe variants are spam
         /^elon/i, // Many elon tokens are spam
         /^trump/i, // Many trump tokens are spam
         /^biden/i, // Many biden tokens are spam
         /^christ/i, // Religious tokens are often spam
         /^jesus/i, // Religious tokens
         /^god/i, // Religious tokens
         /jack/i, // "Jack" tokens are often spam
         /^gmeow/i, // Specific spam pattern
         /^ada$/i, // ADA is a legitimate coin, but many spam tokens use this name
       ]
       
       const name = (asset.name || '').toLowerCase()
       const symbol = (asset.symbol || '').toLowerCase()
       
       // If name or symbol matches suspicious patterns, filter out
       if (suspiciousPatterns.some(pattern => pattern.test(name) || pattern.test(symbol))) {
         console.log(`[Spam Filter] Filtered ${asset.symbol} (${asset.name}): matches suspicious pattern`)
         return false
       }
       
       // Filter tokens with very generic or single-word names that aren't well-known
       // This is more aggressive - only keep if it's a known token or has a proper name
       const wellKnownTokens = ['usdc', 'usdt', 'dai', 'weth', 'wbtc', 'link', 'uni', 'aave', 'mkr', 'comp', 'snx', 'crv', 'yfi', '1inch', 'sushi', 'bal', 'ren', 'knc', 'zrx', 'bat', 'mana', 'sand', 'enj', 'grt', 'matic', 'ftm', 'avax', 'atom', 'dot', 'sol', 'ada', 'xrp', 'ltc', 'bch', 'etc', 'xlm', 'eos', 'trx', 'xmr', 'zec', 'dash', 'bch', 'xem', 'neo', 'vet', 'icp', 'theta', 'fil', 'hbar', 'algo', 'xtz', 'egld', 'axs', 'spl', 'chz', 'mkr', 'enj', 'mana', 'sand', 'gala', 'ape', 'imx', 'flow', 'rndr', 'grt', 'lrc', 'skl', 'audius', 'api3', 'band', 'comp', 'crv', 'enj', 'knc', 'link', 'mana', 'mkr', 'ren', 'snx', 'uma', 'yfi', 'zrx']
       
       // If it's a single word and not in well-known list, might be spam
       // But be less aggressive - only filter if it's clearly suspicious
       const isSingleWord = name.split(/\s+/).length === 1 && symbol.split(/\s+/).length === 1
       const isWellKnown = wellKnownTokens.includes(symbol.toLowerCase()) || wellKnownTokens.includes(name.toLowerCase())
       
       // Filter if single word, not well-known, and balance is very small (likely dust)
       if (isSingleWord && !isWellKnown && balance < 0.01) {
         console.log(`[Spam Filter] Filtered ${asset.symbol} (${asset.name}): single word, not well-known, small balance (${balance})`)
         return false
       }
       
       return true
     }
     
     return true
   })
 }

 // Load assets from a specific wallet address
 const loadAssetsFromWallet = async (walletAddress: string, append = false) => {
 setLoading(true)
 setError(null)
 console.log(`Loading assets from wallet: ${walletAddress}`)
 try {
 const newAssets: Asset[] = []
 
 if (verifiedAddresses.has(walletAddress)) {
 try {
 const evmResponse = await axios.post('/api/portfolio/evm', {
 addresses: [walletAddress],
 })
 if (evmResponse.data?.assets && Array.isArray(evmResponse.data.assets)) {
 const existingIds = new Set(assets.map(a => a.id))
 const walletProvider = walletProviders[walletAddress] || 'Unknown'
 const uniqueAssets = evmResponse.data.assets
 .filter((a: Asset) => !existingIds.has(a.id))
 .map((a: Asset) => ({
 ...a,
 walletAddress: walletAddress,
 walletProvider: walletProvider, // Track which wallet provider was used
 }))
 // Apply spam filtering
 const filteredAssets = filterSpamTokens(uniqueAssets)
 const filteredCount = uniqueAssets.length - filteredAssets.length
 if (filteredCount > 0) {
   console.log(`Filtered out ${filteredCount} spam/dust token(s)`)
 }
 newAssets.push(...filteredAssets)
      console.log(`Loaded ${filteredAssets.length} assets from wallet (${walletProvider})`)
 }
 } catch (err) {
 console.error('Error loading EVM assets:', err)
 setError('Failed to load EVM assets. Please try again.')
 }

  // Load Ethscriptions for this wallet
  try {
    console.log(`[Load Assets From Wallet] Fetching ethscriptions for wallet: ${walletAddress}`)
    const ethscriptionsResponse = await axios.post('/api/portfolio/ethscriptions', {
      addresses: [walletAddress],
    })
    
    console.log(`[Load Assets From Wallet] Full API response:`, JSON.stringify(ethscriptionsResponse.data, null, 2))
    console.log(`[Load Assets From Wallet] Response keys:`, Object.keys(ethscriptionsResponse.data || {}))
    console.log(`[Load Assets From Wallet] Response type:`, typeof ethscriptionsResponse.data)
    console.log(`[Load Assets From Wallet] Has assets key:`, 'assets' in (ethscriptionsResponse.data || {}))
    console.log(`[Load Assets From Wallet] Assets value:`, ethscriptionsResponse.data?.assets)
    console.log(`[Load Assets From Wallet] Assets is array:`, Array.isArray(ethscriptionsResponse.data?.assets))
    console.log(`[Load Assets From Wallet] Asset count:`, Array.isArray(ethscriptionsResponse.data?.assets) ? ethscriptionsResponse.data.assets.length : 'NOT AN ARRAY')
    
    if (ethscriptionsResponse.data?.assets && Array.isArray(ethscriptionsResponse.data.assets)) {
      console.log(`[Load Assets From Wallet] Processing ${ethscriptionsResponse.data.assets.length} ethscriptions`)
      const existingIds = new Set(assets.map(a => a.id))
      const uniqueEthscriptions = ethscriptionsResponse.data.assets
        .filter((a: Asset) => !existingIds.has(a.id))
        .map((a: Asset) => ({
          ...a,
          walletAddress: walletAddress,
          walletProvider: walletProviders[walletAddress] || 'Unknown',
        }))
      
      console.log(`[Load Assets From Wallet] Unique ethscriptions after deduplication: ${uniqueEthscriptions.length} (from ${ethscriptionsResponse.data.assets.length} total)`)
      console.log(`[Load Assets From Wallet] Existing asset IDs count: ${existingIds.size}`)
      
      if (uniqueEthscriptions.length > 0) {
        newAssets.push(...uniqueEthscriptions)
        console.log(`✅ Loaded ${uniqueEthscriptions.length} ethscription(s) from wallet ${walletAddress}`)
        console.log('Sample ethscription:', uniqueEthscriptions[0])
        console.log('Sample ethscription type:', uniqueEthscriptions[0].type)
        console.log('Sample ethscription id:', uniqueEthscriptions[0].id)
      } else if (ethscriptionsResponse.data.assets.length > 0) {
        console.log(`⚠️ All ${ethscriptionsResponse.data.assets.length} ethscriptions were duplicates`)
        console.log(`⚠️ Sample ethscription ID that was duplicate:`, ethscriptionsResponse.data.assets[0]?.id)
        console.log(`⚠️ Existing IDs sample:`, Array.from(existingIds).slice(0, 5))
      } else {
        console.log(`⚠️ API returned empty assets array`)
      }
    } else {
      console.log('⚠️ No ethscriptions in response or invalid format')
      console.log('⚠️ Response data:', ethscriptionsResponse.data)
      console.log('⚠️ Response data type:', typeof ethscriptionsResponse.data)
      if (ethscriptionsResponse.data) {
        console.log('⚠️ Response keys:', Object.keys(ethscriptionsResponse.data))
      }
    }
  } catch (err) {
    console.error('❌ Error loading ethscriptions:', err)
    if (axios.isAxiosError(err)) {
      console.error('❌ Axios error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data
      })
    }
    // Don't set error for ethscriptions - it's optional
  }
 } else {
 setError('Wallet must be verified (signature required) before loading assets.')
 setLoading(false)
 return
 }

 if (append) {
  const finalAssets = [...assets, ...newAssets]
  const ethscriptionCount = finalAssets.filter(a => a.type === 'ethscription').length
  console.log(`📊 Setting assets (append): ${finalAssets.length} total, ${ethscriptionCount} ethscriptions`)
  setAssets(finalAssets)
 if (newAssets.length > 0) {
 setSelectedAssetIds([...selectedAssetIds, ...newAssets.map(a => a.id)])
 }
 } else {
  const ethscriptionCount = newAssets.filter(a => a.type === 'ethscription').length
  console.log(`📊 Setting assets (replace): ${newAssets.length} total, ${ethscriptionCount} ethscriptions`)
 setAssets(newAssets)
 if (newAssets.length > 0) {
 setSelectedAssetIds(newAssets.map(a => a.id))
 }
 }

 const walletKey = `${walletAddress}-`
 setLoadedWallets(new Set([...loadedWallets, walletKey]))

 if (newAssets.length === 0) {
 setError('No new assets found. Make sure your wallet has balances.')
 }
 } catch (error) {
 console.error('Error loading assets:', error)
 setError('Failed to load assets. Please try again.')
 } finally {
 setLoading(false)
 }
 }

 // Load assets when wallets are connected (but don't auto-load, let user control it)
 const loadAssets = async (append = false, loadFromAllWallets = false) => {
 // Prevent duplicate concurrent loads
 if (loading) {
   console.log('[Load Assets] Already loading, skipping duplicate request')
   return
 }
 
 setLoading(true)
 setError(null)
 // Show loading message
 console.log('[Load Assets] Starting asset load (append:', append, ', loadFromAllWallets:', loadFromAllWallets, ')')
 try {
 const newAssets: Asset[] = []
 
 // Determine which wallets to load from
 let walletsToLoad: string[] = []
 
 if (loadFromAllWallets) {
 // Load from ALL connected and verified wallets
 walletsToLoad = Array.from(connectedEVMAddresses).filter(addr => verifiedAddresses.has(addr))
 console.log(`Loading from all verified wallets: ${walletsToLoad.length} wallet(s)`)
 } else {
 // Load from currently connected wallet only (if verified)
 if (isConnected && evmAddress && verifiedAddresses.has(evmAddress)) {
 walletsToLoad = [evmAddress]
 }
 }

 // Load EVM assets from all specified wallets
 if (walletsToLoad.length > 0) {
 try {
 const evmResponse = await axios.post('/api/portfolio/evm', {
 addresses: walletsToLoad,
 })
 if (evmResponse.data?.assets && Array.isArray(evmResponse.data.assets)) {
 // Filter out duplicates by checking if asset ID already exists
 const existingIds = new Set(assets.map(a => a.id))
 const uniqueAssets = evmResponse.data.assets.filter((a: Asset) => !existingIds.has(a.id))
 // Apply spam filtering
 const filteredAssets = filterSpamTokens(uniqueAssets)
 const filteredCount = uniqueAssets.length - filteredAssets.length
 if (filteredCount > 0) {
   console.log(`Filtered out ${filteredCount} spam/dust token(s)`)
 }
 newAssets.push(...filteredAssets)
 console.log(`Loaded ${filteredAssets.length} assets from ${walletsToLoad.length} wallet(s)`)
 }
 } catch (err) {
 console.error('Error loading EVM assets:', err)
 setError('Failed to load EVM assets. Please try again.')
 }

  // Load Ethscriptions
  try {
    console.log(`[Load Assets] Fetching ethscriptions for ${walletsToLoad.length} wallet(s):`, walletsToLoad)
    const ethscriptionsResponse = await axios.post('/api/portfolio/ethscriptions', {
      addresses: walletsToLoad,
    })
    console.log(`[Load Assets] Ethscriptions API response:`, {
      hasData: !!ethscriptionsResponse.data,
      hasAssets: !!ethscriptionsResponse.data?.assets,
      assetCount: Array.isArray(ethscriptionsResponse.data?.assets) ? ethscriptionsResponse.data.assets.length : 0
    })
    
    if (ethscriptionsResponse.data?.assets && Array.isArray(ethscriptionsResponse.data.assets)) {
      const existingIds = new Set(assets.map(a => a.id))
      const uniqueEthscriptions = ethscriptionsResponse.data.assets.filter(
        (a: Asset) => !existingIds.has(a.id)
      )
      console.log(`[Load Assets] Unique ethscriptions after deduplication: ${uniqueEthscriptions.length} (from ${ethscriptionsResponse.data.assets.length} total)`)
      
      if (uniqueEthscriptions.length > 0) {
        newAssets.push(...uniqueEthscriptions)
        console.log(`✅ Loaded ${uniqueEthscriptions.length} ethscription(s) from ${walletsToLoad.length} wallet(s)`)
        console.log('Sample ethscription:', uniqueEthscriptions[0])
        console.log('Ethscription type check:', uniqueEthscriptions[0].type === 'ethscription')
        console.log('All ethscription types:', uniqueEthscriptions.map((e: Asset) => e.type))
      } else {
        console.log(`⚠️ All ${ethscriptionsResponse.data.assets.length} ethscriptions were duplicates`)
      }
    } else {
      console.log('⚠️ No ethscriptions in response or invalid format')
      console.log('Response data:', ethscriptionsResponse.data)
      if (ethscriptionsResponse.data) {
        console.log('Response keys:', Object.keys(ethscriptionsResponse.data))
      }
    }
  } catch (err) {
    console.error('❌ Error loading ethscriptions:', err)
    if (axios.isAxiosError(err)) {
      console.error('Axios error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data
      })
    }
    // Don't set error for ethscriptions - it's optional
  }
 }

// Load Bitcoin assets with retry logic
if (btcAddress) {
try {
console.log('[Bitcoin] Loading assets for payment address:', btcAddress)
console.log('[Bitcoin] Ordinals address:', btcOrdinalsAddress)

// Retry function for Bitcoin API calls
const fetchBitcoinAssetsWithRetry = async (address: string, retries = 3, delay = 1000): Promise<any> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Bitcoin] Attempt ${attempt}/${retries} to fetch assets for ${address}`)
      const response = await axios.post('/api/portfolio/btc', {
        address: address,
      }, {
        timeout: 30000, // 30 second timeout
      })
      
      if (response.data?.assets && Array.isArray(response.data.assets)) {
        console.log(`[Bitcoin] ✅ Successfully fetched ${response.data.assets.length} assets on attempt ${attempt}`)
        return response
      } else {
        console.warn(`[Bitcoin] ⚠️ Empty or invalid response on attempt ${attempt}`)
        if (attempt === retries) {
          return response // Return even if empty on last attempt
        }
      }
    } catch (error: any) {
      console.error(`[Bitcoin] ❌ Attempt ${attempt}/${retries} failed:`, error.message)
      if (attempt === retries) {
        throw error // Throw on last attempt
      }
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }
  throw new Error('All retry attempts failed')
}

