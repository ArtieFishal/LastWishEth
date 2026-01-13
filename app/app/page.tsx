'use client'

// Disable static generation - this page requires client-side only features (wallet connections, indexedDB)
export const dynamic = 'force-dynamic'
export const dynamicParams = true

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useAccount, useDisconnect, useSignMessage, useSendTransaction, useWaitForTransactionReceipt, useConnect } from 'wagmi'
import { createPublicClient, http, parseEther, formatEther, isAddress } from 'viem'
import { mainnet } from 'viem/chains'
import { WalletConnect } from '@/components/WalletConnect'
import { AssetList } from '@/components/AssetList'
import { AssetSelector } from '@/components/AssetSelector'
import { BeneficiaryForm } from '@/components/BeneficiaryForm'
import { AllocationPanel } from '@/components/AllocationPanel'
import { WalletNameEditor } from '@/components/WalletNameEditor'
import { resolveBlockchainName, reverseResolveAddress, type ResolvedName } from '@/lib/name-resolvers'
import { Asset, Beneficiary, Allocation, UserData, QueuedWalletSession } from '@/types'
import axios from 'axios'
import { generatePDF } from '@/lib/pdf-generator'
import { getCurrentPricing, getPaymentAmountETH, getFormattedPrice, getTierPricing, getAllTiers, PricingTier } from '@/lib/pricing'
import { getUserFriendlyError } from '@/lib/errorMessages'
import { fetchWithCache, getCached, setCached } from '@/lib/requestCache'
import { clearWalletConnectionsOnLoad, clearWagmiIndexedDB } from '@/lib/wallet-cleanup'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

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
  const [connectedSolanaAddresses, setConnectedSolanaAddresses] = useState<Set<string>>(new Set())
  const [verifiedAddresses, setVerifiedAddresses] = useState<Set<string>>(new Set()) // Addresses that have signed
 const [mounted, setMounted] = useState(false)
 const [invoiceId, setInvoiceId] = useState<string | null>(null)
 const [paymentVerified, setPaymentVerified] = useState(false)
 const [verifyingPayment, setVerifyingPayment] = useState(false)
 const [generatingPDF, setGeneratingPDF] = useState(false)
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

 // Prevent hydration mismatch
 useEffect(() => {
 setMounted(true)
 
 // DON'T clear wallet connections on every page load - allow wallets to persist
 // Users can manually disconnect if needed, or use "Clear All" button
 // clearWalletConnectionsOnLoad().catch(err => {
 //   console.error('[App] Error clearing wallet connections:', err)
 // })
 
 // Load persisted state from localStorage
 if (typeof window !== 'undefined') {
 try {
 const saved = localStorage.getItem('lastwish_state')
 if (saved) {
 const parsed = JSON.parse(saved)
 // Restore all state including wallet connections
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
              if (parsed.resolvedEnsNames) {
                setResolvedEnsNames(parsed.resolvedEnsNames)
                resolvedEnsNamesRef.current = parsed.resolvedEnsNames // Sync ref
              }
 if (parsed.paymentWalletAddress) setPaymentWalletAddress(parsed.paymentWalletAddress)
 if (parsed.step) setStep(parsed.step)
 if (parsed.invoiceId) setInvoiceId(parsed.invoiceId)
 if (parsed.paymentVerified) setPaymentVerified(parsed.paymentVerified)
 if (parsed.discountCode) setDiscountCode(parsed.discountCode)
 if (parsed.discountApplied) setDiscountApplied(parsed.discountApplied)
 if (parsed.queuedSessions) setQueuedSessions(parsed.queuedSessions)
 if (parsed.selectedTier) setSelectedTier(parsed.selectedTier)

              // RESTORE wallet connection state
              if (parsed.connectedEVMAddresses && Array.isArray(parsed.connectedEVMAddresses)) {
                setConnectedEVMAddresses(new Set(parsed.connectedEVMAddresses))
              }
              if (parsed.verifiedAddresses && Array.isArray(parsed.verifiedAddresses)) {
                setVerifiedAddresses(new Set(parsed.verifiedAddresses))
              }
              if (parsed.btcAddress) setBtcAddress(parsed.btcAddress)
              if (parsed.connectedSolanaAddresses && Array.isArray(parsed.connectedSolanaAddresses)) {
                setConnectedSolanaAddresses(new Set(parsed.connectedSolanaAddresses))
              }
              if (parsed.walletNames) {
                setWalletNames(parsed.walletNames)
                walletNamesRef.current = parsed.walletNames // Sync ref
              }
              if (parsed.walletProviders) setWalletProviders(parsed.walletProviders)
 }
 } catch (err) {
 console.error('Error loading saved state:', err)
 }
 }
 }, [])

 // Save state to localStorage whenever it changes
 useEffect(() => {
 if (typeof window !== 'undefined' && mounted) {
 try {
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
 paymentWalletAddress,
 step,
 invoiceId,
 paymentVerified,
 discountCode,
 discountApplied,
 queuedSessions,
 selectedTier,
 // Persist wallet connection state
 connectedEVMAddresses: Array.from(connectedEVMAddresses),
              connectedSolanaAddresses: Array.from(connectedSolanaAddresses),
              verifiedAddresses: Array.from(verifiedAddresses),
              btcAddress,
 walletNames,
 walletProviders,
 }
 localStorage.setItem('lastwish_state', JSON.stringify(stateToSave))
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
 // Add wallet connection state to dependencies
 connectedEVMAddresses,
 verifiedAddresses,
 btcAddress,
 walletNames,
 walletProviders,
 ])

 // Track loaded wallet addresses to avoid duplicates
 const [loadedWallets, setLoadedWallets] = useState<Set<string>>(new Set())
 const [pendingVerification, setPendingVerification] = useState<string | null>(null) // Address waiting for signature
const resolvedAddressesRef = useRef<Set<string>>(new Set()) // Track which addresses we've resolved to prevent infinite loops
const resolvingInOnEvmConnectRef = useRef<Set<string>>(new Set()) // Track addresses being resolved in onEvmConnect to prevent duplicate calls
const resolvedEnsNamesRef = useRef<Record<string, string>>({}) // Ref to access latest resolvedEnsNames without causing callback recreation
const walletNamesRef = useRef<Record<string, string>>({}) // Ref to access latest walletNames without causing callback recreation

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
        const friendly = getUserFriendlyError(error)
        setError(`${friendly.title}: ${friendly.message}`)
      } else {
        const friendly = getUserFriendlyError(error)
        setError(`${friendly.title}: ${friendly.message}`)
      }
      setPendingVerification(null)
      return false
    }
  }

 // Old resolveENS function removed - now using unified reverseResolveAddress from name-resolvers

 // Resolve wallet names across all blockchain naming systems when wallets are connected
// Use debounce to prevent excessive calls when verifiedAddresses changes
const resolveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
 useEffect(() => {
// #region agent log
fetch('http://127.0.0.1:7242/ingest/1f875b6a-05a0-43a5-a8e7-2ae799a836c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:325',message:'Wallet name resolution useEffect running',data:{evmAddress,connectedEVMAddressesSize:connectedEVMAddresses.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
// #endregion
// Only run once per address change - use ref to track what we've processed

let cancelled = false
let isResolving = false

// Clear any pending resolution
if (resolveTimeoutRef.current) {
clearTimeout(resolveTimeoutRef.current)
resolveTimeoutRef.current = null
}

// Convert Set to array for use in this effect
const connectedAddressesArray = Array.from(connectedEVMAddresses)

 const resolveWalletNames = async () => {
if (cancelled || isResolving) return
isResolving = true
 const newWalletNames: Record<string, string> = { ...walletNames }
 let updated = false

// Helper to resolve with timeout to prevent blocking
const resolveWithTimeout = async (address: string, timeoutMs = 5000): Promise<ResolvedName | null> => {
try {
const timeoutPromise = new Promise<null>((resolve) => 
setTimeout(() => resolve(null), timeoutMs)
)
const resolvePromise = reverseResolveAddress(address)
const result = await Promise.race([resolvePromise, timeoutPromise])
return result
} catch (error) {
// Silently fail - don't block UI on resolution errors
return null
}
}
 
 // Resolve name for current EVM address
const evmAddressLower = evmAddress?.toLowerCase()
if (evmAddress && evmAddressLower && !resolvedAddressesRef.current.has(evmAddressLower)) {
const resolved = await resolveWithTimeout(evmAddress)
if (resolved && !cancelled) {
resolvedAddressesRef.current.add(evmAddressLower)
 newWalletNames[evmAddress] = resolved.name
setResolvedEnsNames(prev => {
const key = evmAddressLower
if (prev[key] === resolved.name) return prev // Prevent unnecessary updates
return { ...prev, [key]: resolved.name }
})
 updated = true
 console.log(`Resolved ${resolved.resolver} name for current wallet: ${resolved.name}`)
 }
 }
 
// Resolve names for all connected EVM addresses (in parallel to avoid blocking)
const addressesToResolve = connectedAddressesArray.filter(addr => {
if (!addr) return false
const addrLower = addr.toLowerCase()
return !resolvedAddressesRef.current.has(addrLower)
})

// Resolve all addresses in parallel with timeout protection
const resolutionPromises = addressesToResolve.map(async (addr) => {
if (cancelled) return null
const addrLower = addr.toLowerCase()
const resolved = await resolveWithTimeout(addr)
if (resolved && !cancelled) {
resolvedAddressesRef.current.add(addrLower)
setResolvedEnsNames(prev => {
if (prev[addrLower] === resolved.name) return prev // Prevent unnecessary updates
const updated = { ...prev, [addrLower]: resolved.name }
resolvedEnsNamesRef.current = updated // Keep ref in sync
return updated
})
 newWalletNames[addr] = resolved.name
 updated = true
 console.log(`Resolved ${resolved.resolver} name for wallet ${addr}: ${resolved.name}`)
 }
return resolved
})

// Wait for all resolutions to complete (or timeout)
await Promise.allSettled(resolutionPromises)

if (updated && !cancelled) {
setWalletNames(newWalletNames)
walletNamesRef.current = newWalletNames // Keep ref in sync
}
isResolving = false
}

// Only resolve if we have unresolved addresses
const hasUnresolvedAddresses = (evmAddress && !resolvedAddressesRef.current.has(evmAddress.toLowerCase())) ||
connectedAddressesArray.some(addr => addr && !resolvedAddressesRef.current.has(addr.toLowerCase()))

if (hasUnresolvedAddresses) {
// Debounce to prevent excessive calls - wait 500ms after last change
resolveTimeoutRef.current = setTimeout(() => {
if (!cancelled) {
resolveWalletNames().catch(err => {
console.error('Error in wallet name resolution:', err)
isResolving = false
})
}
}, 500)
}

return () => {
cancelled = true
if (resolveTimeoutRef.current) {
clearTimeout(resolveTimeoutRef.current)
resolveTimeoutRef.current = null
}
}
// Only depend on evmAddress and connected addresses - NOT verifiedAddresses.size
// Verification doesn't change addresses, so we don't need to re-resolve names
}, [evmAddress, connectedEVMAddresses.size])

// Auto-select first verified wallet if none selected (separate effect to prevent loops)
// Use ref to track if we've already auto-selected to prevent loops
const hasAutoSelectedRef = useRef(false)
useEffect(() => {
// Only auto-select ONCE when we first get a verified wallet
if (!hasAutoSelectedRef.current && selectedWalletForLoading === null && connectedEVMAddresses.size > 0 && verifiedAddresses.size > 0) {
const connectedAddressesArray = Array.from(connectedEVMAddresses)
const firstVerified = connectedAddressesArray.find(addr => verifiedAddresses.has(addr))
 if (firstVerified) {
hasAutoSelectedRef.current = true
 setSelectedWalletForLoading(firstVerified)
 }
 }
// Reset flag if all wallets are disconnected
if (connectedEVMAddresses.size === 0) {
hasAutoSelectedRef.current = false
}
// Only depend on sizes, not selectedWalletForLoading itself (prevents loop)
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [connectedEVMAddresses.size, verifiedAddresses.size])

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
    
    // Always show NFTs (EVM and Solana)
    if (asset.type === 'erc721' || asset.type === 'erc1155' || asset.type === 'nft') return true
   
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
 
 // Check if this is a Solana address (in connectedSolanaAddresses or base58 format)
 const isSolanaAddress = connectedSolanaAddresses.has(walletAddress) || 
   (!walletAddress.startsWith('0x') && !walletAddress.startsWith('1') && !walletAddress.startsWith('3') && !walletAddress.startsWith('bc1') && walletAddress.length >= 32 && walletAddress.length <= 44)
 
 if (verifiedAddresses.has(walletAddress)) {
   if (isSolanaAddress) {
     // Load Solana assets
     try {
       console.log('[Solana] Loading assets for address:', walletAddress)
       const solanaResponse = await axios.post('/api/portfolio/solana', {
         address: walletAddress,
       })
       
       if (solanaResponse.data?.assets && Array.isArray(solanaResponse.data.assets)) {
         const existingIds = new Set(assets.map(a => a.id))
         const walletProvider = walletProviders[walletAddress] || 'Solana Wallet'
         const uniqueAssets = solanaResponse.data.assets
           .filter((a: Asset) => !existingIds.has(a.id))
           .map((a: Asset) => ({
             ...a,
             walletAddress: walletAddress,
             walletProvider: walletProvider,
             imageUrl: a.image || a.imageUrl, // Use image or imageUrl
           }))
         
         // Apply spam filtering
         const filteredAssets = filterSpamTokens(uniqueAssets)
         newAssets.push(...filteredAssets)
         console.log(`[Solana] Loaded ${filteredAssets.length} assets from ${walletAddress}`)
       } else {
         console.log('[Solana] No assets found in response')
       }
     } catch (err) {
       console.error('[Solana] Error loading assets:', err)
       setError('Failed to load Solana assets. Please try again.')
     }
   } else {
     // Load EVM assets (original logic)
     try {
       // Check cache first
       const cacheKey = `evm-portfolio:${walletAddress}`
       const cached = getCached<any>(cacheKey)
 if (cached) {
   console.log('Using cached EVM portfolio data')
   const evmResponse = { data: cached }
   // Process cached data (same as below)
   if (evmResponse.data?.assets && Array.isArray(evmResponse.data.assets)) {
     const existingIds = new Set(assets.map(a => a.id))
     const walletProvider = walletProviders[walletAddress] || 'Unknown'
     const uniqueAssets = evmResponse.data.assets
     .filter((a: Asset) => !existingIds.has(a.id))
     .map((a: Asset) => ({
       ...a,
       walletAddress: walletAddress,
       walletProvider: walletProvider,
     }))
     const filteredAssets = filterSpamTokens(uniqueAssets)
     newAssets.push(...filteredAssets)
     console.log(`Loaded ${filteredAssets.length} cached assets from wallet`)
   }
 } else {
   // Fetch from API
   const evmResponse = await axios.post('/api/portfolio/evm', {
     addresses: [walletAddress],
   })
   // Cache the response (5 minutes)
   setCached(cacheKey, evmResponse.data, 5 * 60 * 1000)
   
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
   }
     } catch (err) {
       console.error('Error loading EVM assets:', err)
       setError('Failed to load EVM assets. Please try again.')
     }

     // Load Ethscriptions for this wallet (only for EVM addresses)
     try {
       console.log(`[Load Assets From Wallet] Fetching ethscriptions for wallet: ${walletAddress}`)
    // Check cache first
    const ethscriptionsCacheKey = `ethscriptions-portfolio:${walletAddress}`
    const cachedEthscriptions = getCached<any>(ethscriptionsCacheKey)
    let ethscriptionsResponse: any
    if (cachedEthscriptions) {
      console.log('Using cached ethscriptions data')
      ethscriptionsResponse = { data: cachedEthscriptions }
    } else {
      ethscriptionsResponse = await axios.post('/api/portfolio/ethscriptions', {
        addresses: [walletAddress],
      })
      // Cache the response (5 minutes)
      setCached(ethscriptionsCacheKey, ethscriptionsResponse.data, 5 * 60 * 1000)
    }
    
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
   // Only show error if we actually tried to load and got no results
   // Don't show error if wallet wasn't verified or address wasn't found
   const isVerified = verifiedAddresses.has(walletAddress) || connectedSolanaAddresses.has(walletAddress)
   if (isVerified) {
     setError('No new assets found. Make sure your wallet has balances.')
   } else {
     setError('Wallet must be verified (signature required) before loading assets.')
   }
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
 // Load from ALL connected and verified wallets (EVM + Solana)
 walletsToLoad = Array.from(connectedEVMAddresses).filter(addr => verifiedAddresses.has(addr))
 const solanaWallets = Array.from(connectedSolanaAddresses)
 console.log(`Loading from all verified wallets: ${walletsToLoad.length} EVM + ${solanaWallets.length} Solana wallet(s)`)
 } else {
 // Load from currently connected wallet only (if verified)
 if (isConnected && evmAddress && verifiedAddresses.has(evmAddress)) {
 walletsToLoad = [evmAddress]
 }
 // Check if selected wallet is Solana
 if (selectedWalletForLoading && connectedSolanaAddresses.has(selectedWalletForLoading)) {
 walletsToLoad = [selectedWalletForLoading]
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

// Load Solana assets
const solanaWalletsToLoad = loadFromAllWallets 
  ? Array.from(connectedSolanaAddresses)
  : (selectedWalletForLoading && connectedSolanaAddresses.has(selectedWalletForLoading))
    ? [selectedWalletForLoading]
    : []

if (solanaWalletsToLoad.length > 0) {
  for (const solanaAddress of solanaWalletsToLoad) {
    try {
      console.log('[Solana] Loading assets for address:', solanaAddress)
      const solanaResponse = await axios.post('/api/portfolio/solana', {
        address: solanaAddress,
      })
      
      if (solanaResponse.data?.assets && Array.isArray(solanaResponse.data.assets)) {
        const existingIds = new Set(assets.map(a => a.id))
        const walletProvider = walletProviders[solanaAddress] || 'Solana Wallet'
        const uniqueAssets = solanaResponse.data.assets
          .filter((a: Asset) => !existingIds.has(a.id))
          .map((a: Asset) => ({
            ...a,
            walletAddress: solanaAddress,
            walletProvider: walletProvider,
            imageUrl: a.image || a.imageUrl, // Use image or imageUrl
          }))
        
        // Apply spam filtering (Solana tokens can also be spam)
        const filteredAssets = filterSpamTokens(uniqueAssets)
        newAssets.push(...filteredAssets)
        console.log(`[Solana] Loaded ${filteredAssets.length} assets from ${solanaAddress}`)
      }
    } catch (err) {
      console.error('[Solana] Error loading assets:', err)
      // Don't fail the whole request if one Solana wallet fails
    }
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

// Fetch from payment address (for BTC balance and any ordinals there)
const btcResponse = await fetchBitcoinAssetsWithRetry(btcAddress)
console.log('[Bitcoin] API response for payment address:', btcResponse.data)
if (btcResponse.data?.assets && Array.isArray(btcResponse.data.assets)) {
console.log('[Bitcoin] Found', btcResponse.data.assets.length, 'assets from payment address')
// Count ordinals in payment address
const ordinalsInPayment = btcResponse.data.assets.filter((a: Asset) => a.type === 'ordinal')
console.log('[Bitcoin] Found', ordinalsInPayment.length, 'ordinals in payment address')
// Filter out duplicates
const existingIds = new Set(assets.map(a => a.id))
const uniqueAssets = btcResponse.data.assets.filter((a: Asset) => !existingIds.has(a.id))
console.log('[Bitcoin] After deduplication:', uniqueAssets.length, 'unique assets')
console.log('[Bitcoin] Asset details:', uniqueAssets)
// Log asset types
const assetTypes = uniqueAssets.reduce((acc: Record<string, number>, asset: Asset) => {
  acc[asset.type] = (acc[asset.type] || 0) + 1
  return acc
}, {})
console.log('[Bitcoin] Asset types:', assetTypes)
newAssets.push(...uniqueAssets)
} else {
console.warn('[Bitcoin] No assets in response or invalid format:', btcResponse.data)
}

// If we have a separate ordinals address, also fetch from it
if (btcOrdinalsAddress && btcOrdinalsAddress !== btcAddress) {
try {
console.log('[Bitcoin] Loading ordinals from dedicated ordinals address:', btcOrdinalsAddress)
const ordinalsResponse = await fetchBitcoinAssetsWithRetry(btcOrdinalsAddress)
console.log('[Bitcoin] API response for ordinals address:', ordinalsResponse.data)
if (ordinalsResponse.data?.assets && Array.isArray(ordinalsResponse.data.assets)) {
// Filter to only ordinals from ordinals address
const ordinalsFromOrdinalsAddr = ordinalsResponse.data.assets.filter((a: Asset) => a.type === 'ordinal')
console.log('[Bitcoin] Found', ordinalsFromOrdinalsAddr.length, 'ordinals from ordinals address (out of', ordinalsResponse.data.assets.length, 'total assets)')
const existingIds = new Set(newAssets.map(a => a.id))
const uniqueOrdinals = ordinalsFromOrdinalsAddr.filter((a: Asset) => !existingIds.has(a.id))
console.log('[Bitcoin] After deduplication:', uniqueOrdinals.length, 'unique ordinals from ordinals address')
newAssets.push(...uniqueOrdinals)
} else {
console.warn('[Bitcoin] No assets in ordinals address response or invalid format')
}
} catch (ordinalsErr) {
console.error('[Bitcoin] Error loading ordinals from ordinals address:', ordinalsErr)
// Don't fail the whole request if ordinals fail
}
} else {
console.log('[Bitcoin] No separate ordinals address found, ordinals may be in payment address')
}
} catch (err) {
console.error('[Bitcoin] Error loading BTC assets:', err)
setError('Failed to load Bitcoin assets. Please try again.')
}
}

 if (append) {
   // Append new assets to existing ones
   setAssets([...assets, ...newAssets])
   // Don't auto-select - let user choose
 } else {
   // Replace assets (first time loading)
   setAssets(newAssets)
   // Start with all assets deselected - user must manually select
   setSelectedAssetIds([])
 }

 // Track loaded wallets
 if (loadFromAllWallets) {
 // Mark all loaded wallets
 walletsToLoad.forEach(addr => {
 const walletKey = `${addr}-`
 setLoadedWallets(new Set([...loadedWallets, walletKey]))
 })
 } else {
 // Track current wallet combination
 const currentWalletKey = `${evmAddress || ''}-${btcAddress || ''}`
 if (currentWalletKey && (evmAddress || btcAddress)) {
 setLoadedWallets(new Set([...loadedWallets, currentWalletKey]))
 }
 }

 if (newAssets.length === 0 && (walletsToLoad.length > 0 || btcAddress)) {
 // Only show error if we actually tried to load from wallets
 if (walletsToLoad.length > 0 || btcAddress) {
 setError('No new assets found. Make sure your wallets have balances and are verified (signature required).')
 }
 }
 } catch (error) {
 console.error('Error loading assets:', error)
 setError('Failed to load assets. Please try again.')
 } finally {
 setLoading(false)
 }
 }

 const handleCreateInvoice = async () => {
 // Navigate to payment step where tier selection happens
 setStep('payment')
 }

    const handleDiscountCode = () => {
      const code = discountCode.trim().toLowerCase().replace(/[^a-z0-9]/g, '') // Remove special chars for flexible matching
      // Accept common variations: tryitfree, try-it-free, try_it_free, etc.
      if (code === 'tryitfree') {
 setDiscountApplied(true)
 setPaymentVerified(true) // Also set payment as verified since discount gives free access
 setError(null)
 // Automatically navigate to download step when discount is applied
 setTimeout(() => {
   setStep('download')
 }, 500) // Small delay to ensure state updates
 } else if (code) {
 setError('Invalid discount code')
 setDiscountApplied(false)
 } else {
 setDiscountApplied(false)
 setError(null)
 }
 }

 // Helper function to clear all sensitive data for privacy
 const clearAllSensitiveData = async () => {
   console.log('[Privacy Cleanup] 🧹 Starting complete data cleanup...')
   
   // CRITICAL: Clear localStorage FIRST to prevent any state restoration
   if (typeof window !== 'undefined') {
     localStorage.removeItem('lastwish_state')
     await clearWagmiIndexedDB()
   }
   
   // Clear all state
   setAssets([])
   setSelectedAssetIds([])
   setBeneficiaries([])
   setAllocations([])
   setQueuedSessions([])
   setConnectedEVMAddresses(new Set())
   setConnectedSolanaAddresses(new Set())
   setVerifiedAddresses(new Set())
   setBtcAddress(null)
   setBtcOrdinalsAddress(null)
   setWalletNames({})
   setResolvedEnsNames({})
   setWalletProviders({})
   setLoadedWallets(new Set())
   setSelectedWalletForLoading(null)
   setCurrentSessionWallet(null)
   setOwnerName('')
   setOwnerFullName('')
   setOwnerEnsName('')
   setOwnerAddress('')
   setOwnerCity('')
   setOwnerState('')
   setOwnerZipCode('')
   setOwnerPhone('')
   setExecutorName('')
   setExecutorAddress('')
   setExecutorPhone('')
   setExecutorEmail('')
   setExecutorTwitter('')
   setExecutorLinkedIn('')
   setKeyInstructions('')
   setPaymentVerified(false)
   setDiscountApplied(false)
   setDiscountCode('')
   setInvoiceId(null)
   setPaymentWalletAddress(null)
   
   // Disconnect wallets
   if (isConnected) {
     try {
       await disconnect()
     } catch (err) {
       console.error('Error disconnecting wallet:', err)
     }
   }
   
   // Ensure step is set to connect (should already be set, but ensure it)
   setStep('connect')
   setError(null)
   
   console.log('[Privacy Cleanup] ✅ Complete privacy cleanup finished - user can start fresh')
 }

 const handleDownloadPDF = async () => {
 if (!paymentVerified && !discountApplied) {
 setError('Payment must be verified or discount applied before downloading PDF')
 return
 }

 setGeneratingPDF(true)
 setError(null)

 // Check tier limits (unless discount code is applied - gives premium/unlimited access)
 if (!discountApplied) {
   const tierInfo = getTierPricing(selectedTier)
   const totalWallets = queuedSessions.length
   const totalBeneficiaries = beneficiaries.length
   
   if (tierInfo.maxWallets !== null && totalWallets > tierInfo.maxWallets) {
     setError(`Tier limit exceeded: You have ${totalWallets} wallets but your ${selectedTier} tier only allows ${tierInfo.maxWallets}. Please upgrade to a higher tier or use a discount code.`)
     return
   }
   
   if (tierInfo.maxBeneficiaries !== null && totalBeneficiaries > tierInfo.maxBeneficiaries) {
     setError(`Tier limit exceeded: You have ${totalBeneficiaries} beneficiaries but your ${selectedTier} tier only allows ${tierInfo.maxBeneficiaries}. Please upgrade to a higher tier or use a discount code.`)
     return
   }
 }

 // Merge all queued sessions
 const allQueuedAssets = queuedSessions.flatMap(s => s.assets)
 const allQueuedAllocations = queuedSessions.flatMap(s => s.allocations)
 
 // Collect all unique EVM addresses from queued sessions
 const allEVMAddresses = new Set<string>()
 allQueuedAssets.forEach(asset => {
 if (asset.chain !== 'bitcoin' && asset.walletAddress && asset.walletAddress.startsWith('0x')) {
 allEVMAddresses.add(asset.walletAddress)
 }
 })
 
 // Add queued wallet addresses
 queuedSessions.forEach(session => {
 if (session.walletType === 'evm') {
 allEVMAddresses.add(session.walletAddress)
 }
 })

 // Get Bitcoin address from queued sessions
 const btcAddressFromQueue = queuedSessions.find(s => s.walletType === 'btc')?.walletAddress || null

 // Create a map of wallet address to provider from assets and sessions
 const walletProviderMap: Record<string, string> = {}
 allQueuedAssets.forEach(asset => {
   if (asset.walletAddress && asset.walletProvider) {
     walletProviderMap[asset.walletAddress] = asset.walletProvider
   }
 })
 // Also add from queued sessions
 queuedSessions.forEach(session => {
   if (session.walletAddress && session.walletProvider) {
     walletProviderMap[session.walletAddress] = session.walletProvider
   }
 })

 const userData: UserData = {
    ownerName,
    ownerFullName,
    ownerEnsName: ownerEnsName || undefined,
    ownerAddress,
 ownerCity,
 ownerState,
 ownerZipCode,
 ownerPhone,
 executorName,
 executorAddress: executorResolvedAddress || executorAddress || undefined, // Use resolved address if available, optional
 executorPhone: executorPhone || undefined,
 executorEmail: executorEmail || undefined,
 executorTwitter: executorTwitter || undefined,
 executorLinkedIn: executorLinkedIn || undefined,
 beneficiaries,
 allocations: allQueuedAllocations, // Use merged allocations
 keyInstructions,
 connectedWallets: {
 evm: Array.from(allEVMAddresses),
 btc: btcAddressFromQueue || undefined,
 },
 walletNames,
 resolvedEnsNames,
 }

 try {
   setError(null)
   const pdfBytes = await generatePDF(userData, allQueuedAssets, walletProviderMap) // Use merged assets
 const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
 const url = URL.createObjectURL(blob)
 
 // Create iframe for printing (more reliable than window.open)
 const iframe = document.createElement('iframe')
 iframe.style.display = 'none'
 iframe.src = url
 document.body.appendChild(iframe)
 
 // Detect mobile devices
 const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
 
 // Track if print dialog was opened
 let printDialogOpened = false
 let printDialogClosed = false
 let cleanupScheduled = false
 
 // Function to schedule cleanup after print dialog closes
 const scheduleCleanup = () => {
   if (cleanupScheduled) return
   cleanupScheduled = true
   
   console.log('[PDF] Scheduling cleanup after print dialog closes...')
   
   // Wait for print dialog to close, then clean up
   // Use a longer timeout to ensure user has time to print
   setTimeout(() => {
     console.log('[PDF] Print dialog should be closed, starting cleanup...')
     
     // Clean up iframe and URL
     if (iframe.parentNode) {
       iframe.parentNode.removeChild(iframe)
     }
     URL.revokeObjectURL(url)
     
     // Now clear all data and reset step
     setStep('connect')
     setError(null)
     clearAllSensitiveData()
   }, 60000) // Wait 60 seconds to give user plenty of time to print
 }
 
 // Listen for print events on the iframe's window
 const setupPrintListeners = () => {
   if (!iframe.contentWindow) return
   
   try {
     // Listen for beforeprint (dialog opens)
     iframe.contentWindow.addEventListener('beforeprint', () => {
       console.log('[PDF] Print dialog opened')
       printDialogOpened = true
     })
     
     // Listen for afterprint (dialog closes - user printed or cancelled)
     iframe.contentWindow.addEventListener('afterprint', () => {
       console.log('[PDF] Print dialog closed')
       printDialogClosed = true
       
       // Clean up immediately after print dialog closes
       setTimeout(() => {
         if (iframe.parentNode) {
           iframe.parentNode.removeChild(iframe)
         }
         URL.revokeObjectURL(url)
         
         // Clear data and reset step
         setStep('connect')
         setError(null)
         clearAllSensitiveData()
       }, 2000) // Small delay to ensure print completes
     })
   } catch (e) {
     console.warn('[PDF] Could not set up print listeners:', e)
     // Fallback: schedule cleanup anyway
     scheduleCleanup()
   }
 }
 
 // Wait for iframe to load, then trigger print (desktop only)
 iframe.onload = () => {
   setTimeout(() => {
     try {
       // Set up print event listeners
       setupPrintListeners()
       
       // On mobile, skip print dialog and just download
       // On desktop, try to print
       if (!isMobile && iframe.contentWindow) {
         iframe.contentWindow.focus()
         iframe.contentWindow.print()
         printDialogOpened = true
       } else {
         // On mobile, just download - schedule cleanup after download
         scheduleCleanup()
       }
     } catch (e) {
       console.error('Error printing from iframe:', e)
       // If print fails, still schedule cleanup
       scheduleCleanup()
     }
   }, isMobile ? 500 : 1000) // Faster on mobile, give desktop more time
 }
 
 // Always download the file (works on both mobile and desktop)
 const a = document.createElement('a')
 a.href = url
 a.download = `lastwish-crypto-instructions-${Date.now()}.pdf`
 a.style.display = 'none'
 document.body.appendChild(a)
 a.click()
 // Clean up download link after a short delay
 setTimeout(() => {
   if (document.body.contains(a)) {
     document.body.removeChild(a)
   }
 }, 100)
 
 // Fallback: If print listeners don't work, schedule cleanup anyway
 // This ensures data is eventually cleared even if events don't fire
 setTimeout(() => {
   if (!printDialogClosed && !cleanupScheduled) {
     console.log('[PDF] Fallback: Scheduling cleanup (print events may not have fired)')
     scheduleCleanup()
   }
 }, 10000) // 10 second fallback
 
 } catch (error) {
 console.error('Error generating PDF:', error)
 const friendly = getUserFriendlyError(error)
 setError(`${friendly.title}: ${friendly.message}`)
 } finally {
 setGeneratingPDF(false)
 }
 }

 const handleSaveToQueue = () => {
 console.log('[Save to Queue] Function called')
 console.log('[Save to Queue] Initial state:', {
   evmAddress,
   btcAddress,
   selectedAssetIds: selectedAssetIds.length,
   allocations: allocations.length,
   queuedSessions: queuedSessions.length
 })
 
 // Check if we have a connected wallet - use connectedEVMAddresses/connectedSolanaAddresses as fallback
 // This handles cases where wallet is connected but evmAddress/btcAddress are cleared on refresh
 const solanaAddress = connectedSolanaAddresses.size > 0 ? Array.from(connectedSolanaAddresses)[0] : null
 const walletAddress = evmAddress || btcAddress || solanaAddress || (connectedEVMAddresses.size > 0 ? Array.from(connectedEVMAddresses)[0] : null)
 console.log('[Save to Queue] Wallet address:', walletAddress, {
   evmAddress,
   btcAddress,
   solanaAddress,
   connectedEVMAddresses: Array.from(connectedEVMAddresses),
   connectedSolanaAddresses: Array.from(connectedSolanaAddresses)
 })
 if (!walletAddress) {
   console.log('[Save to Queue] ❌ No wallet connected')
   setError('Wallet Not Connected\n\nPlease connect your wallet to continue.\n\nWhat to do: Go to the Connect step and connect your wallet')
   return
 }

 // Check if we have selected assets
 console.log('[Save to Queue] Checking selected assets:', selectedAssetIds.length)
 if (selectedAssetIds.length === 0) {
   console.log('[Save to Queue] ❌ No assets selected')
   setError('Please select at least one asset to save to queue.')
   return
 }

 // Check if we have allocations
 const sessionAllocations = allocations.filter(a => selectedAssetIds.includes(a.assetId))
 console.log('[Save to Queue] Checking allocations:', {
   totalAllocations: allocations.length,
   selectedAssetIds: selectedAssetIds,
   sessionAllocations: sessionAllocations.length,
   sessionAllocationsDetails: sessionAllocations
 })
 if (sessionAllocations.length === 0) {
   console.log('[Save to Queue] ❌ No allocations found for selected assets')
   setError('Please allocate assets to beneficiaries before saving to queue.')
   return
 }
 console.log('[Save to Queue] ✅ All checks passed, proceeding to save')

 // Check queue limit
 console.log('[Save to Queue] Checking queue limit:', queuedSessions.length)
 if (queuedSessions.length >= 20) {
   console.log('[Save to Queue] ❌ Queue limit reached')
   setError('Maximum 20 wallets allowed. Please remove a queued wallet first.')
   return
 }

 // Check if this wallet is already queued
 const isAlreadyQueued = queuedSessions.some(s => s.walletAddress.toLowerCase() === walletAddress.toLowerCase())
 console.log('[Save to Queue] Checking if wallet already queued:', isAlreadyQueued)
 if (isAlreadyQueued) {
   console.log('[Save to Queue] ❌ Wallet already in queue')
   setError('This wallet is already in the queue. Please disconnect and connect a different wallet.')
   return
 }

 // Get assets for this session
 const sessionAssets = assets.filter(a => selectedAssetIds.includes(a.id))

 // Get wallet name - check all possible addresses
 const addressToUse = walletAddress || evmAddress || btcAddress || solanaAddress
 const normalizedAddress = addressToUse?.toLowerCase()
 
 // Determine wallet type
 const walletType: 'evm' | 'btc' | 'solana' = evmAddress ? 'evm' : (btcAddress ? 'btc' : (solanaAddress ? 'solana' : 'evm'))
 
 // Try to get wallet name from any of the possible addresses
 let walletName: string | undefined = undefined
 if (normalizedAddress && addressToUse) {
   walletName = walletNames[normalizedAddress] || 
                walletNames[addressToUse] || // Try original case too
                resolvedEnsNames[normalizedAddress] || 
                undefined
 }
 
 console.log('[Save to Queue] Wallet name lookup:', {
   walletAddress,
   evmAddress,
   btcAddress,
   solanaAddress,
   addressToUse,
   normalizedAddress,
   walletName,
   walletType,
   walletNames: Object.keys(walletNames),
   resolvedEnsNames: Object.keys(resolvedEnsNames),
   foundInWalletNames: normalizedAddress ? (walletNames[normalizedAddress] || (addressToUse ? walletNames[addressToUse] : undefined)) : undefined,
   foundInResolved: normalizedAddress ? resolvedEnsNames[normalizedAddress] : undefined
 })

 // Create session
 const session: QueuedWalletSession = {
 id: `${walletAddress.toLowerCase()}-${Date.now()}`,
 walletAddress: walletAddress.toLowerCase(),
 walletType: walletType,
 walletProvider: evmAddress ? (walletProviders[evmAddress] || 'Unknown') : 
                 btcAddress ? (walletProviders[btcAddress] || 'Xverse') :
                 solanaAddress ? (walletProviders[solanaAddress] || 'Solana Wallet') : 'Unknown',
 ensName: evmAddress ? (resolvedEnsNames[evmAddress.toLowerCase()] || undefined) : 
          solanaAddress ? (resolvedEnsNames[solanaAddress.toLowerCase()] || undefined) : undefined,
 walletName: walletName || undefined, // Store custom wallet name
 assets: sessionAssets,
 allocations: sessionAllocations,
 verified: evmAddress ? verifiedAddresses.has(evmAddress) : 
           solanaAddress ? verifiedAddresses.has(solanaAddress) : true,
 createdAt: Date.now()
 }

 // Add to queue
 console.log('[Save to Queue] Adding session to queue:', session)
 setQueuedSessions(prev => {
   const updated = [...prev, session]
   console.log('[Save to Queue] Queue updated, new length:', updated.length)
   return updated
 })

 // Clear current session data (but keep beneficiaries)
 console.log('[Save to Queue] Clearing session data')
 setAssets([])
 setAllocations([])
 setSelectedAssetIds([])
 setCurrentSessionWallet(null)

 // Disconnect wallet
 if (evmAddress) {
   console.log('[Save to Queue] Disconnecting EVM wallet')
   setConnectedEVMAddresses(prev => {
     const next = new Set(prev)
     next.delete(evmAddress)
     return next
   })
   if (isConnected) {
     disconnect()
   }
 }
 if (btcAddress) {
   console.log('[Save to Queue] Disconnecting BTC wallet')
   setBtcAddress(null)
 }
 if (solanaAddress) {
   console.log('[Save to Queue] Disconnecting Solana wallet')
   setConnectedSolanaAddresses(prev => {
     const next = new Set(prev)
     next.delete(solanaAddress)
     return next
   })
 }

 // Show success message
 setError(null)
 
 // Return to connect step
 console.log('[Save to Queue] ✅ Successfully saved, returning to connect step')
 setStep('connect')
 }

 const handleRemoveQueuedSession = (sessionId: string) => {
 if (confirm('Remove this wallet session from the queue? This will delete all assets and allocations for this wallet.')) {
 setQueuedSessions(prev => prev.filter(s => s.id !== sessionId))
 }
 }

 const getPaymentValidationErrors = () => {
 const errors: string[] = []
 
 // Must have at least one queued session
 if (queuedSessions.length === 0) {
 errors.push('No wallets queued - please connect wallets, add assets, and save to queue')
 }

 // Check tier limits (skip if discount code is applied - gives premium/unlimited access)
 if (!discountApplied) {
   const tierInfo = getTierPricing(selectedTier)
   const totalWallets = queuedSessions.length
   const totalBeneficiaries = beneficiaries.length
   
   if (tierInfo.maxWallets !== null && totalWallets > tierInfo.maxWallets) {
     errors.push(`Tier limit: ${tierInfo.maxWallets} wallet${tierInfo.maxWallets !== 1 ? 's' : ''} (you have ${totalWallets})`)
   }
   
   if (tierInfo.maxBeneficiaries !== null && totalBeneficiaries > tierInfo.maxBeneficiaries) {
     errors.push(`Tier limit: ${tierInfo.maxBeneficiaries} beneficiar${tierInfo.maxBeneficiaries !== 1 ? 'ies' : 'y'} (you have ${totalBeneficiaries})`)
   }
 }

 // Check required owner fields
 if (!ownerFullName.trim()) errors.push('Owner full name')
 if (!ownerAddress.trim()) errors.push('Owner address')
 if (!ownerCity.trim()) errors.push('Owner city')
 if (!ownerState.trim()) errors.push('Owner state')
 if (!ownerZipCode.trim()) errors.push('Owner zip code')
 if (!ownerPhone.trim()) errors.push('Owner phone')

 // Check required executor fields
 if (!executorName.trim()) errors.push('Executor name')
 // Executor address is now optional
 if (!executorPhone.trim()) errors.push('Executor phone')
 if (!executorEmail.trim()) errors.push('Executor email')

 // Check beneficiaries
 if (beneficiaries.length === 0) {
 errors.push('At least one beneficiary')
 }

 // Check that we have allocations across all queued sessions
 const totalAllocations = queuedSessions.reduce((sum, session) => sum + session.allocations.length, 0)
 if (totalAllocations === 0) {
 errors.push('Asset allocations (allocate assets to beneficiaries)')
 }

 // Check key instructions
 if (!keyInstructions.trim()) {
 errors.push('Key access instructions')
 }

 return errors
 }

 const canProceedToPayment = () => {
 // Allow proceeding if only tier limit errors exist (user can select appropriate tier or use discount code)
 const errors = getPaymentValidationErrors()
 const nonTierErrors = errors.filter(err => !err.includes('Tier limit'))
 return nonTierErrors.length === 0
 }

 const canGeneratePDF = () => {
 // Can generate if payment is verified OR discount is applied
 return paymentVerified || discountApplied
 }

 const getCurrentStepIndex = () => {
 return steps.findIndex(s => s.id === step)
 }

 // Memoize onEvmConnect callback to prevent infinite loops
 const onEvmConnectCallback = useCallback(async (addr: string, provider?: string) => {
   // #region agent log
   fetch('http://127.0.0.1:7242/ingest/1f875b6a-05a0-43a5-a8e7-2ae799a836c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:1703',message:'onEvmConnect called',data:{addr,provider,connectedEVMAddressesSize:connectedEVMAddresses.size,isProcessing:resolvingInOnEvmConnectRef.current.has(addr?.toLowerCase()||'')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
   // #endregion
   if (!addr) return

   // CRITICAL: Check if we're already processing this address to prevent infinite loops
   if (resolvingInOnEvmConnectRef.current.has(addr.toLowerCase())) {
     // #region agent log
     fetch('http://127.0.0.1:7242/ingest/1f875b6a-05a0-43a5-a8e7-2ae799a836c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:1708',message:'onEvmConnect duplicate call blocked',data:{addr},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
     // #endregion
     console.log(`[onEvmConnect] Already processing ${addr}, skipping duplicate call`)
     return
   }

   if (!connectedEVMAddresses.has(addr)) {
     // Check wallet limit (20 wallets max including queued)
     if (connectedEVMAddresses.size + connectedSolanaAddresses.size + queuedSessions.length >= 20) {
       setError('Maximum 20 wallets allowed (including queued). Please disconnect a wallet or remove from queue first.')
       return
     }

     // Mark as being processed
     resolvingInOnEvmConnectRef.current.add(addr.toLowerCase())

     // IMPORTANT: Disconnect previous wagmi connection before adding new wallet
     // This prevents WalletConnect session limits and wagmi state conflicts
     if (isConnected && evmAddress && evmAddress !== addr) {
       try {
         await disconnect()
         // Small delay to ensure disconnect completes
         await new Promise(resolve => setTimeout(resolve, 100))
       } catch (err) {
         console.warn('Error disconnecting previous wallet:', err)
         // Continue anyway - the address is already captured
       }
     }

     // #region agent log
     fetch('http://127.0.0.1:7242/ingest/1f875b6a-05a0-43a5-a8e7-2ae799a836c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:1733',message:'About to setConnectedEVMAddresses',data:{addr,currentSize:connectedEVMAddresses.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
     // #endregion
     setConnectedEVMAddresses(prev => {
       // #region agent log
       fetch('http://127.0.0.1:7242/ingest/1f875b6a-05a0-43a5-a8e7-2ae799a836c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:1735',message:'setConnectedEVMAddresses callback executing',data:{addr,prevSize:prev.size,newSize:new Set([...prev, addr]).size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
       // #endregion
       return new Set([...prev, addr])
     })
     // Track wallet provider
     if (provider) {
       setWalletProviders(prev => ({ ...prev, [addr]: provider }))
     }

     // DON'T remove backdrops during connection - WalletConnect needs them
     // Only clean up AFTER connection is complete and modal should be closed
     // This cleanup will happen naturally when the modal closes

     // Resolve wallet name across all blockchain naming systems - ONLY if not already resolved
     const addrLower = addr.toLowerCase()
     // Use refs to check latest values without causing callback recreation
     if (!resolvedAddressesRef.current.has(addrLower) && !resolvedEnsNamesRef.current[addrLower]) {
       const resolveWalletName = async (address: string) => {
         try {
           // Try reverse lookup across all naming systems
           const resolved = await reverseResolveAddress(address)
           if (resolved) {
             resolvedAddressesRef.current.add(address.toLowerCase())
             // #region agent log
             fetch('http://127.0.0.1:7242/ingest/1f875b6a-05a0-43a5-a8e7-2ae799a836c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:1755',message:'About to update resolvedEnsNames and walletNames',data:{address,resolvedName:resolved.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
             // #endregion
             setResolvedEnsNames(prev => {
               const key = address.toLowerCase()
               if (prev[key] === resolved.name) return prev // Prevent unnecessary updates
               // #region agent log
               fetch('http://127.0.0.1:7242/ingest/1f875b6a-05a0-43a5-a8e7-2ae799a836c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:1759',message:'setResolvedEnsNames updating state',data:{key,resolvedName:resolved.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
               // #endregion
               const updated = { ...prev, [key]: resolved.name }
               resolvedEnsNamesRef.current = updated // Keep ref in sync
               return updated
             })
             // If no manual name is set, use resolved name as the wallet name
             setWalletNames(prev => {
               if (prev[address]) return prev // Don't overwrite manual names
               // #region agent log
               fetch('http://127.0.0.1:7242/ingest/1f875b6a-05a0-43a5-a8e7-2ae799a836c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:1766',message:'setWalletNames updating state',data:{address,resolvedName:resolved.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
               // #endregion
               const updated = { ...prev, [address]: resolved.name }
               walletNamesRef.current = updated // Keep ref in sync
               return updated
             })
             console.log(`Resolved ${resolved.resolver} name for wallet ${address}: ${resolved.name}`)
           }
         } catch (error) {
           console.error(`Error resolving name for wallet ${address}:`, error)
         } finally {
           // Remove from processing set
           resolvingInOnEvmConnectRef.current.delete(address.toLowerCase())
         }
       }

       // Resolve name in background (don't block)
       resolveWalletName(addr)
     } else {
       // Already resolved, just remove from processing set
       resolvingInOnEvmConnectRef.current.delete(addrLower)
     }

     // Set as selected if it's the first wallet or no wallet is selected
     if (selectedWalletForLoading === null) {
       setSelectedWalletForLoading(addr)
     }
     // Request signature to verify ownership - NON-BLOCKING (don't await)
     // Verification happens in background, user can continue using the app
     if (!verifiedAddresses.has(addr)) {
       // Don't await - let it run in background to prevent UI blocking
       verifyWalletOwnership(addr).catch(error => {
         // Silently handle errors - verification is optional for basic functionality
         console.log('Wallet verification skipped or failed:', error)
       })
     }
   } else {
     // Address already connected, just remove from processing set
     resolvingInOnEvmConnectRef.current.delete(addr.toLowerCase())
   }
 }, [connectedEVMAddresses, queuedSessions.length, isConnected, evmAddress, disconnect, setConnectedEVMAddresses, setWalletProviders, selectedWalletForLoading, verifiedAddresses, verifyWalletOwnership, setError, setSelectedWalletForLoading])

 // Solana wallet connection callback
 const onSolanaConnectCallback = useCallback(async (addr: string, provider?: string) => {
   if (!addr) return

   if (!connectedSolanaAddresses.has(addr)) {
     // Check wallet limit (20 wallets max including queued)
     if (connectedEVMAddresses.size + connectedSolanaAddresses.size + queuedSessions.length >= 20) {
       setError('Maximum 20 wallets allowed (including queued). Please disconnect a wallet or remove from queue first.')
       return
     }

     setConnectedSolanaAddresses(prev => new Set([...prev, addr]))
     
     // Track wallet provider
     if (provider) {
       setWalletProviders(prev => ({ ...prev, [addr]: provider }))
     }

     // Resolve Solana name if .sol (SNS)
     const addrLower = addr.toLowerCase()
     if (!resolvedAddressesRef.current.has(addrLower) && !resolvedEnsNamesRef.current[addrLower]) {
       const resolveWalletName = async (address: string) => {
         try {
           // Try reverse lookup (SNS for Solana addresses)
           const resolved = await reverseResolveAddress(address)
           if (resolved) {
             resolvedAddressesRef.current.add(address.toLowerCase())
             setResolvedEnsNames(prev => {
               const key = address.toLowerCase()
               if (prev[key] === resolved.name) return prev
               return { ...prev, [key]: resolved.name }
             })
             setWalletNames(prev => {
               if (prev[address]) return prev
               return { ...prev, [address]: resolved.name }
             })
             console.log(`Resolved ${resolved.resolver} name for Solana wallet ${address}: ${resolved.name}`)
           }
         } catch (error) {
           console.error(`Error resolving name for Solana wallet ${address}:`, error)
         }
       }
       resolveWalletName(addr)
     }

     // Set as selected if it's the first wallet or no wallet is selected
     if (selectedWalletForLoading === null) {
       setSelectedWalletForLoading(addr)
     }

     // For Solana, we don't require signature verification (different security model)
     // But we can mark as verified immediately since wallet connection itself proves ownership
     setVerifiedAddresses(prev => new Set([...prev, addr]))
   }
 }, [connectedSolanaAddresses, connectedEVMAddresses.size, queuedSessions.length, selectedWalletForLoading, setConnectedSolanaAddresses, setWalletProviders, setVerifiedAddresses, setError, setSelectedWalletForLoading])

 // #region agent log
 // Track when onEvmConnect callback dependencies change
 useEffect(() => {
   fetch('http://127.0.0.1:7242/ingest/1f875b6a-05a0-43a5-a8e7-2ae799a836c1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:1797',message:'onEvmConnect callback dependencies changed',data:{connectedEVMAddressesSize:connectedEVMAddresses.size,queuedSessionsLength:queuedSessions.length,isConnected,evmAddress,resolvedEnsNamesKeys:Object.keys(resolvedEnsNames).length,walletNamesKeys:Object.keys(walletNames).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
 }, [connectedEVMAddresses, queuedSessions.length, isConnected, evmAddress]);
 // #endregion

 return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden flex flex-col">
      {/* Animated background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 animate-gradient-shift"></div>
      
      {/* Floating gradient orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float"></div>
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float-delayed"></div>

      {/* Header */}
      <Header />

 <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-24 md:pt-28 pb-4 sm:pb-6 md:pb-8">

 {/* Tier Selection - Always visible at top */}
 <div className="max-w-6xl mx-auto mb-8">
   <div className="bg-white/5 backdrop-blur-xl rounded-2xl shadow-xl p-6 sm:p-8 border-2 border-white/20 border-glow">
     <h2 className="text-2xl sm:text-3xl font-bold text-bright mb-2 text-center">Choose Your Plan</h2>
     <p className="text-center text-bright-soft mb-6 sm:mb-8">Select a plan that fits your needs</p>
     <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
       {getAllTiers().map((tier) => {
         const isSelected = selectedTier === tier.tier
         const tierPricing = getTierPricing(tier.tier)
         
         const tierGradients = {
           free: 'from-green-500/20 to-emerald-500/20',
           standard: 'from-purple-500/20 via-blue-500/20 to-purple-500/20',
           premium: 'from-yellow-500/20 via-orange-500/20 to-pink-500/20'
         }
         const tierGradient = tierGradients[tier.tier as keyof typeof tierGradients] || 'from-purple-500/20 to-blue-500/20'
         const tierColors = {
           free: { border: 'border-green-500/60', text: 'text-green-400', price: 'text-green-400' },
           standard: { border: 'border-purple-500/60', text: 'text-purple-400', price: 'text-purple-400' },
           premium: { border: 'border-yellow-500/60', text: 'text-yellow-400', price: 'text-yellow-400' }
         }
         const tierColor = tierColors[tier.tier as keyof typeof tierColors] || tierColors.standard
         
         return (
           <div
             key={tier.tier}
             onClick={() => setSelectedTier(tier.tier)}
             className={`relative bg-gradient-to-br ${tierGradient} backdrop-blur-xl rounded-2xl border-2 p-6 sm:p-8 cursor-pointer transition-all transform hover:scale-105 overflow-hidden group ${
               isSelected
                 ? `${tierColor.border} shadow-2xl shadow-purple-500/30 scale-105 border-glow`
                 : 'border-white/20 hover:border-purple-400/50 border-glow-hover hover:shadow-2xl hover:shadow-purple-500/20'
             }`}
           >
             {/* Animated background gradient */}
             <div className={`absolute inset-0 bg-gradient-to-br ${tierGradient} opacity-0 group-hover:opacity-30 transition-opacity duration-500 animate-gradient-shift`}></div>
             
             {/* Content */}
             <div className="relative z-10 h-full flex flex-col">
               <div className="text-center mb-4 sm:mb-6">
                 <h3 className={`text-xl sm:text-2xl font-bold mb-3 ${tierColor.text} group-hover:text-white transition-colors`}>
                   {tier.name}
                 </h3>
                 <div className="mb-4">
                   {tier.price === 0 ? (
                     <p className="text-3xl sm:text-4xl font-bold text-bright group-hover:text-white transition-colors">Free</p>
                   ) : tierPricing.isSpecial && tier.tier === 'standard' ? (
                     <div>
                       <p className="text-3xl sm:text-4xl font-bold text-green-400 group-hover:text-green-300 transition-colors">${tierPricing.usdAmount.toFixed(2)}</p>
                       <p className="text-sm line-through text-gray-400 mt-1">${tierPricing.regularPrice?.toFixed(2)}</p>
                       <p className="text-xs text-green-400 font-semibold mt-1">✨ 2026 Special ✨</p>
                     </div>
                   ) : (
                     <p className="text-3xl sm:text-4xl font-bold text-bright group-hover:text-white transition-colors">${tier.price.toFixed(2)}</p>
                   )}
                 </div>
               </div>
               
               <ul className="space-y-2.5 sm:space-y-3 mb-6 flex-1">
                 {tier.features.map((feature, idx) => (
                   <li key={idx} className="text-sm sm:text-base text-bright-soft group-hover:text-white transition-colors flex items-start gap-2.5">
                     <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                       <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                     </svg>
                     <span>{feature}</span>
                   </li>
                 ))}
               </ul>
               
               {isSelected && (
                 <div className="mt-auto text-center">
                   <span className="inline-block px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold rounded-full shadow-lg border-2 border-purple-400/50">
                     ✓ Selected
                   </span>
                 </div>
               )}
             </div>
             
             {/* Shine effect on hover */}
             <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
           </div>
         )
       })}
     </div>
     <div className="text-center pt-4 border-t-2 border-white/10">
       <button
         onClick={() => {
           if (selectedTier === 'free') {
             setStep('connect')
           } else {
             setStep('connect')
           }
         }}
         className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-2xl hover:shadow-purple-500/50 transform hover:scale-110 border-2 border-purple-400/50 border-glow-hover"
       >
         {selectedTier === 'free' ? (
           'Start Free Plan →'
         ) : selectedTier === 'standard' && pricing.isSpecial ? (
           <span className="inline-flex items-center gap-2">
             <span>Start with 🎉 ${pricing.usdAmount.toFixed(2)}</span>
             <span className="line-through text-sm">${pricing.regularPrice?.toFixed(2)}</span>
             <span className="text-xs">✨ 2026 Special ✨</span>
           </span>
         ) : (
           `Start with $${pricing.usdAmount.toFixed(2)} →`
         )}
       </button>
       <p className="text-xs text-gray-400 mt-3">
         Payment required on Step 5. Free tier skips payment.
       </p>
     </div>
   </div>
 </div>

 {/* Progress Steps */}
 <div className="mb-4 sm:mb-8 bg-white/5 backdrop-blur-xl rounded-lg shadow-sm p-2 sm:p-4 border-2 border-white/20 border-glow">
 <div className="flex items-center justify-between max-w-4xl mx-auto overflow-x-auto pb-2 sm:pb-0">
 {steps.map((s, index) => {
 const currentIndex = getCurrentStepIndex()
 const isActive = step === s.id
 const isCompleted = currentIndex > index
 
 // Allow free navigation to steps 1-4 (Connect, Assets, Allocate, Details)
 // Steps 5-6 (Payment, Download) require completion of previous steps
 const isFreeNavigationStep = index < 4
 const canNavigate = isFreeNavigationStep || isActive || isCompleted || (() => {
   switch(s.id) {
     case 'payment': 
       // Allow navigation to payment if:
       // 1. Invoice already exists, OR
       // 2. Discount is applied, OR
       // 3. Details step is completed (user can go back to payment)
       return invoiceId !== null || discountApplied || (currentIndex >= 3) // Details step is index 3
     case 'download': return paymentVerified || discountApplied
     default: return false
   }
 })()

 return (
 <div key={s.id} className="flex items-center flex-1">
 <div className="flex flex-col items-center flex-1">
 <button
 onClick={() => {
   // Always allow navigation for steps 1-4, check canNavigate for steps 5-6
   if (isFreeNavigationStep || canNavigate) {
     setStep(s.id)
   }
 }}
 disabled={!isFreeNavigationStep && !canNavigate}
 className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm transition-all touch-manipulation ${
   isActive
     ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-110 cursor-default'
     : isCompleted
     ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
     : (isFreeNavigationStep || canNavigate)
     ? 'bg-white/5 backdrop-blur-xl/10 text-gray-300 hover:bg-white/5 backdrop-blur-xl/20 cursor-pointer border border-white/20'
     : 'bg-white/5 backdrop-blur-xl/5 text-gray-400 cursor-not-allowed border border-white/10'
 }`}
 title={isFreeNavigationStep || canNavigate ? `Go to ${s.label}` : 'Complete previous steps first'}
 >
 {isCompleted ? '✓' : s.number}
 </button>
 <button
 onClick={() => {
   // Always allow navigation for steps 1-4, check canNavigate for steps 5-6
   if (isFreeNavigationStep || canNavigate) {
     setStep(s.id)
   }
 }}
 disabled={!isFreeNavigationStep && !canNavigate}
 className={`text-[10px] sm:text-xs mt-1 sm:mt-2 font-medium transition-colors touch-manipulation ${
   isActive
     ? 'text-purple-400 cursor-default'
     : isCompleted
     ? 'text-green-400 hover:text-green-300 cursor-pointer'
     : (isFreeNavigationStep || canNavigate)
     ? 'text-gray-300 hover:text-white cursor-pointer'
     : 'text-gray-400 cursor-not-allowed'
 }`}
 title={isFreeNavigationStep || canNavigate ? `Go to ${s.label}` : 'Complete previous steps first'}
 >
 {s.label}
 </button>
 </div>
 {index < steps.length - 1 && (
 <div className={`h-1 flex-1 mx-2 rounded ${
   isCompleted ? 'bg-green-500' : 'bg-white/5 backdrop-blur-xl/10'
 }`} />
 )}
 </div>
 )
 })}
 </div>
 </div>

 {/* Main Content */}
 <main className="bg-white/5 backdrop-blur-xl rounded-xl shadow-xl p-4 sm:p-6 md:p-8 lg:p-12 border-2 border-white/20 border-glow mb-8">
 {error && (() => {
   const friendly = getUserFriendlyError({ message: error })
   return (
     <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-xl border-2 border-red-500/30 rounded-lg border-glow">
       <p className="text-red-300 font-semibold mb-1">{friendly.title}</p>
       <p className="text-red-200 text-sm mb-2">{friendly.message}</p>
       {friendly.action && (
         <p className="text-red-300 text-xs mt-2">
           <strong>What to do:</strong> {friendly.action}
         </p>
       )}
       {friendly.details && process.env.NODE_ENV === 'development' && (
         <p className="text-red-400 text-xs mt-1 italic">{friendly.details}</p>
       )}
     </div>
   )
 })()}

{step === 'connect' && (
<div className="max-w-2xl mx-auto">
<h2 className="text-2xl sm:text-3xl font-bold text-bright mb-2 text-glow-white">Connect Your Wallets</h2>
<p className="text-bright-soft mb-8">
  Connect and process up to 20 wallets. Each wallet's assets will be saved to a queue after allocation.
</p>

 {/* Queue Status */}
{queuedSessions.length > 0 && (
<div className="mb-8 bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-xl border-2 border-green-500/30 rounded-lg p-6 border-glow hover:shadow-2xl hover:shadow-green-500/20 transition-all">
<div className="flex items-center justify-between mb-4">
<h3 className="text-xl font-bold text-bright text-glow">
  Queued Wallets ({queuedSessions.length}/20)
</h3>
{queuedSessions.length > 0 && (
<button
onClick={() => {
if (confirm('Clear all queued wallets? This cannot be undone.')) {
setQueuedSessions([])
}
}}
className="px-4 py-2 bg-red-500/20 backdrop-blur-xl text-red-300 text-sm font-semibold rounded-lg border-2 border-red-500/30 hover:bg-red-500/30 hover:border-red-500/50 transition-all transform hover:scale-105"
>
Clear All
</button>
)}
</div>
 <div className="space-y-3 max-h-[800px] overflow-y-auto">
 {queuedSessions.map((session) => {
 const totalAssets = session.assets.length
 const totalAllocations = session.allocations.length
 // Get wallet name (stored walletName > manual name > resolved ENS > ENS from session > address)
 const sessionAddrLower = session.walletAddress.toLowerCase()
 const walletName = session.walletName || 
                    walletNames[session.walletAddress] || 
                    walletNames[sessionAddrLower] ||
                    resolvedEnsNames[sessionAddrLower] || 
                    session.ensName || 
                    session.walletAddress
 const displayName = walletName !== session.walletAddress ? walletName : session.walletAddress
 return (
<div key={session.id} className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-xl rounded-lg border-2 border-white/20 p-4 border-glow-hover hover:shadow-2xl hover:shadow-purple-500/20 transition-all transform hover:scale-[1.02] group">
<div className="flex items-start justify-between">
<div className="flex-1">
<div className="flex items-center gap-2 mb-2 flex-wrap">
<span className="text-sm font-bold text-bright group-hover:text-white transition-colors">
{displayName}
</span>
{displayName !== session.walletAddress && (
<span className="text-xs text-bright-soft font-mono">
({session.walletAddress.slice(0, 10)}...{session.walletAddress.slice(-8)})
</span>
)}
<span className={`px-2 py-1 rounded-full text-xs font-semibold border-2 ${
session.verified ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
}`}>
{session.verified ? '✓ Verified' : 'Unverified'}
</span>
<span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border-2 border-blue-500/30">
{session.walletType.toUpperCase()}
</span>
</div>
<div className="text-sm text-bright-soft group-hover:text-white transition-colors">
<span className="font-semibold">{totalAssets}</span> asset{totalAssets !== 1 ? 's' : ''} • 
<span className="font-semibold"> {totalAllocations}</span> allocation{totalAllocations !== 1 ? 's' : ''}
</div>
</div>
<button
onClick={() => handleRemoveQueuedSession(session.id)}
className="ml-4 px-3 py-1 bg-red-500/20 backdrop-blur-xl text-red-300 border-2 border-red-500/30 text-sm font-semibold rounded-lg hover:bg-red-500/30 hover:border-red-500/50 transition-all transform hover:scale-105"
>
Remove
</button>
</div>
</div>
 )
 })}
 </div>
{queuedSessions.length > 0 && (
<div className="mt-4 pt-4 border-t-2 border-white/20">
<button
onClick={() => setStep('details')}
disabled={queuedSessions.length === 0}
className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:shadow-purple-500/50 transform hover:scale-105 border-2 border-purple-400/50 border-glow-hover"
>
Continue to Details ({queuedSessions.length} wallet{queuedSessions.length !== 1 ? 's' : ''} queued) →
</button>
</div>
)}
 </div>
 )}

{assets.length > 0 && (
<div className="mb-6 p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-xl border-2 border-blue-500/30 rounded-lg border-glow hover:shadow-2xl hover:shadow-blue-500/20 transition-all">
<div className="flex items-start justify-between">
<div className="flex-1">
<p className="text-sm text-bright font-semibold mb-1">
{assets.length} asset{assets.length !== 1 ? 's' : ''} loaded from previous wallet{assets.length !== 1 ? 's' : ''}
</p>
<p className="text-xs text-bright-soft">
Connect another wallet to add more assets, or continue to review your current assets.
</p>
</div>
<button
onClick={() => {
if (confirm('Clear all assets and start fresh? This will remove all loaded assets and allocations.')) {
setAssets([])
setSelectedAssetIds([])
setAllocations([])
if (typeof window !== 'undefined') {
localStorage.removeItem('lastwish_state')
}
setError(null)
}
}}
className="ml-4 px-3 py-1 text-xs font-semibold text-red-300 bg-red-500/20 backdrop-blur-xl border-2 border-red-500/30 rounded-lg hover:bg-red-500/30 hover:border-red-500/50 transition-all transform hover:scale-105 whitespace-nowrap"
>
Clear Assets
</button>
</div>
</div>
)}
 {/* Show connected wallets with disconnect options - show ABOVE connect options */}
 {(connectedEVMAddresses.size > 0 || btcAddress || connectedSolanaAddresses.size > 0) && (
 <div className="mb-6 space-y-4">
<div className="flex items-center justify-between border-b-2 border-white/20 pb-2 mb-4">
<h3 className="text-lg font-bold text-bright text-glow">
Connected Wallets ({connectedEVMAddresses.size + (btcAddress ? 1 : 0) + connectedSolanaAddresses.size})
</h3>
<div className="flex gap-2">
<button
onClick={async () => {
// Load assets from ALL verified wallets at once (EVM + Solana)
const verifiedEVMWallets = Array.from(connectedEVMAddresses).filter(addr => verifiedAddresses.has(addr))
const verifiedSolanaWallets = Array.from(connectedSolanaAddresses).filter(addr => verifiedAddresses.has(addr))
if (verifiedEVMWallets.length > 0 || verifiedSolanaWallets.length > 0 || btcAddress) {
await loadAssets(true, true) // append=true, loadFromAllWallets=true
} else {
setError('Please verify at least one wallet (sign message) before loading assets.')
}
}}
disabled={loading || (Array.from(connectedEVMAddresses).filter(addr => verifiedAddresses.has(addr)).length === 0 && connectedSolanaAddresses.size === 0 && !btcAddress)}
className="px-4 py-2 text-sm font-semibold text-blue-300 bg-blue-500/20 backdrop-blur-xl border-2 border-blue-500/30 rounded-lg hover:bg-blue-500/30 hover:border-blue-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
>
{loading ? 'Loading...' : 'Load All Wallets'}
</button>
<button
onClick={() => {
// Disconnect all wallets and clear state
if (confirm('Disconnect all wallets and clear all data? This will remove all loaded assets and allocations.')) {
// Clear all wallet connections
setConnectedEVMAddresses(new Set())
setConnectedSolanaAddresses(new Set())
setBtcAddress(null)
setVerifiedAddresses(new Set())
setLoadedWallets(new Set())
disconnect()
// Clear all state
setAssets([])
setSelectedAssetIds([])
setBeneficiaries([])
setAllocations([])
setStep('connect')
// Clear localStorage
if (typeof window !== 'undefined') {
localStorage.removeItem('lastwish_state')
}
setError(null)
}
}}
className="px-4 py-2 text-sm font-semibold text-red-300 bg-red-500/20 backdrop-blur-xl border-2 border-red-500/30 rounded-lg hover:bg-red-500/30 hover:border-red-500/50 transition-all transform hover:scale-105"
>
Disconnect All
</button>
</div>
</div>
 {Array.from(connectedEVMAddresses).map((addr) => {
 const ensName = resolvedEnsNames[addr.toLowerCase()] || walletNames[addr]
 const walletAssets = assets.filter(a => a.walletAddress === addr)
 const walletAssetCount = walletAssets.length
 const isSelected = selectedWalletForLoading === addr
 const isVerified = verifiedAddresses.has(addr)
 const walletProvider = walletProviders[addr] || 'Unknown'
 
 return (
  <div 
    key={addr} 
    className={`bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-xl border-2 rounded-lg shadow-sm transition-all mb-3 transform hover:scale-[1.02] group ${
      isSelected 
      ? 'border-purple-500/60 shadow-2xl shadow-purple-500/30 border-glow scale-105' 
      : isVerified
      ? 'border-white/20 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/20 border-glow-hover'
      : 'border-white/10 opacity-60'
    }`}
  >
     {/* Wallet header - clickable to select */}
     <div 
       onClick={() => {
         if (isVerified) {
           setSelectedWalletForLoading(addr)
         }
       }}
       className="p-4 cursor-pointer"
     >
       <div className="flex items-start justify-between">
         <div className="flex-1 min-w-0">
           {/* Wallet Name - Editable */}
           <WalletNameEditor
             address={addr}
             currentName={ensName || walletNames[addr] || ''}
             isENS={!!resolvedEnsNames[addr.toLowerCase()]}
             onNameChange={(newName) => {
               setWalletNames(prev => ({ ...prev, [addr]: newName }))
             }}
           />
           
           <div className="flex items-center gap-2 mb-2 flex-wrap mt-2">
             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border-2 border-blue-500/30">
               {walletProvider}
             </span>
             {isSelected && (
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-white border-2 border-purple-400/50 shadow-lg">
                 ✓ Selected
               </span>
             )}
             {!isVerified && (
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-300 border-2 border-yellow-500/30">
                 ⚠ Verify Required
               </span>
             )}
             {walletAssetCount > 0 && (
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-300 border-2 border-green-500/30">
                 {walletAssetCount} Asset{walletAssetCount !== 1 ? 's' : ''}
               </span>
             )}
           </div>
           
           {/* Address display */}
           <div className="mt-1">
                 <p className="text-xs font-mono text-bright-soft break-all group-hover:text-white transition-colors">
                 {addr}
               </p>
           </div>
         </div>
         
         <div className="ml-4 flex gap-2 flex-shrink-0">
           <button
             onClick={(e) => {
               e.stopPropagation()
               setConnectedEVMAddresses(prev => {
                 const newSet = new Set(prev)
                 newSet.delete(addr)
                 if (selectedWalletForLoading === addr) {
                   const remaining = Array.from(newSet).filter(a => verifiedAddresses.has(a))
                   setSelectedWalletForLoading(remaining.length > 0 ? remaining[0] : null)
                 }
                 return newSet
               })
               if (evmAddress === addr) {
                 disconnect()
               }
             }}
             className="px-3 py-1.5 text-xs font-semibold text-red-300 bg-red-500/20 backdrop-blur-xl border-2 border-red-500/30 rounded-lg hover:bg-red-500/30 hover:border-red-500/50 transition-all transform hover:scale-105"
           >
             Disconnect
           </button>
           {isVerified && (
             <button
               onClick={(e) => {
                 e.stopPropagation()
                 setSelectedWalletForLoading(addr)
               }}
               className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all transform hover:scale-105 ${
                 isSelected
                 ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-purple-400/50 shadow-lg'
                 : 'bg-blue-500/20 backdrop-blur-xl text-blue-300 border-blue-500/30 hover:bg-blue-500/30 hover:border-blue-500/50'
               }`}
             >
               {isSelected ? '✓' : 'Select'}
             </button>
           )}
         </div>
       </div>
     </div>
     
     {/* Load Assets button - appears directly below wallet when verified */}
     {isVerified && (
       <div className="px-4 pb-4 border-t-2 border-white/20 pt-3">
         <button
           onClick={async (e) => {
             e.stopPropagation()
             setSelectedWalletForLoading(addr) // Set selected wallet first
             await loadAssetsFromWallet(addr, assets.length > 0)
             setStep('assets')
           }}
           disabled={loading}
           className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 sm:p-4 font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-2xl hover:shadow-purple-500/50 transform hover:scale-105 border-2 border-purple-400/50 border-glow-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none touch-manipulation min-h-[44px]"
         >
           {loading ? 'Loading Assets...' : (walletAssetCount > 0 ? `Reload Assets from ${walletProvider}` : `Load Assets from ${walletProvider}`)}
         </button>
       </div>
     )}
   </div>
 )
})}
 {btcAddress && (() => {
 const btcAssets = assets.filter(a => a.chain === 'bitcoin')
 const btcAssetCount = btcAssets.length
 const btcWalletName = walletNames[btcAddress] || resolvedEnsNames[btcAddress.toLowerCase()] || ''
  return (
<div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 backdrop-blur-xl border-2 border-orange-500/30 rounded-lg p-4 shadow-sm border-glow hover:shadow-2xl hover:shadow-orange-500/20 transition-all transform hover:scale-[1.02] group">
<div className="flex items-start justify-between">
<div className="flex-1 min-w-0">
{/* Wallet Name - Editable */}
<WalletNameEditor
  address={btcAddress}
  currentName={btcWalletName}
  isENS={!!resolvedEnsNames[btcAddress.toLowerCase()]}
  onNameChange={(newName) => {
    setWalletNames(prev => ({ ...prev, [btcAddress]: newName }))
  }}
/>

<div className="flex items-center gap-2 mb-2 flex-wrap mt-2">
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border-2 border-orange-500/30">
BITCOIN WALLET
</span>
{btcAssetCount > 0 && (
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-300 border-2 border-green-500/30">
{btcAssetCount} Asset{btcAssetCount !== 1 ? 's' : ''} Loaded
</span>
)}
</div>

<div className="mt-1">
<p className="text-xs font-semibold text-bright-soft uppercase tracking-wide mb-1 group-hover:text-white transition-colors">
Bitcoin Address
</p>
<p className="text-sm font-mono text-bright-soft break-all bg-white/5 backdrop-blur-xl p-2 rounded border-2 border-white/20 group-hover:text-white transition-colors">
{btcAddress}
</p>
</div>

        <div className="mt-3 pt-3 border-t-2 border-white/20">
          <p className="text-xs text-bright-soft group-hover:text-white transition-colors">
            <span className="font-semibold">Network:</span> Bitcoin Mainnet
          </p>
        </div>
      </div>

      <div className="ml-4 flex flex-col gap-2">
        <button
          onClick={async () => {
            if (btcAddress) {
              setSelectedWalletForLoading(null) // Clear EVM selection so Bitcoin filtering works
              await loadAssets(true, false) // append=true, loadFromAllWallets=false
              setStep('assets') // Navigate to assets step after loading
            }
          }}
          disabled={loading}
          className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 rounded-lg border-2 border-orange-400/50 transition-all shadow-lg hover:shadow-orange-500/50 transform hover:scale-105 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? 'Loading...' : 'Load Assets from Selected Wallet'}
        </button>
        <button
          onClick={() => {
            // Just disconnect the wallet - KEEP all assets and selections
            setBtcAddress(null)
            // Don't remove assets - they're already loaded and selected assets should be preserved
            // The walletAddress field on assets will still show which wallet they came from
          }}
          className="px-4 py-2 text-sm font-semibold text-red-300 bg-red-500/20 backdrop-blur-xl border-2 border-red-500/30 rounded-lg hover:bg-red-500/30 hover:border-red-500/50 transition-all transform hover:scale-105 whitespace-nowrap"
        >
          Disconnect
        </button>
      </div>
</div>
</div>
 )
 })()}
 {Array.from(connectedSolanaAddresses).map((addr) => {
   const solanaAssets = assets.filter(a => a.walletAddress === addr)
   const solanaAssetCount = solanaAssets.length
   const solanaWalletName = walletNames[addr] || resolvedEnsNames[addr.toLowerCase()] || ''
   const isSelected = selectedWalletForLoading === addr
   const isVerified = verifiedAddresses.has(addr)
   const walletProvider = walletProviders[addr] || 'Solana Wallet'
   
   return (
     <div 
       key={addr} 
       className={`bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl border-2 rounded-lg shadow-sm transition-all mb-3 transform hover:scale-[1.02] group ${
         isSelected 
         ? 'border-purple-500/60 shadow-2xl shadow-purple-500/30 border-glow scale-105' 
         : isVerified
         ? 'border-white/20 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/20 border-glow-hover'
         : 'border-white/10 opacity-60'
       }`}
     >
       <div className="p-4">
         <div className="flex items-start justify-between">
           <div className="flex-1 min-w-0">
             <WalletNameEditor
               address={addr}
               currentName={solanaWalletName}
               isENS={!!resolvedEnsNames[addr.toLowerCase()]}
               onNameChange={(newName) => {
                 setWalletNames(prev => ({ ...prev, [addr]: newName }))
               }}
             />
             
             <div className="flex items-center gap-2 mb-2 flex-wrap mt-2">
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border-2 border-purple-500/30">
                 {walletProvider}
               </span>
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-500/20 text-pink-300 border-2 border-pink-500/30">
                 SOLANA
               </span>
               {isSelected && (
                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white border-2 border-purple-400/50 shadow-lg">
                   ✓ Selected
                 </span>
               )}
               {solanaAssetCount > 0 && (
                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/20 text-green-300 border-2 border-green-500/30">
                   {solanaAssetCount} Asset{solanaAssetCount !== 1 ? 's' : ''}
                 </span>
               )}
             </div>
             
             <div className="mt-1">
               <p className="text-xs font-mono text-bright-soft break-all group-hover:text-white transition-colors">
                 {addr}
               </p>
             </div>
           </div>
           
           <div className="ml-4 flex gap-2 flex-shrink-0">
             <button
               onClick={(e) => {
                 e.stopPropagation()
                 setConnectedSolanaAddresses(prev => {
                   const newSet = new Set(prev)
                   newSet.delete(addr)
                   if (selectedWalletForLoading === addr) {
                     const remaining = Array.from(new Set([...connectedEVMAddresses, ...newSet])).filter(a => verifiedAddresses.has(a))
                     setSelectedWalletForLoading(remaining.length > 0 ? remaining[0] : null)
                   }
                   return newSet
                 })
               }}
               className="px-3 py-1.5 text-xs font-semibold text-red-300 bg-red-500/20 backdrop-blur-xl border-2 border-red-500/30 rounded-lg hover:bg-red-500/30 hover:border-red-500/50 transition-all transform hover:scale-105"
             >
               Disconnect
             </button>
             {isVerified && (
               <button
                 onClick={(e) => {
                   e.stopPropagation()
                   setSelectedWalletForLoading(addr)
                 }}
                 className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all transform hover:scale-105 ${
                   isSelected
                   ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-400/50 shadow-lg'
                   : 'bg-purple-500/20 backdrop-blur-xl text-purple-300 border-purple-500/30 hover:bg-purple-500/30 hover:border-purple-500/50'
                 }`}
               >
                 {isSelected ? '✓' : 'Select'}
               </button>
             )}
           </div>
         </div>
       </div>
       
       {isVerified && (
         <div className="px-4 pb-4 border-t-2 border-white/20 pt-3">
           <button
             onClick={async (e) => {
               e.stopPropagation()
               setSelectedWalletForLoading(addr)
               await loadAssetsFromWallet(addr, assets.length > 0)
               setStep('assets')
             }}
             disabled={loading}
             className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 sm:p-4 font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-2xl hover:shadow-purple-500/50 transform hover:scale-105 border-2 border-purple-400/50 border-glow-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none touch-manipulation min-h-[44px]"
           >
             {loading ? 'Loading Assets...' : (solanaAssetCount > 0 ? `Reload Assets from ${walletProvider}` : `Load Assets from ${walletProvider}`)}
           </button>
         </div>
       )}
     </div>
   )
 })}
 </div>
 )}

 {/* Always show wallet connect options, even when wallets are already connected */}
<div className="mt-6 p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-xl rounded-lg border-2 border-white/20 border-glow">
<h3 className="text-lg font-bold text-bright mb-4 border-b-2 border-white/20 pb-2 text-glow">
Connect Additional Wallets
</h3>
<p className="text-sm text-bright-soft mb-4">
Connect more wallets to add their assets. You can connect multiple EVM wallets, Bitcoin wallets, and Solana wallets.
</p>
 <WalletConnect
              onBitcoinConnect={async (addr, provider, ordinalsAddr) => {
                if (!addr) return
                setBtcAddress(addr)
                setBtcOrdinalsAddress(ordinalsAddr || null) // Store ordinals address if provided
                // Store Bitcoin wallet provider (Xverse, OKX, Blockchain.com, Manual, etc.)
                if (provider) {
                  setWalletProviders((prev) => ({ ...prev, [addr]: provider }))
                }
                setSelectedWalletForLoading(null) // Clear EVM selection when Bitcoin is connected
                setError(null)
                // Stay on connect step - user can manually load assets when ready
                // Don't automatically navigate to assets step
              }}
              onEvmConnect={onEvmConnectCallback}
              onSolanaConnect={onSolanaConnectCallback}
 />
 </div>
 
 {/* Show verification status */}
{isConnected && evmAddress && !verifiedAddresses.has(evmAddress) && (
<div className="mt-6 p-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-xl border-2 border-yellow-500/30 rounded-lg border-glow hover:shadow-2xl hover:shadow-yellow-500/20 transition-all">
<p className="text-sm font-semibold text-yellow-300 mb-2 text-glow">
🔒 Wallet Verification Required
</p>
<p className="text-xs text-yellow-300 mb-3">
To protect your security, we need to verify you own this wallet by signing a message. This proves you control the wallet and prevents unauthorized access.
</p>
{pendingVerification === evmAddress ? (
<p className="text-xs text-yellow-300">
⏳ Waiting for signature in your wallet...
</p>
) : (
<button
onClick={() => verifyWalletOwnership(evmAddress)}
className="w-full rounded-lg bg-gradient-to-r from-yellow-600 to-orange-600 text-white p-3 font-semibold hover:from-yellow-700 hover:to-orange-700 transition-all shadow-lg hover:shadow-yellow-500/50 transform hover:scale-105 border-2 border-yellow-400/50"
>
Verify Wallet Ownership (Sign Message)
</button>
)}
</div>
)}

 {mounted && selectedWalletForLoading && verifiedAddresses.has(selectedWalletForLoading) && !loading && (
 <div className="mt-8 space-y-3">
 <button
 onClick={async () => {
 // Temporarily set evmAddress context to selected wallet for loading
 const originalEvmAddress = evmAddress
 // Load from selected wallet
 if (selectedWalletForLoading) {
 // Create a temporary context - we'll pass the address directly to loadAssets
 await loadAssetsFromWallet(selectedWalletForLoading, assets.length > 0)
 setStep('assets')
 }
 }}
 className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 sm:p-4 font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-2xl hover:shadow-purple-500/50 transform hover:scale-105 border-2 border-purple-400/50 border-glow-hover touch-manipulation min-h-[44px]"
 >
 {assets.length > 0 ? 'Add Assets from Selected Wallet' : 'Load Assets from Selected Wallet →'}
 </button>
 {connectedEVMAddresses.size > 1 && Array.from(connectedEVMAddresses).filter(addr => verifiedAddresses.has(addr)).length > 1 && (
 <button
 onClick={async () => {
 await loadAssets(assets.length > 0, true) // Append if we already have assets, load from ALL verified wallets
 setStep('assets')
 }}
 className="w-full rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white p-3 sm:p-4 font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-2xl hover:shadow-green-500/50 transform hover:scale-105 border-2 border-green-400/50 border-glow-hover touch-manipulation min-h-[44px]"
 >
 Load Assets from ALL Verified Wallets ({Array.from(connectedEVMAddresses).filter(addr => verifiedAddresses.has(addr)).length}) →
 </button>
 )}
 {assets.length > 0 && (
 <button
 onClick={() => setStep('assets')}
 className="w-full rounded-lg border-2 border-white/20 bg-white/5 backdrop-blur-xl p-3 sm:p-4 font-semibold text-bright hover:bg-white/10 hover:border-white/30 transition-all transform hover:scale-105 border-glow-hover touch-manipulation min-h-[44px]"
 >
 Continue with Current Assets ({assets.length}) →
 </button>
 )}
<div className="mt-4 text-center p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-xl rounded-lg border-2 border-white/20 border-glow">
<p className="text-sm text-bright-soft">
💡 You can connect multiple wallets. Load assets from each wallet individually, or load from all verified wallets at once.
</p>
</div>
 </div>
 )}
 </div>
 )}

 {step === 'assets' && (
 <div>
 <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Your Assets</h2>
 <p className="text-gray-300 mb-8">
 {selectedWalletForLoading || btcAddress 
   ? 'Assets from the currently selected wallet'
   : queuedSessions.length > 0 && assets.length === 0
   ? 'Queued assets from your saved wallets'
   : 'Review all assets across your connected wallets'}
 </p>
 {loading ? (
 <div className="text-center py-12">
 <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 <p className="mt-4 text-gray-300 font-semibold">Loading assets, be patient...</p>
 <p className="mt-2 text-sm text-gray-400">This may take a few seconds as we fetch data from the blockchain</p>
 </div>
 ) : assets.length === 0 && queuedSessions.length === 0 ? (
 <div className="text-center py-16 bg-white/5 backdrop-blur-xl/5 backdrop-blur-xl rounded-lg border-2 border-dashed border-white/10">
   <div className="max-w-md mx-auto">
     <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
       <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
       </svg>
     </div>
     <h3 className="text-xl font-bold text-white mb-2">No Assets Loaded Yet</h3>
     <p className="text-gray-300 mb-6">
       Connect your wallets and load assets to get started. You can connect multiple wallets and load assets from each one.
     </p>
     <button
       onClick={() => setStep('connect')}
       className="inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-700 hover:to-blue-700 transition-colors shadow-lg"
     >
       ← Go to Connect Wallets
     </button>
   </div>
 </div>
 ) : (
 <>
 {/* Show queued assets message */}
 {assets.length === 0 && queuedSessions.length > 0 && (
   <div className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
     <p className="text-sm font-semibold text-green-900 mb-1">
       ✓ Showing Queued Assets ({queuedSessions.flatMap(s => s.assets).length} total from {queuedSessions.length} wallet{queuedSessions.length !== 1 ? 's' : ''})
     </p>
     <p className="text-xs text-green-700">
       These assets are from wallets you've already saved to the queue. You can select them to modify allocations or add more assets from additional wallets.
     </p>
   </div>
 )}
 {/* Show which wallet's assets are being displayed */}
 {(selectedWalletForLoading || btcAddress) && assets.length > 0 && (
   <div className="mb-4 p-4 bg-blue-500/10 backdrop-blur-xl border border-blue-500/30 rounded-lg">
     <p className="text-sm font-semibold text-blue-900 mb-1">
       Currently Viewing Assets From:
     </p>
     {selectedWalletForLoading && (
       <div>
         <p className="text-sm font-bold text-blue-900 mb-1">
           {walletNames[selectedWalletForLoading] || resolvedEnsNames[selectedWalletForLoading.toLowerCase()] || selectedWalletForLoading.slice(0, 10) + '...' + selectedWalletForLoading.slice(-8)}
         </p>
       <p className="text-xs text-blue-300 font-mono break-all">
           {selectedWalletForLoading}
         {walletProviders[selectedWalletForLoading] && (
           <span className="ml-2 text-blue-600">({walletProviders[selectedWalletForLoading]})</span>
         )}
       </p>
       </div>
     )}
     {btcAddress && (
       <div>
         <p className="text-sm font-bold text-blue-900 mb-1">
           {walletNames[btcAddress] || resolvedEnsNames[btcAddress.toLowerCase()] || btcAddress.slice(0, 10) + '...' + btcAddress.slice(-8)}
         </p>
         <p className="text-xs text-blue-300 font-mono break-all">
           {btcAddress}
           {walletProviders[btcAddress] && (
             <span className="ml-2 text-blue-600">({walletProviders[btcAddress]})</span>
           )}
           {!walletProviders[btcAddress] && (
             <span className="ml-2 text-blue-600">(Bitcoin Wallet)</span>
           )}
         </p>
       </div>
     )}
   </div>
 )}
<div className="mb-4 flex items-center justify-between">
  <h3 className="text-xl font-bold text-white">Select Assets</h3>
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={hideSpamTokens}
      onChange={(e) => setHideSpamTokens(e.target.checked)}
      className="w-4 h-4 text-blue-600 border-white/10 rounded focus:ring-blue-500"
    />
    <span className="text-sm text-gray-300 font-semibold">Hide Spam/Dust Tokens</span>
  </label>
</div>
<AssetSelector
      walletNames={walletNames}
      resolvedEnsNames={resolvedEnsNames}
assets={(() => {
  // If no current assets but we have queued sessions, show queued assets
  let assetsToShow = assets.length > 0 ? assets : queuedSessions.flatMap(s => s.assets)
  
  const ethscriptionCountBefore = assetsToShow.filter(a => a.type === 'ethscription').length
  console.log(`[Assets Step] Assets to show: ${assetsToShow.length} total, ${ethscriptionCountBefore} ethscriptions`)
  
  let filtered = assetsToShow
  if (selectedWalletForLoading) {
    const selectedWalletLower = selectedWalletForLoading.toLowerCase()
    
    // Also check resolved ENS names
    let selectedWalletResolved: string | null = null
    if (selectedWalletForLoading.endsWith('.eth')) {
      // Try to find the resolved address for this ENS name
      const resolved = Object.entries(resolvedEnsNames).find(
        ([addr, ens]) => ens?.toLowerCase() === selectedWalletLower
      )?.[0]
      if (resolved) {
        selectedWalletResolved = resolved.toLowerCase()
        console.log(`[Assets Step] Resolved ENS ${selectedWalletForLoading} to ${selectedWalletResolved}`)
      }
    }
    
    filtered = assetsToShow.filter(a => {
      if (a.type === 'ethscription') {
        // For ethscriptions, be more lenient - check walletAddress, creator, and currentOwner
        const assetWalletLower = a.walletAddress?.toLowerCase()
        const creator = a.metadata?.creator?.toLowerCase()
        const currentOwner = a.metadata?.currentOwner?.toLowerCase()
        
        const matches = assetWalletLower === selectedWalletLower ||
                       assetWalletLower === selectedWalletResolved ||
                       creator === selectedWalletLower ||
                       creator === selectedWalletResolved ||
                       currentOwner === selectedWalletLower ||
                       currentOwner === selectedWalletResolved
        
        if (!matches) {
          console.log(`[Assets Step] Ethscription filtered out:`, {
            id: a.id,
            walletAddress: a.walletAddress,
            creator,
            currentOwner,
            selectedWallet: selectedWalletForLoading,
            selectedWalletResolved
          })
        }
        return matches
      } else {
        // For other assets, use normal matching
        const assetWalletLower = a.walletAddress?.toLowerCase()
        return assetWalletLower === selectedWalletLower || 
               assetWalletLower === selectedWalletResolved
      }
    })
    const ethscriptionCountAfter = filtered.filter(a => a.type === 'ethscription').length
    console.log(`[Assets Step] After wallet filter (${selectedWalletForLoading}): ${filtered.length} total, ${ethscriptionCountAfter} ethscriptions`)
    if (ethscriptionCountBefore > 0 && ethscriptionCountAfter === 0) {
      console.warn(`[Assets Step] ⚠️ All ${ethscriptionCountBefore} ethscriptions were filtered out by wallet filter!`)
      const sampleEthscription = assetsToShow.find(a => a.type === 'ethscription')
      console.log(`[Assets Step] Sample ethscription:`, {
        walletAddress: sampleEthscription?.walletAddress,
        creator: sampleEthscription?.metadata?.creator,
        currentOwner: sampleEthscription?.metadata?.currentOwner
      })
      console.log(`[Assets Step] Selected wallet: ${selectedWalletForLoading}, Resolved: ${selectedWalletResolved}`)
    }
  } else if (btcAddress) {
    // Filter Bitcoin assets - include ordinals from ordinals address too
    filtered = assetsToShow.filter(a => {
      if (a.chain !== 'bitcoin') return false
      // For ordinals, check both payment address and ordinals address
      if (a.type === 'ordinal') {
        // Ordinals can be in either the payment address or ordinals address
        return a.walletAddress === btcAddress || 
               a.contractAddress === btcAddress ||
               (btcOrdinalsAddress && (a.walletAddress === btcOrdinalsAddress || a.contractAddress === btcOrdinalsAddress))
      }
      // For other Bitcoin assets, check payment address
      return a.walletAddress === btcAddress || a.contractAddress === btcAddress
    })
    const ordinalsInAll = assetsToShow.filter(a => a.type === 'ordinal').length
    const ordinalsInFiltered = filtered.filter(a => a.type === 'ordinal').length
    console.log('[Assets Step] Filtering Bitcoin assets:', {
      btcAddress,
      btcOrdinalsAddress,
      allAssets: assetsToShow.length,
      bitcoinAssets: assetsToShow.filter(a => a.chain === 'bitcoin').length,
      ordinalsInAll: ordinalsInAll,
      filtered: filtered.length,
      ordinalsInFiltered: ordinalsInFiltered,
      filteredAssets: filtered.map(a => ({ id: a.id, type: a.type, name: a.name, walletAddress: a.walletAddress }))
    })
    if (ordinalsInAll > 0 && ordinalsInFiltered === 0) {
      console.warn('[Assets Step] ⚠️ All ordinals were filtered out!')
      const sampleOrdinal = assetsToShow.find(a => a.type === 'ordinal')
      console.log('[Assets Step] Sample ordinal:', {
        walletAddress: sampleOrdinal?.walletAddress,
        contractAddress: sampleOrdinal?.contractAddress,
        btcAddress: btcAddress,
        btcOrdinalsAddress: btcOrdinalsAddress
      })
    }
  }
  // Apply spam filtering if enabled
  if (hideSpamTokens) {
    const beforeSpamFilter = filtered.length
    filtered = filterSpamTokens(filtered)
    const afterSpamFilter = filtered.length
    const ethscriptionCountAfterSpam = filtered.filter(a => a.type === 'ethscription').length
    console.log(`[Assets Step] After spam filter: ${beforeSpamFilter} -> ${afterSpamFilter} assets, ${ethscriptionCountAfterSpam} ethscriptions`)
  }
  return filtered
})()}
selectedAssetIds={selectedAssetIds}
onSelectionChange={setSelectedAssetIds}
/>
 <div className="mt-6 p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-xl border-2 border-blue-500/30 rounded-lg border-glow">
 <div className="flex items-start justify-between">
   <div className="flex-1">
     <p className="text-sm font-semibold text-bright mb-1">
                        Want to add assets from another wallet?
                      </p>
                      <p className="text-xs text-bright-soft">
                        You can connect multiple wallets and add assets incrementally. Your current selections will be preserved.
                      </p>
                    </div>
                    <button
                      onClick={() => setStep('connect')}
 className="ml-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors whitespace-nowrap transform hover:scale-105"
 >
 + Add More Wallets
 </button>
 </div>
 </div>
 <div className="mt-8 flex gap-4">
 <button
 onClick={() => setStep('allocate')}
 disabled={selectedAssetIds.length === 0}
 className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
 >
 Continue to Allocation ({selectedAssetIds.length} selected) →
 </button>
 </div>
 </>
 )}
 </div>
 )}

 {step === 'allocate' && (
 <div>
 <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Allocate Your Assets</h2>
 <p className="text-gray-300 mb-6">
 Assign your assets to beneficiaries. You can allocate by percentage or specific amounts.
 </p>
 
 {(() => {
   // Get all available assets (current or queued)
   const allAvailableAssets = assets.length > 0 ? assets : queuedSessions.flatMap(s => s.assets)
   const hasAssets = allAvailableAssets.length > 0
   const hasSelected = selectedAssetIds.length > 0
   
   // Show "No Assets Selected" only if there are truly no assets available
   if (!hasAssets) {
     return (
       <div className="text-center py-16 bg-white/5 backdrop-blur-xl/5 backdrop-blur-xl rounded-lg border-2 border-dashed border-white/10">
         <div className="max-w-md mx-auto">
           <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
           </div>
           <h3 className="text-xl font-bold text-white mb-2">No Assets Available</h3>
           <p className="text-gray-300 mb-6">
             Go back to the Assets step to load and select assets for allocation.
           </p>
           <button
             onClick={() => setStep('assets')}
             className="inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-700 hover:to-blue-700 transition-colors shadow-lg"
           >
             ← Go to Assets
           </button>
         </div>
       </div>
     )
   }
   
   // If we have assets but none selected, show message with option to select all
   if (!hasSelected) {
     return (
       <div className="text-center py-16 bg-white/5 backdrop-blur-xl/5 backdrop-blur-xl rounded-lg border-2 border-dashed border-white/10">
         <div className="max-w-md mx-auto">
           <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
           </div>
           <h3 className="text-xl font-bold text-white mb-2">No Assets Selected</h3>
           <p className="text-gray-300 mb-6">
             {queuedSessions.length > 0 
               ? `You have ${allAvailableAssets.length} queued assets. Select them to allocate to beneficiaries.`
               : 'Go back to the Assets step to select which assets you want to allocate to beneficiaries.'}
           </p>
           {queuedSessions.length > 0 && (
             <button
               onClick={() => {
                 const allIds = allAvailableAssets.map(a => a.id)
                 setSelectedAssetIds(allIds)
               }}
               className="inline-flex items-center px-6 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors shadow-lg mb-3"
             >
               ✓ Select All Queued Assets ({allAvailableAssets.length})
             </button>
           )}
           <button
             onClick={() => setStep('assets')}
             className="inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-700 hover:to-blue-700 transition-colors shadow-lg"
           >
             ← Go to Assets
           </button>
         </div>
       </div>
     )
   }
   
   return null
 })()}
 
 {selectedAssetIds.length > 0 && (
   <div className="space-y-6">
     {/* Beneficiaries Section - Horizontal Form at Top, Cards Below */}
     <div className="bg-white/5 backdrop-blur-xl rounded-lg border-2 border-white/10 p-4">
       <h3 className="font-bold text-lg text-white mb-4">Beneficiaries ({beneficiaries.length})</h3>
       
       {/* Horizontal Add Beneficiary Form */}
       <div className="mb-4">
         <BeneficiaryForm
           beneficiaries={beneficiaries}
           onBeneficiariesChange={setBeneficiaries}
         />
       </div>
       
       {/* Beneficiary Cards Grid */}
       {beneficiaries.length > 0 ? (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
           {beneficiaries.map((ben) => {
             const beneficiaryAllocations = allocations.filter(a => a.beneficiaryId === ben.id)
             return (
               <div key={ben.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3 relative">
                 <div className="flex items-start justify-between mb-2">
                   <span className="text-sm font-semibold text-white">{ben.name}</span>
                   <div className="flex gap-1">
                     <button
                       onClick={() => {
                         // Populate form fields with beneficiary data for editing
                         const form = document.querySelector('form') || document.querySelector('.space-y-3')
                         if (form) {
                           const inputs = form.querySelectorAll('input')
                           const nameInput = Array.from(inputs).find((el: any) => el.placeholder === 'John Doe') as HTMLInputElement
                           const walletInput = Array.from(inputs).find((el: any) => el.placeholder === '0x... or name.eth') as HTMLInputElement
                           const phoneInput = Array.from(inputs).find((el: any) => el.placeholder === '+1 (555) 123-4567') as HTMLInputElement
                           const emailInput = Array.from(inputs).find((el: any) => el.placeholder === 'john@example.com') as HTMLInputElement
                           const notesInput = Array.from(inputs).find((el: any) => el.placeholder === 'Additional info to find them') as HTMLInputElement
                           
                           if (nameInput) { nameInput.value = ben.name; nameInput.dispatchEvent(new Event('input', { bubbles: true })) }
                           if (walletInput) { walletInput.value = ben.ensName || ben.walletAddress; walletInput.dispatchEvent(new Event('input', { bubbles: true })) }
                           if (phoneInput) { phoneInput.value = ben.phone || ''; phoneInput.dispatchEvent(new Event('input', { bubbles: true })) }
                           if (emailInput) { emailInput.value = ben.email || ''; emailInput.dispatchEvent(new Event('input', { bubbles: true })) }
                           if (notesInput) { notesInput.value = ben.notes || ''; notesInput.dispatchEvent(new Event('input', { bubbles: true })) }
                           
                           // Remove this beneficiary (will be re-added when saved)
                           setBeneficiaries(beneficiaries.filter((b) => b.id !== ben.id))
                           
                           // Scroll to form and focus - use requestAnimationFrame to prevent blocking
                           requestAnimationFrame(() => {
                             setTimeout(() => {
                           nameInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                           setTimeout(() => nameInput?.focus(), 300)
                             }, 100)
                           })
                         }
                       }}
                       className="text-blue-600 hover:text-blue-300 text-xs font-semibold px-1"
                       title="Edit beneficiary"
                     >
                       ✏️
                     </button>
                   <button
                     onClick={() => setBeneficiaries(beneficiaries.filter(b => b.id !== ben.id))}
                     className="text-red-600 hover:text-red-700 text-xs font-semibold"
                       title="Remove beneficiary"
                   >
                     ×
                   </button>
                   </div>
                 </div>
                 {ben.ensName && ben.ensName !== ben.walletAddress && (
                   <div className="mb-1">
                     <p className="text-xs text-green-600 font-semibold">
                       <span className="mr-1">✓</span>
                       {ben.ensName}
                     </p>
                     {ben.walletAddress && (
                       <p className="text-xs font-mono text-gray-400 break-all leading-tight">
                         ({ben.walletAddress})
                       </p>
                     )}
                   </div>
                 )}
                 {(!ben.ensName || ben.ensName === ben.walletAddress) && ben.walletAddress && (
                   <p className="text-xs font-mono text-gray-300 break-all leading-tight mb-1">
                     {ben.walletAddress}
                   </p>
                 )}
                 {ben.phone && (
                   <p className="text-xs text-gray-300 mb-1">📞 {ben.phone}</p>
                 )}
                 {ben.email && (
                   <p className="text-xs text-gray-300 mb-1">✉️ {ben.email}</p>
                 )}
                 {ben.notes && (
                   <p className="text-xs text-gray-400 italic mb-1">💬 {ben.notes}</p>
                 )}
                 {beneficiaryAllocations.length > 0 && (
                   <p className="text-xs text-gray-300 mt-2 pt-2 border-t border-blue-200">
                     {beneficiaryAllocations.length} allocation{beneficiaryAllocations.length !== 1 ? 's' : ''}
                   </p>
                 )}
               </div>
             )
           })}
         </div>
       ) : (
         <div className="text-center py-8 text-gray-400">
           <p className="text-sm">Add beneficiaries above to allocate assets</p>
         </div>
       )}
     </div>

     {/* Allocation Panel - Full Width */}
     {beneficiaries.length > 0 ? (
       <AllocationPanel
         assets={(() => {
           // Use queued assets if current assets are empty
           const assetsToUse = assets.length > 0 ? assets : queuedSessions.flatMap(s => s.assets)
           return assetsToUse.filter(a => selectedAssetIds.includes(a.id))
         })()}
         beneficiaries={beneficiaries}
         allocations={(() => {
           // Merge allocations from queued sessions with current allocations
           const queuedAllocations = queuedSessions.flatMap(s => s.allocations)
           // Combine and deduplicate by assetId AND beneficiaryId (fungible tokens can have multiple allocations)
           const allAllocations = [...allocations, ...queuedAllocations]
           const uniqueAllocations = allAllocations.reduce((acc, curr) => {
             // Check if this exact allocation (assetId + beneficiaryId) already exists
             const existing = acc.find(a => a.assetId === curr.assetId && a.beneficiaryId === curr.beneficiaryId)
             if (!existing) {
               acc.push(curr)
             }
             return acc
           }, [] as Allocation[])
           return uniqueAllocations
         })()}
         onAllocationChange={setAllocations}
       />
     ) : (
       <div className="bg-yellow-500/10 backdrop-blur-xl border border-yellow-500/30 rounded-lg p-6 text-center">
         <p className="text-yellow-300 font-semibold">Add at least one beneficiary above to start allocating assets</p>
       </div>
     )}
   </div>
 )}
 
 <div className="mt-6 p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-xl border-2 border-blue-500/30 rounded-lg border-glow">
   <div className="flex items-start justify-between">
     <div className="flex-1">
       <p className="text-sm font-semibold text-bright mb-1">
         Need to add more assets?
       </p>
       <p className="text-xs text-bright-soft">
         Go back to connect another wallet and add more assets to your portfolio.
       </p>
     </div>
     <button
       onClick={() => setStep('connect')}
       className="ml-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors whitespace-nowrap transform hover:scale-105"
     >
       + Add Wallet
     </button>
   </div>
 </div>
 
 <div className="mt-8 flex gap-4">
   <button
     onClick={() => setStep('assets')}
     className="flex-1 rounded-lg border-2 border-white/10 p-4 font-semibold hover:bg-white/5 backdrop-blur-xl/5 backdrop-blur-xl transition-colors"
   >
     ← Back to Assets
   </button>
  <button
    onClick={() => {
      console.log('[Save to Queue Button] Clicked')
      console.log('[Save to Queue Button] selectedAssetIds:', selectedAssetIds)
      console.log('[Save to Queue Button] allocations:', allocations)
      console.log('[Save to Queue Button] filtered allocations:', allocations.filter(a => selectedAssetIds.includes(a.assetId)))
      handleSaveToQueue()
    }}
    disabled={(() => {
      const hasSelectedAssets = selectedAssetIds.length > 0
      const hasAllocations = allocations.filter(a => selectedAssetIds.includes(a.assetId)).length > 0
      const isDisabled = !hasSelectedAssets || !hasAllocations
      if (isDisabled) {
        console.log('[Save to Queue Button] Disabled - hasSelectedAssets:', hasSelectedAssets, 'hasAllocations:', hasAllocations)
      }
      return isDisabled
    })()}
    className="flex-1 rounded-lg bg-green-600 text-white p-4 font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
  >
    ✓ Save to Queue ({queuedSessions.length}/20)
  </button>
   {queuedSessions.length > 0 && (
     <button
       onClick={() => setStep('details')}
       className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 font-semibold hover:from-purple-700 hover:to-blue-700 transition-colors shadow-lg"
     >
       Continue to Details ({queuedSessions.length} wallet{queuedSessions.length !== 1 ? 's' : ''}) →
     </button>
   )}
 </div>
 </div>
 )}

 {step === 'details' && (
 <div className="max-w-2xl mx-auto">
 <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Enter Details</h2>
 <p className="text-gray-300 mb-8">
 Provide information about yourself, your executor, and instructions for accessing your assets
 </p>
 <div className="space-y-6">
<div className="border-b pb-6">
<h3 className="text-xl font-bold text-white mb-4">Owner Information</h3>
<div className="space-y-4">
<div>
<label className="block text-sm font-semibold text-gray-300 mb-2">Full Legal Name *</label>
<input
type="text"
value={ownerFullName}
onChange={(e) => setOwnerFullName(e.target.value)}
className="w-full rounded-lg border-2 border-white/20 bg-transparent p-3 text-bright focus:border-blue-500 focus:outline-none transition-colors placeholder:text-white/70"
placeholder="John Michael Doe"
/>
</div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">ENS Address (Optional)</label>
            <input
              type="text"
              value={ownerEnsName}
              onChange={(e) => setOwnerEnsName(e.target.value)}
              className="w-full rounded-lg border-2 border-white/20 bg-transparent p-3 text-bright focus:border-blue-500 focus:outline-none transition-colors placeholder:text-white/70"
              placeholder="yourname.eth, yourname.base.eth, yourname.sol, yourname.btc"
            />
            {ownerEnsResolvedName && ownerResolvedAddress && (
              <div className="mt-2 text-sm text-green-600">
                <span className="font-semibold">✓ {ownerEnsResolvedName}</span>
                <span className="text-gray-400 ml-2 font-mono">({ownerResolvedAddress})</span>
              </div>
            )}
            {ownerEnsResolvedName && !ownerResolvedAddress && (
              <div className="mt-2 text-sm text-yellow-600">
                <span className="font-semibold">⚠ {ownerEnsResolvedName}</span>
                <span className="text-gray-400 ml-2">(Could not resolve - may be .sol, .btc, or other naming system)</span>
              </div>
            )}
            {!ownerEnsResolvedName && ownerResolvedAddress && (
              <div className="mt-2 text-sm text-gray-300 font-mono">
                {ownerResolvedAddress}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">Supports .eth, .base.eth, .sol, .btc, and other naming systems</p>
          </div>
<div>
<label className="block text-sm font-semibold text-gray-300 mb-2">Street Address *</label>
<input
type="text"
value={ownerAddress}
onChange={(e) => setOwnerAddress(e.target.value)}
className="w-full rounded-lg border-2 border-white/20 bg-transparent p-3 text-bright focus:border-blue-500 focus:outline-none transition-colors placeholder:text-white/70"
placeholder="123 Main Street"
/>
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-semibold text-gray-300 mb-2">City *</label>
<input
type="text"
value={ownerCity}
onChange={(e) => setOwnerCity(e.target.value)}
className="w-full rounded-lg border-2 border-white/20 bg-transparent p-3 text-bright focus:border-blue-500 focus:outline-none transition-colors placeholder:text-white/70"
placeholder="Nashville"
/>
</div>
<div>
<label className="block text-sm font-semibold text-gray-300 mb-2">State *</label>
<input
type="text"
value={ownerState}
onChange={(e) => setOwnerState(e.target.value)}
className="w-full rounded-lg border-2 border-white/20 bg-transparent p-3 text-bright focus:border-blue-500 focus:outline-none transition-colors placeholder:text-white/70"
placeholder="TN"
maxLength={2}
/>
</div>
</div>
<div>
<label className="block text-sm font-semibold text-gray-300 mb-2">ZIP Code *</label>
<input
type="text"
value={ownerZipCode}
onChange={(e) => setOwnerZipCode(e.target.value)}
className="w-full rounded-lg border-2 border-white/20 bg-transparent p-3 text-bright focus:border-blue-500 focus:outline-none transition-colors placeholder:text-white/70"
placeholder="37203"
/>
</div>
<div>
<label className="block text-sm font-semibold text-gray-300 mb-2">Phone Number *</label>
<input
type="tel"
value={ownerPhone}
onChange={(e) => setOwnerPhone(e.target.value)}
className="w-full rounded-lg border-2 border-white/20 bg-transparent p-3 text-bright focus:border-blue-500 focus:outline-none transition-colors placeholder:text-white/70"
placeholder="(615) 555-1234"
/>
</div>
</div>
</div>

<div className="border-b pb-6">
<h3 className="text-xl font-bold text-white mb-4">Executor Information</h3>
<div className="space-y-4">
<div>
<label className="block text-sm font-semibold text-gray-300 mb-2">Executor Full Name *</label>
{beneficiaries.length > 0 && (
<div className="mb-2">
<select
value=""
onChange={(e) => {
try {
const selectedBeneficiary = beneficiaries.find(b => b.id === e.target.value)
if (selectedBeneficiary) {
setExecutorName(selectedBeneficiary.name || '')
setExecutorAddress(selectedBeneficiary.walletAddress || '')
setExecutorPhone(selectedBeneficiary.phone || '')
setExecutorEmail(selectedBeneficiary.email || '')
}
} catch (err) {
console.error('Error selecting beneficiary:', err)
}
}}
className="w-full rounded-lg border-2 border-white/20 bg-transparent p-2 text-sm text-bright focus:border-blue-500 focus:outline-none transition-colors"
>
<option value="">Select from beneficiaries...</option>
{beneficiaries.map((ben) => (
<option key={ben.id} value={ben.id}>
{ben.name || 'Unnamed'} {ben.ensName ? `(${ben.ensName})` : ben.walletAddress ? `(${ben.walletAddress.slice(0, 6)}...${ben.walletAddress.slice(-4)})` : ''}
</option>
))}
</select>
</div>
)}
<input
type="text"
value={executorName}
onChange={(e) => setExecutorName(e.target.value)}
className="w-full rounded-lg border-2 border-white/20 bg-transparent p-3 text-bright focus:border-blue-500 focus:outline-none transition-colors placeholder:text-white/70"
placeholder="Jane Marie Doe"
/>
{beneficiaries.length > 0 && (
<p className="text-xs text-gray-400 mt-1">Select from beneficiaries above or type a name manually</p>
)}
</div>
<div>
<label className="block text-sm font-semibold text-gray-300 mb-2">Executor Wallet Address (Optional)</label>
<input
type="text"
value={executorAddress}
onChange={(e) => setExecutorAddress(e.target.value)}
className="w-full rounded-lg border-2 border-white/20 bg-transparent p-3 font-mono text-sm text-bright focus:border-blue-500 focus:outline-none transition-colors placeholder:text-white/70"
placeholder="0x... or name.eth, name.base.eth, name.sol, name.btc"
/>
 {executorEnsName && executorResolvedAddress && (
 <div className="mt-2 text-sm text-green-600">
 <span className="font-semibold">✓ {executorEnsName}</span>
 <span className="text-gray-400 ml-2 font-mono">({executorResolvedAddress})</span>
 </div>
 )}
 {executorEnsName && !executorResolvedAddress && (
 <div className="mt-2 text-sm text-yellow-600">
 <span className="font-semibold">⚠ {executorEnsName}</span>
 <span className="text-gray-400 ml-2">(Could not resolve - may be .sol, .btc, or other naming system)</span>
 </div>
 )}
 {!executorEnsName && executorResolvedAddress && (
 <div className="mt-2 text-sm text-gray-300 font-mono">
 {executorResolvedAddress}
 </div>
 )}
 <p className="text-xs text-gray-400 mt-1">Supports .eth, .base.eth, .sol, .btc, and other naming systems</p>
 </div>
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-semibold text-gray-300 mb-2">Executor Phone *</label>
<input
type="tel"
value={executorPhone}
onChange={(e) => setExecutorPhone(e.target.value)}
className="w-full rounded-lg border-2 border-white/20 bg-transparent p-3 text-bright focus:border-blue-500 focus:outline-none transition-colors placeholder:text-white/70"
placeholder="(615) 555-5678"
/>
</div>
<div>
<label className="block text-sm font-semibold text-gray-300 mb-2">Executor Email *</label>
<input
type="email"
value={executorEmail}
onChange={(e) => setExecutorEmail(e.target.value)}
className="w-full rounded-lg border-2 border-white/20 bg-transparent p-3 text-bright focus:border-blue-500 focus:outline-none transition-colors placeholder:text-white/70"
placeholder="jane@example.com"
/>
</div>
</div>
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-semibold text-gray-300 mb-2">Twitter / X (Optional)</label>
<input
type="text"
value={executorTwitter}
onChange={(e) => setExecutorTwitter(e.target.value)}
className="w-full rounded-lg border-2 border-white/20 bg-transparent p-3 text-bright focus:border-blue-500 focus:outline-none transition-colors placeholder:text-white/70"
placeholder="@username"
/>
</div>
<div>
<label className="block text-sm font-semibold text-gray-300 mb-2">LinkedIn (Optional)</label>
<input
type="text"
value={executorLinkedIn}
onChange={(e) => setExecutorLinkedIn(e.target.value)}
className="w-full rounded-lg border-2 border-white/20 bg-transparent p-3 text-bright focus:border-blue-500 focus:outline-none transition-colors placeholder:text-white/70"
placeholder="linkedin.com/in/username"
/>
</div>
</div>
 </div>
 </div>

 <div>
 <label className="block text-sm font-semibold text-gray-300 mb-2">
 Instructions for Executor *
 </label>
 <p className="text-xs text-gray-400 mb-2">
 These instructions are for your executor, who should already be aware of this document and know where to find it. Provide clear instructions for locating keys, seed phrases, or accessing wallets.
 </p>
<textarea
value={keyInstructions}
onChange={(e) => setKeyInstructions(e.target.value)}
className="w-full rounded-lg border-2 border-white/20 bg-transparent p-3 h-40 text-bright focus:border-blue-500 focus:outline-none transition-colors resize-none placeholder:text-white/70"
placeholder="Example: The seed phrase is stored in a safety deposit box at First National Bank, box #123. The key is with my attorney, John Smith, at 456 Legal Ave. The hardware wallet is in my home safe, combination is also in that box."
/>
</div>
 </div>
 
 {/* Show validation errors if button is disabled */}
 {!canProceedToPayment() && (
 <div className="mt-6 p-4 bg-yellow-500/10 backdrop-blur-xl border border-yellow-500/30 rounded-lg">
 <p className="text-sm font-semibold text-yellow-900 mb-2">
 ⚠️ Please complete the following to unlock PDF generation:
 </p>
 <ul className="text-sm text-yellow-300 list-disc list-inside space-y-1">
 {getPaymentValidationErrors().filter(err => !err.includes('Tier limit')).map((error, index) => (
 <li key={index}>{error}</li>
 ))}
 </ul>
 </div>
 )}
{getPaymentValidationErrors().some(err => err.includes('Tier limit')) && (
<div className="mt-6 p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-xl border-2 border-blue-500/30 rounded-lg border-glow">
<p className="text-sm font-semibold text-bright mb-2">
💡 Tier Limit Notice:
</p>
<p className="text-sm text-bright-soft mb-2">
Your current setup exceeds the selected tier limits. You can:
</p>
<ul className="text-sm text-bright-soft list-disc list-inside space-y-1 ml-4">
<li>Select a higher tier (Standard or Premium) on the Payment step</li>
<li>Use a discount code to bypass limits</li>
<li>Reduce wallets/beneficiaries to fit your selected tier</li>
</ul>
</div>
)}
 
 <div className="mt-8 flex gap-4">
 <button
 onClick={() => setStep('allocate')}
 className="flex-1 rounded-lg border-2 border-white/10 p-4 font-semibold hover:bg-white/5 backdrop-blur-xl/5 backdrop-blur-xl transition-colors"
 >
 ← Back
 </button>
 <button
 onClick={handleCreateInvoice}
 disabled={!canProceedToPayment()}
 className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 font-semibold hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
 title={!canProceedToPayment() ? `Missing: ${getPaymentValidationErrors().filter(err => !err.includes('Tier limit')).join(', ')}` : 'Continue to select your plan and payment'}
 >
              Continue to Payment →
 </button>
 </div>
 </div>
 )}

 {step === 'payment' && !invoiceId && !discountApplied && (
<div className="max-w-2xl mx-auto">
<h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Payment</h2>
<p className="text-gray-300 mb-6">
{selectedTier === 'free' ? (
'Free tier selected - no payment required'
) : (
`Selected plan: ${selectedTier === 'standard' ? 'Standard' : 'Premium'} - $${pricing.usdAmount.toFixed(2)}`
)}
</p>

{!canProceedToPayment() && !discountApplied && (
<div className="bg-red-500/20 backdrop-blur-xl border-2 border-red-500/30 rounded-lg p-4 mb-6 border-glow">
<p className="text-red-300 font-semibold mb-2">⚠️ Please complete the following:</p>
<ul className="list-disc list-inside space-y-1 text-bright text-sm">
{getPaymentValidationErrors().map((error, index) => (
<li key={index}>{error}</li>
))}
</ul>
</div>
)}

{discountApplied && (
<div className="bg-green-500/20 backdrop-blur-xl border-2 border-green-500/30 rounded-lg p-4 mb-6 border-glow">
<p className="text-green-300 font-semibold mb-2">✓ Discount Code Applied!</p>
<p className="text-green-300 text-sm">Tier limits bypassed - you have unlimited access with the discount code.</p>
</div>
)}

<div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-xl border-2 border-purple-500/30 rounded-lg p-6 mb-6 border-glow">
<label className="block text-sm font-semibold text-bright mb-3">
Discount Code (Optional)
</label>
<div className="flex gap-2 mb-3">
<input
type="text"
value={discountCode}
onChange={(e) => {
setDiscountCode(e.target.value)
setError(null)
}}
onBlur={handleDiscountCode}
className="flex-1 rounded-lg border-2 border-white/20 bg-white/5 backdrop-blur-xl p-3 text-bright focus:border-blue-500 focus:outline-none transition-colors uppercase placeholder:text-gray-500"
placeholder="Enter discount code"
/>
<button
onClick={handleDiscountCode}
className="px-6 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-700 hover:to-blue-700 transition-colors transform hover:scale-105 border-2 border-purple-400/50"
>
Apply
</button>
</div>
{discountApplied && (
<div className="mt-2">
<p className="text-sm text-green-400 font-semibold mb-1">✓ Discount applied! 100% off - Tier limits bypassed</p>
<p className="text-xs text-green-300">Redirecting to download...</p>
</div>
)}
</div>

<div className="flex gap-4">
 <button
 onClick={() => setStep('details')}
className="flex-1 rounded-lg border-2 border-white/10 p-4 font-semibold hover:bg-white/5 backdrop-blur-xl/5 backdrop-blur-xl transition-colors"
>
← Back
</button>
<button
onClick={async () => {
if (selectedTier === 'free') {
setPaymentVerified(true)
setStep('download')
} else {
try {
const response = await axios.post('/api/invoice/create', {
tier: selectedTier,
discountCode: discountCode.trim() || undefined,
})
setInvoiceId(response.data.invoice.id)
setDiscountApplied(response.data.discountApplied)
if (response.data.discountApplied) {
setPaymentVerified(true)
setStep('download')
}
} catch (error: any) {
setError(error?.response?.data?.error || 'Failed to create invoice')
}
}
}}
disabled={(!canProceedToPayment() && !discountApplied) || (selectedTier === 'standard' && pricing.usdAmount === 0) || (selectedTier === 'premium' && pricing.usdAmount === 0)}
className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 font-semibold hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
 >
{selectedTier === 'free' ? (
'Continue to Download (Free)'
) : selectedTier === 'standard' && pricing.isSpecial ? (
<span className="inline-flex items-center gap-2">
<span>Pay ${pricing.usdAmount.toFixed(2)}</span>
<span className="line-through text-sm">${pricing.regularPrice?.toFixed(2)}</span>
</span>
) : (
`Pay $${pricing.usdAmount.toFixed(2)}`
)}
 </button>
 </div>
 </div>
 )}

 {step === 'payment' && invoiceId && (
 <div className="max-w-2xl mx-auto">
 <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Payment Required</h2>
 <p className="text-gray-300 mb-8">
                {pricing.isSpecial ? (
                  <span className="inline-flex items-center gap-3 text-lg flex-wrap">
                    <span className="text-green-600 font-bold text-3xl animate-pulse">🎉 $20.26</span>
                    <span className="line-through text-gray-400 text-2xl">$42.00</span>
                    <span className="text-green-600 font-bold">✨ New Year 2026 Special! ✨</span>
                  </span>
                ) : (
                  `Pay ${paymentAmountETH} ETH ($${pricing.usdAmount.toFixed(2)}) to unlock PDF generation`
                )}
 </p>
<div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-xl rounded-lg p-8 border-2 border-blue-500/30 border-glow">
<div className="space-y-4">
<div className={`rounded-lg p-6 ${pricing.isSpecial ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 shadow-lg border-glow' : 'bg-white/5 backdrop-blur-xl border-2 border-white/20'}`}>
<p className="text-sm text-bright-soft mb-2 font-semibold">Payment Amount</p>
                    {pricing.isSpecial ? (
                      <div className="space-y-3">
                        <div className="flex items-baseline gap-4">
                          <p className="text-5xl font-bold text-green-400 animate-pulse text-glow">
                            🎉 $20.26
                          </p>
                          <p className="text-3xl line-through text-gray-400">$42.00</p>
                        </div>
                        <p className="text-xl text-green-400 font-bold text-glow">
                          ✨ New Year 2026 Special - Save $21.74! ✨
                        </p>
                        <p className="text-base text-bright-soft font-semibold">
                          ({paymentAmountETH} ETH) • Regular price $42.00 returns February 1st
                        </p>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-bright">
                        ${pricing.usdAmount.toFixed(2)} ({paymentAmountETH} ETH)
                      </p>
                    )}
                  </div>
<div className="bg-white/5 backdrop-blur-xl border-2 border-white/20 rounded-lg p-4 border-glow-hover">
<p className="text-sm text-bright-soft mb-1">Token</p>
                    <p className="text-lg font-semibold text-bright">Native ETH on Ethereum Mainnet</p>
</div>
<div className="bg-white/5 backdrop-blur-xl border-2 border-white/20 rounded-lg p-4 border-glow-hover">
<p className="text-sm text-bright-soft mb-1">Recipient</p>
<p className="text-lg font-mono text-bright break-all">lastwish.eth</p>
</div>
{isConnected && chain?.id === mainnet.id && paymentRecipientAddress && (
<div className="bg-green-500/20 backdrop-blur-xl border-2 border-green-500/30 rounded-lg p-4 border-glow">
<p className="text-sm text-green-300">
                <strong>✓ Ready to Pay:</strong> Click "Send Payment" below to send {paymentAmountETH} ETH (${pricing.usdAmount.toFixed(2)}) directly from your connected wallet. No need to leave this page!
</p>
</div>
)}
{!isConnected && (
<div className="bg-red-500/20 backdrop-blur-xl border-2 border-red-500/30 rounded-lg p-4 border-glow">
<p className="text-sm text-red-300">
<strong>Connect Wallet Required:</strong> Please connect your wallet to send payment directly from this page.
</p>
</div>
)}
{isConnected && chain?.id !== mainnet.id && (
<div className="bg-orange-500/20 backdrop-blur-xl border-2 border-orange-500/30 rounded-lg p-4 border-glow">
<p className="text-sm text-orange-300">
<strong>Wrong Network:</strong> Please switch to Ethereum Mainnet to send payment.
</p>
</div>
)}
{isSendingPayment && (
<div className="bg-blue-500/20 backdrop-blur-xl border-2 border-blue-500/30 rounded-lg p-4 border-glow">
<p className="text-sm text-blue-300">
<strong>Sending Payment...</strong> Please confirm the transaction in your wallet.
</p>
</div>
)}
{isConfirming && (
<div className="bg-yellow-500/20 backdrop-blur-xl border-2 border-yellow-500/30 rounded-lg p-4 border-glow">
<p className="text-sm text-yellow-300">
<strong>Transaction Pending...</strong> Waiting for confirmation. This may take a few moments.
</p>
</div>
)}
{isPaymentSent && (
<div className="bg-green-500/20 backdrop-blur-xl border-2 border-green-500/30 rounded-lg p-4 border-glow">
<p className="text-sm text-green-300">
<strong>✓ Payment Sent!</strong> Transaction confirmed. Verifying payment...
</p>
</div>
)}
 {sendError && (() => {
   // Check if this is a user rejection (cancellation)
   const errorMessage = sendError.message || ''
   const isUserRejection = errorMessage.includes('User rejected') || 
                          errorMessage.includes('User denied') ||
                          errorMessage.includes('rejected') ||
                          errorMessage.includes('denied transaction signature')
   
   if (isUserRejection) {
     // User cancelled - show simple message, no troubleshooting
     return (
       <div className="bg-yellow-500/20 backdrop-blur-xl border-2 border-yellow-500/30 rounded-lg p-4 border-glow">
         <p className="text-sm text-yellow-300">
           <strong>Transaction Cancelled:</strong> You cancelled the transaction. Click the button below to try again.
         </p>
       </div>
     )
   }
   
   // Other errors - show troubleshooting
   return (
     <div className="bg-red-50 border border-red-200 rounded-lg p-4">
       <p className="text-sm text-red-800 mb-2">
         <strong>Transaction Error:</strong> {sendError.message || 'Failed to send payment'}
       </p>
       <p className="text-xs text-red-700">
         If you're seeing a gas error but have enough ETH, the issue might be gas estimation. Try:
         <ul className="list-disc list-inside mt-1 space-y-1">
           <li>Make sure you're on Ethereum Mainnet (not a testnet)</li>
           <li>Try refreshing the page and reconnecting your wallet</li>
           <li>If using WalletConnect, try disconnecting and reconnecting via QR code</li>
           <li>Your wallet should show the actual gas cost - you can adjust it there</li>
         </ul>
       </p>
     </div>
   )
 })()}
 </div>
 </div>
 <div className="mt-6 flex flex-col gap-4">
 {isConnected && chain?.id === mainnet.id && paymentRecipientAddress ? (
 <button
 onClick={async () => {
 if (!paymentRecipientAddress) {
 setError('Payment address not resolved. Please wait a moment.')
 return
 }
 try {
 // Clear any previous errors
 setError(null)
 
 // Send transaction with manual gas limit to avoid estimation issues
 // Simple ETH transfer needs ~21,000 gas, we'll use 50,000 to be safe
 // Wallet can still override this if needed
 // Send transaction - let wallet handle gas estimation completely
 // Don't specify gas limit - wallet will estimate and show user options
 sendTransaction({
 to: paymentRecipientAddress,
            value: parseEther(paymentAmountETH),
 // No gas limit specified - wallet handles everything
 })
 } catch (error: any) {
 console.error('Error sending payment:', error)
 // Don't set error here - wagmi's sendError will handle it
 // This catch is mainly for unexpected errors
 }
 }}
 disabled={isSendingPayment || isConfirming || !paymentRecipientAddress}
 className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 font-semibold hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 shadow-lg"
 >
              {isSendingPayment ? 'Confirm in Wallet...' : isConfirming ? 'Confirming Transaction...' : `💳 Send Payment (${paymentAmountETH} ETH)`}
 </button>
 ) : !isConnected ? (
 <div className="bg-white/5 backdrop-blur-xl/5 backdrop-blur-xl border-2 border-white/10 rounded-lg p-4 text-center space-y-3">
 <p className="text-sm text-gray-300 mb-2">Connect your wallet to send payment directly from this page</p>
 <div className="flex gap-2 justify-center">
 <button
 onClick={async () => {
 // Open WalletConnect QR code directly
 const walletConnectConnector = connectors?.find(c => c.name === 'WalletConnect')
 if (walletConnectConnector) {
 try {
 await connect({ connector: walletConnectConnector })
 } catch (error: any) {
 // Silently handle user rejection
 if (error?.message?.includes('rejected') || error?.message?.includes('User rejected')) {
 return
 }
 console.error('Error connecting:', error)
 }
 } else {
 // Fallback to connect step if WalletConnect not available
 setStep('connect')
 }
 }}
 className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors"
 >
 Open WalletConnect QR
 </button>
 <button
 onClick={() => setStep('connect')}
 className="px-4 py-2 bg-gray-600 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
 >
 Other Options
 </button>
 </div>
 </div>
 ) : chain?.id !== mainnet.id ? (
 <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 text-center">
 <p className="text-sm text-orange-800 mb-2">Please switch to Ethereum Mainnet to send payment</p>
 </div>
 ) : null}
 <div className="flex gap-4">
              <button
              onClick={async () => {
                // Use payment wallet address (first verified wallet) if available, otherwise fall back to connected wallet
                const walletToUse = paymentWalletAddress || evmAddress
                if (!walletToUse || (!isConnected && !paymentWalletAddress)) {
                  setError('Please connect the wallet you used to send the payment. You must be logged in with the wallet that sent the ETH.')
                  return
                }
                
                setVerifyingPayment(true)
                setError(null)
                try {
                  const response = await axios.post('/api/invoice/status', {
                    invoiceId,
                    fromAddress: walletToUse, // Use the payment wallet (first verified wallet)
                  })
                  if (response.data.status === 'paid') {
                    setPaymentVerified(true)
                    setStep('download')
                    setError(null)
                    // Show success message
                    console.log('Payment verified!', {
                      transactionHash: response.data.transactionHash,
                      amount: response.data.amount,
                      blockNumber: response.data.blockNumber,
                    })
                  } else {
                    setError(response.data.message || 'Payment not yet confirmed. Make sure you sent the payment from the connected wallet and wait a moment for confirmation.')
                  }
                } catch (error: any) {
                  console.error('Error checking payment:', error)
                  setError(error?.response?.data?.error || 'Failed to verify payment. Make sure you are connected with the wallet you used to send the payment.')
                } finally {
                  setVerifyingPayment(false)
                }
              }}
              disabled={verifyingPayment || (!isConnected && !paymentWalletAddress)}
              className="flex-1 rounded-lg bg-green-600 text-white p-4 font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 shadow-lg"
            >
              {verifyingPayment ? 'Verifying...' : (!paymentWalletAddress && !isConnected ? 'Connect Wallet First' : 'Verify Payment')}
            </button>
            {isPaymentSent && sendTxHash && !paymentVerified && (
              <button
                onClick={() => {
                  // If payment was sent and confirmed, trust wagmi and proceed
                  setPaymentVerified(true)
                  setStep('download')
                  setError(null)
                }}
                className="flex-1 rounded-lg bg-purple-600 text-white p-4 font-semibold hover:bg-purple-700 transition-colors shadow-lg"
              >
                Proceed to Download (Payment Sent)
              </button>
            )}
 <button
 onClick={() => setStep('details')}
 className="flex-1 rounded-lg border-2 border-white/10 p-4 font-semibold hover:bg-white/5 backdrop-blur-xl/5 backdrop-blur-xl transition-colors"
 >
 ← Back
 </button>
 </div>
 </div>
 </div>
 )}

{step === 'download' && (paymentVerified || discountApplied) && (() => {
  // Check tier limits before showing download button
  const tierInfo = getTierPricing(selectedTier)
  const totalWallets = queuedSessions.length
  const totalBeneficiaries = beneficiaries.length
  const exceedsWallets = !discountApplied && tierInfo.maxWallets !== null && totalWallets > tierInfo.maxWallets
  const exceedsBeneficiaries = !discountApplied && tierInfo.maxBeneficiaries !== null && totalBeneficiaries > tierInfo.maxBeneficiaries
  const canDownload = !exceedsWallets && !exceedsBeneficiaries

  if (!canDownload) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-red-900 mb-4">Tier Limit Exceeded</h2>
          <p className="text-red-800 mb-4">
            Your current setup exceeds your selected tier limits:
          </p>
          <ul className="text-red-700 list-disc list-inside space-y-2 mb-6 text-left max-w-md mx-auto">
            {exceedsWallets && (
              <li>You have {totalWallets} wallets but {selectedTier} tier only allows {tierInfo.maxWallets}</li>
            )}
            {exceedsBeneficiaries && (
              <li>You have {totalBeneficiaries} beneficiaries but {selectedTier} tier only allows {tierInfo.maxBeneficiaries}</li>
            )}
          </ul>
          <p className="text-red-700 mb-4">
            Please upgrade to a higher tier or use a discount code to proceed.
          </p>
          <button
            onClick={() => setStep('payment')}
            className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            Go to Payment to Upgrade
          </button>
        </div>
      </div>
    )
  }

  return (
 <div className="max-w-2xl mx-auto text-center">
 <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Document Ready!</h2>
 <p className="text-gray-300 mb-8">
 Your crypto inheritance instructions document is ready to download
 </p>
 <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-8 border-2 border-green-200">
 <div className="mb-6">
 <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
 <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 </div>
 <p className="text-lg font-semibold text-white mb-2">
 {discountApplied ? 'Discount Applied - FREE' : 'Payment Verified'}
 </p>
 <p className="text-sm text-gray-300">
 Your document has been generated and is ready to download
 </p>
 </div>
 <button
 onClick={handleDownloadPDF}
 disabled={generatingPDF}
 className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 font-semibold hover:from-purple-700 hover:to-blue-700 transition-colors shadow-lg mb-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
 >
 {generatingPDF ? (
 <>
 <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
 <span>Generating PDF...</span>
 </>
 ) : (
 'Download PDF'
 )}
 </button>
 {generatingPDF && (
 <p className="text-sm text-gray-300 mt-2">
 This may take a few moments as we compile your document...
 </p>
 )}
 <p className="text-xs text-gray-400">
 Print this document and have it notarized. Keep it in a safe place.
 </p>
 </div>
        </div>
  )
})()}

 {step === 'download' && !paymentVerified && !discountApplied && (
 <div className="max-w-2xl mx-auto text-center">
 <div className="bg-yellow-500/10 backdrop-blur-xl border border-yellow-500/30 rounded-lg p-8">
 <h2 className="text-2xl font-bold text-yellow-900 mb-4">Payment Required</h2>
 <p className="text-yellow-300 mb-4">
 Please complete payment or apply a discount code to download your document.
 </p>
 <button
 onClick={() => setStep('payment')}
 className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors"
 >
 Go to Payment Step
 </button>
 </div>
 </div>
 )}
      </main>
 </div>
 
      {/* Footer */}
      <Footer />
    </div>
 )
}
