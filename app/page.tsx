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
import { getUserFriendlyError } from '@/lib/errorMessages'
import { fetchWithCache, getCached, setCached } from '@/lib/requestCache'
import { clearWalletConnectionsOnLoad } from '@/lib/wallet-cleanup'

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

 // CRITICAL: Clear ALL data IMMEDIATELY on page load (complete privacy)
 // This runs the "Clear All" button function automatically on startup
 useEffect(() => {
   if (typeof window !== 'undefined') {
     console.log('[Privacy Cleanup] 🧹 Running automatic "Clear All" on startup...')
     
     // Run the same function as the "Clear All" button
     setQueuedSessions([])
     
     // Clear ALL wallet state
     setBtcAddress(null)
     setBtcOrdinalsAddress(null)
     setConnectedEVMAddresses(new Set())
     setVerifiedAddresses(new Set())
     setPaymentWalletAddress(null)
     setCurrentSessionWallet(null)
     
     // Clear connections immediately - don't wait
     clearWalletConnectionsOnLoad().catch(err => {
       console.error('[Wallet Cleanup] Error clearing on load:', err)
     })
     
     console.log('[Privacy Cleanup] ✅ Cleared all state on page load (complete privacy)')
   }
 }, [])

 // Prevent hydration mismatch
 useEffect(() => {
 setMounted(true)
 // Load persisted state from localStorage
 if (typeof window !== 'undefined') {
 try {
 const saved = localStorage.getItem('lastwish_state')
 if (saved) {
 const parsed = JSON.parse(saved)
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
 if (parsed.paymentWalletAddress) setPaymentWalletAddress(parsed.paymentWalletAddress)
 if (parsed.step) setStep(parsed.step)
 if (parsed.invoiceId) setInvoiceId(parsed.invoiceId)
 if (parsed.paymentVerified) setPaymentVerified(parsed.paymentVerified)
 if (parsed.discountCode) setDiscountCode(parsed.discountCode)
 if (parsed.discountApplied) setDiscountApplied(parsed.discountApplied)
 if (parsed.queuedSessions) setQueuedSessions(parsed.queuedSessions)
 if (parsed.selectedTier) setSelectedTier(parsed.selectedTier)
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
 ])

 // Track loaded wallet addresses to avoid duplicates
 const [loadedWallets, setLoadedWallets] = useState<Set<string>>(new Set())
 const [verifiedAddresses, setVerifiedAddresses] = useState<Set<string>>(new Set()) // Addresses that have signed
 const [pendingVerification, setPendingVerification] = useState<string | null>(null) // Address waiting for signature

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

  // Load Ethscriptions for this wallet
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
 
 // Wait for iframe to load, then trigger print (desktop only)
 iframe.onload = () => {
 setTimeout(() => {
 try {
 // On mobile, skip print dialog and just download
 // On desktop, try to print
 if (!isMobile && iframe.contentWindow) {
   iframe.contentWindow.focus()
   iframe.contentWindow.print()
 }
 } catch (e) {
 console.error('Error printing from iframe:', e)
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
 // Clean up after a short delay
 setTimeout(() => {
   if (document.body.contains(a)) {
     document.body.removeChild(a)
   }
 }, 100)
 
 // Clean up iframe and URL after printing
 setTimeout(() => {
 if (iframe.parentNode) {
 iframe.parentNode.removeChild(iframe)
 }
 URL.revokeObjectURL(url)
 }, 5000)
 
 // Reset payment state after successful PDF generation
 // This locks the document again, requiring payment/discount for next generation
// Use setTimeout to ensure PDF download completes before resetting
setTimeout(() => {
  // Clear payment state
 setPaymentVerified(false)
 setDiscountApplied(false)
 setDiscountCode('')
 setInvoiceId(null)
  
  // Clear payment state from localStorage to prevent restoration
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('lastwish_state')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Remove payment-related fields
        delete parsed.paymentVerified
        delete parsed.discountApplied
        delete parsed.discountCode
        delete parsed.invoiceId
        localStorage.setItem('lastwish_state', JSON.stringify(parsed))
      }
    } catch (err) {
      console.error('Error clearing payment state from localStorage:', err)
    }
  }
  
  // Also reset step to payment so user must pay again for another download
  setStep('payment')
}, 2000) // Wait 2 seconds to ensure download completes
 
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
 
 // Check if we have a connected wallet
 const walletAddress = evmAddress || btcAddress
 console.log('[Save to Queue] Wallet address:', walletAddress)
 if (!walletAddress) {
   console.log('[Save to Queue] ❌ No wallet connected')
   setError('No wallet connected. Please connect a wallet first.')
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
 const addressToUse = walletAddress || evmAddress || btcAddress
 const normalizedAddress = addressToUse?.toLowerCase()
 
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
   addressToUse,
   normalizedAddress,
   walletName,
   walletNames: Object.keys(walletNames),
   resolvedEnsNames: Object.keys(resolvedEnsNames),
   foundInWalletNames: normalizedAddress ? (walletNames[normalizedAddress] || (addressToUse ? walletNames[addressToUse] : undefined)) : undefined,
   foundInResolved: normalizedAddress ? resolvedEnsNames[normalizedAddress] : undefined
 })

 // Create session
 const session: QueuedWalletSession = {
 id: `${walletAddress.toLowerCase()}-${Date.now()}`,
 walletAddress: walletAddress.toLowerCase(),
 walletType: evmAddress ? 'evm' : 'btc',
 walletProvider: evmAddress ? (walletProviders[evmAddress] || 'Unknown') : 'Xverse',
 ensName: evmAddress ? (resolvedEnsNames[evmAddress.toLowerCase()] || undefined) : undefined,
 walletName: walletName || undefined, // Store custom wallet name
 assets: sessionAssets,
 allocations: sessionAllocations,
 verified: evmAddress ? verifiedAddresses.has(evmAddress) : true,
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

 return (
    <div className="min-h-screen bg-gradient-to-br from-gray-200 to-gray-300">
 <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
 {/* Header */}
 <header className="text-center mb-12">
 <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3">LastWishCrypto</h1>
    <div className="max-w-2xl mx-auto mb-6 space-y-3">
      <p className="text-base sm:text-lg text-gray-600 font-semibold">
        Do you really want to take your crypto to the grave with you by accident?
      </p>
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-700 mb-2">
          <strong>We don't ask for seed phrases or private keys, we don't even collect your email.</strong>
        </p>
        <p className="text-xs text-gray-600 mb-2">
          By using this utility nothing is permanently saved, you create a client-side document with which, you can simply print on the spot or save to your device.
        </p>
      </div>
      <p className="text-base sm:text-lg font-bold text-gray-800 mb-2">
        📋 Crypto Inheritance Instructions
      </p>
      <div className="mt-4">
        <a 
          href="/guide" 
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-blue-600 hover:text-blue-700 font-semibold text-sm underline"
        >
          📖 View Complete User Guide & Statistics →
        </a>
      </div>
    </div>
 </header>

 {/* Tier Selection - Always visible at top */}
 <div className="max-w-5xl mx-auto mb-8">
   <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
     <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">Choose Your Plan</h2>
     <p className="text-center text-gray-600 mb-6">Select a plan that fits your needs</p>
     <div className="grid md:grid-cols-3 gap-4 mb-6">
       {getAllTiers().map((tier) => {
         const isSelected = selectedTier === tier.tier
         const tierPricing = getTierPricing(tier.tier)
         
         return (
           <div
             key={tier.tier}
             onClick={() => setSelectedTier(tier.tier)}
             className={`rounded-lg border-2 p-6 cursor-pointer transition-all ${
               isSelected
                 ? tier.tier === 'free' ? 'border-green-500 bg-green-50 shadow-lg scale-105' :
                   tier.tier === 'premium' ? 'border-purple-500 bg-purple-50 shadow-lg scale-105' :
                   'border-blue-500 bg-blue-50 shadow-lg scale-105'
                 : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
             }`}
           >
             <div className="text-center mb-4">
               <h3 className={`text-xl font-bold mb-2 ${
                 tier.tier === 'free' ? 'text-green-700' :
                 tier.tier === 'premium' ? 'text-purple-700' :
                 'text-blue-700'
               }`}>
                 {tier.name}
               </h3>
               <div className="mb-3">
                 {tier.price === 0 ? (
                   <p className="text-3xl font-bold text-gray-900">Free</p>
                 ) : tierPricing.isSpecial && tier.tier === 'standard' ? (
                   <div>
                     <p className="text-3xl font-bold text-green-600">${tierPricing.usdAmount.toFixed(2)}</p>
                     <p className="text-sm line-through text-gray-400">${tierPricing.regularPrice?.toFixed(2)}</p>
                     <p className="text-xs text-green-600 font-semibold">✨ 2026 Special ✨</p>
                   </div>
                 ) : (
                   <p className="text-3xl font-bold text-gray-900">${tier.price.toFixed(2)}</p>
                 )}
               </div>
             </div>
             <ul className="space-y-2 mb-4">
               {tier.features.map((feature, idx) => (
                 <li key={idx} className="text-sm text-gray-700 flex items-start">
                   <span className="text-green-500 mr-2">✓</span>
                   <span>{feature}</span>
                 </li>
               ))}
             </ul>
             {isSelected && (
               <div className="mt-4 text-center">
                 <span className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-full">
                   ✓ Selected
                 </span>
               </div>
             )}
           </div>
         )
       })}
     </div>
     <div className="text-center">
       <button
         onClick={() => {
           if (selectedTier === 'free') {
             setStep('connect')
           } else {
             setStep('connect')
           }
         }}
         className="px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
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
       <p className="text-xs text-gray-500 mt-3">
         Payment required on Step 5. Free tier skips payment.
       </p>
     </div>
   </div>
 </div>

 {/* Progress Steps */}
 <div className="mb-4 sm:mb-8 bg-gray-100 rounded-lg shadow-sm p-2 sm:p-4">
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
     ? 'bg-blue-600 text-white shadow-lg scale-110 cursor-default'
     : isCompleted
     ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
     : (isFreeNavigationStep || canNavigate)
     ? 'bg-gray-300 text-gray-600 hover:bg-gray-400 cursor-pointer'
     : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
     ? 'text-blue-600 cursor-default'
     : isCompleted
     ? 'text-green-600 hover:text-green-700 cursor-pointer'
     : (isFreeNavigationStep || canNavigate)
     ? 'text-gray-600 hover:text-gray-800 cursor-pointer'
     : 'text-gray-400 cursor-not-allowed'
 }`}
 title={isFreeNavigationStep || canNavigate ? `Go to ${s.label}` : 'Complete previous steps first'}
 >
 {s.label}
 </button>
 </div>
 {index < steps.length - 1 && (
 <div className={`h-1 flex-1 mx-2 rounded ${
   isCompleted ? 'bg-green-500' : 'bg-gray-200'
 }`} />
 )}
 </div>
 )
 })}
 </div>
 </div>

 {/* Main Content */}
 <main className="bg-gray-100 rounded-xl shadow-xl p-4 sm:p-6 md:p-8 lg:p-12">
 {error && (() => {
   const friendly = getUserFriendlyError({ message: error })
   return (
     <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
       <p className="text-red-900 font-semibold mb-1">{friendly.title}</p>
       <p className="text-red-800 text-sm mb-2">{friendly.message}</p>
       {friendly.action && (
         <p className="text-red-700 text-xs mt-2">
           <strong>What to do:</strong> {friendly.action}
         </p>
       )}
       {friendly.details && process.env.NODE_ENV === 'development' && (
         <p className="text-red-600 text-xs mt-1 italic">{friendly.details}</p>
       )}
     </div>
   )
 })()}

 {step === 'connect' && (
 <div className="max-w-2xl mx-auto">
 <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Connect Your Wallets</h2>
 <p className="text-gray-600 mb-8">
 Connect and process up to 20 wallets. Each wallet's assets will be saved to a queue after allocation.
 </p>

 {/* Queue Status */}
 {queuedSessions.length > 0 && (
 <div className="mb-8 bg-green-50 border-2 border-green-300 rounded-lg p-6">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-xl font-bold text-gray-900">
 Queued Wallets ({queuedSessions.length}/20)
 </h3>
 {queuedSessions.length > 0 && (
 <button
 onClick={() => {
 if (confirm('Clear all queued wallets? This cannot be undone.')) {
 setQueuedSessions([])
 }
 }}
 className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
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
 console.log('[Queued Wallet Display]', {
   sessionId: session.id,
   walletAddress: session.walletAddress,
   sessionWalletName: session.walletName,
   foundWalletName: walletName,
   displayName,
   walletNames: Object.keys(walletNames),
   resolvedEnsNames: Object.keys(resolvedEnsNames)
 })
 return (
 <div key={session.id} className="bg-gray-50 rounded-lg border border-gray-300 p-4">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-2">
 <span className="text-sm font-bold text-gray-900">
 {displayName}
 </span>
 {displayName !== session.walletAddress && (
 <span className="text-xs text-gray-500 font-mono">
 ({session.walletAddress.slice(0, 10)}...{session.walletAddress.slice(-8)})
 </span>
 )}
 <span className={`px-2 py-1 rounded text-xs font-semibold ${
 session.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
 }`}>
 {session.verified ? '✓ Verified' : 'Unverified'}
 </span>
 <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
 {session.walletType.toUpperCase()}
 </span>
 </div>
 <div className="text-sm text-gray-600">
 <span className="font-semibold">{totalAssets}</span> asset{totalAssets !== 1 ? 's' : ''} • 
 <span className="font-semibold"> {totalAllocations}</span> allocation{totalAllocations !== 1 ? 's' : ''}
 </div>
 </div>
 <button
 onClick={() => handleRemoveQueuedSession(session.id)}
 className="ml-4 px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded hover:bg-red-200 transition-colors"
 >
 Remove
 </button>
 </div>
 </div>
 )
 })}
 </div>
 {queuedSessions.length > 0 && (
 <div className="mt-4 pt-4 border-t border-green-200">
 <button
 onClick={() => setStep('details')}
 disabled={queuedSessions.length === 0}
 className="w-full rounded-lg bg-blue-600 text-white p-3 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
 >
 Continue to Details ({queuedSessions.length} wallet{queuedSessions.length !== 1 ? 's' : ''} queued) →
 </button>
 </div>
 )}
 </div>
 )}

 {assets.length > 0 && (
 <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <p className="text-sm text-blue-800 font-semibold mb-1">
 {assets.length} asset{assets.length !== 1 ? 's' : ''} loaded from previous wallet{assets.length !== 1 ? 's' : ''}
 </p>
 <p className="text-xs text-blue-700">
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
 className="ml-4 px-3 py-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors whitespace-nowrap"
 >
 Clear Assets
 </button>
 </div>
 </div>
 )}
 {/* Show connected wallets with disconnect options - show ABOVE connect options */}
 {(connectedEVMAddresses.size > 0 || btcAddress) && (
 <div className="mb-6 space-y-4">
 <div className="flex items-center justify-between border-b-2 border-gray-300 pb-2">
 <h3 className="text-lg font-bold text-gray-900">
 Connected Wallets ({connectedEVMAddresses.size + (btcAddress ? 1 : 0)})
 </h3>
 <div className="flex gap-2">
 <button
 onClick={async () => {
 // Load assets from ALL verified wallets at once
 const verifiedWallets = Array.from(connectedEVMAddresses).filter(addr => verifiedAddresses.has(addr))
 if (verifiedWallets.length > 0) {
 await loadAssets(true, true) // append=true, loadFromAllWallets=true
 } else {
 setError('Please verify at least one wallet (sign message) before loading assets.')
 }
 }}
 disabled={loading || Array.from(connectedEVMAddresses).filter(addr => verifiedAddresses.has(addr)).length === 0}
 className="px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {loading ? 'Loading...' : 'Load All Wallets'}
 </button>
 <button
 onClick={() => {
 // Disconnect all wallets and clear state
 if (confirm('Disconnect all wallets and clear all data? This will remove all loaded assets and allocations.')) {
 // Clear all wallet connections
 setConnectedEVMAddresses(new Set())
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
 className="px-4 py-2 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
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
     className={`bg-white border-2 rounded-lg shadow-sm transition-all mb-3 ${
       isSelected 
       ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-300' 
       : isVerified
       ? 'border-blue-200 hover:border-blue-300 hover:shadow-md'
       : 'border-gray-200 opacity-60'
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
             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
               {walletProvider}
             </span>
             {isSelected && (
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                 ✓ Selected
               </span>
             )}
             {!isVerified && (
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                 ⚠ Verify Required
               </span>
             )}
             {walletAssetCount > 0 && (
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                 {walletAssetCount} Asset{walletAssetCount !== 1 ? 's' : ''}
               </span>
             )}
           </div>
           
           {/* Address display */}
           <div className="mt-1">
                 <p className="text-xs font-mono text-gray-500 break-all">
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
             className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
           >
             Disconnect
           </button>
           {isVerified && (
             <button
               onClick={(e) => {
                 e.stopPropagation()
                 setSelectedWalletForLoading(addr)
               }}
               className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors ${
                 isSelected
                 ? 'bg-blue-600 text-white border-blue-600'
                 : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
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
       <div className="px-4 pb-4 border-t border-gray-200 pt-3">
         <button
           onClick={async (e) => {
             e.stopPropagation()
             setSelectedWalletForLoading(addr) // Set selected wallet first
             await loadAssetsFromWallet(addr, assets.length > 0)
             setStep('assets')
           }}
           disabled={loading}
           className="w-full rounded-lg bg-blue-600 text-white p-3 sm:p-4 font-semibold hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
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
 <div className="bg-gray-50 border-2 border-orange-200 rounded-lg p-4 shadow-sm">
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
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
 BITCOIN WALLET
 </span>
 {btcAssetCount > 0 && (
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
 {btcAssetCount} Asset{btcAssetCount !== 1 ? 's' : ''} Loaded
 </span>
 )}
 </div>
 
 <div className="mt-1">
 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
 Bitcoin Address
 </p>
 <p className="text-sm font-mono text-gray-700 break-all bg-gray-50 p-2 rounded border">
 {btcAddress}
 </p>
 </div>
 
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
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
          className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg border border-orange-600 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="px-4 py-2 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors whitespace-nowrap"
        >
          Disconnect
        </button>
      </div>
 </div>
 </div>
 )
 })()}
 </div>
 )}
 
 {/* Always show wallet connect options, even when wallets are already connected */}
 <div className="mt-6">
 <h3 className="text-lg font-bold text-gray-900 mb-4 border-b-2 border-gray-300 pb-2">
 Connect Additional Wallets
 </h3>
 <p className="text-sm text-gray-600 mb-4">
 Connect more wallets to add their assets. You can connect multiple EVM wallets and Bitcoin wallets.
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
 onEvmConnect={async (addr: string, provider?: string) => {
 if (addr && !connectedEVMAddresses.has(addr)) {
 // Check wallet limit (20 wallets max including queued)
 if (connectedEVMAddresses.size + queuedSessions.length >= 20) {
 setError('Maximum 20 wallets allowed (including queued). Please disconnect a wallet or remove from queue first.')
 return
 }
 
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
 
 setConnectedEVMAddresses(prev => new Set([...prev, addr]))
 // Track wallet provider
 if (provider) {
 setWalletProviders(prev => ({ ...prev, [addr]: provider }))
 }
 
 // Resolve wallet name across all blockchain naming systems
 const resolveWalletName = async (address: string) => {
 try {
 // Try reverse lookup across all naming systems
 const resolved = await reverseResolveAddress(address)
 if (resolved) {
 setResolvedEnsNames(prev => ({ ...prev, [address.toLowerCase()]: resolved.name }))
 // If no manual name is set, use resolved name as the wallet name
 if (!walletNames[address]) {
 setWalletNames(prev => ({ ...prev, [address]: resolved.name }))
 }
 console.log(`Resolved ${resolved.resolver} name for wallet ${address}: ${resolved.name}`)
 }
 } catch (error) {
 console.error(`Error resolving name for wallet ${address}:`, error)
 }
 }
 
 // Resolve name in background (don't block)
 resolveWalletName(addr)
 
 // Set as selected if it's the first wallet or no wallet is selected
 if (selectedWalletForLoading === null) {
 setSelectedWalletForLoading(addr)
 }
 // Request signature to verify ownership
 if (!verifiedAddresses.has(addr)) {
 const verified = await verifyWalletOwnership(addr)
 // If verified and no wallet is selected, select this one
 if (verified && selectedWalletForLoading === null) {
 setSelectedWalletForLoading(addr)
 }
 }
 }
 }}
 />
 </div>
 
 {/* Show verification status */}
 {isConnected && evmAddress && !verifiedAddresses.has(evmAddress) && (
 <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
 <p className="text-sm font-semibold text-yellow-800 mb-2">
 🔒 Wallet Verification Required
 </p>
 <p className="text-xs text-yellow-700 mb-3">
 To protect your security, we need to verify you own this wallet by signing a message. This proves you control the wallet and prevents unauthorized access.
 </p>
 {pendingVerification === evmAddress ? (
 <p className="text-xs text-yellow-600">
 ⏳ Waiting for signature in your wallet...
 </p>
 ) : (
 <button
 onClick={() => verifyWalletOwnership(evmAddress)}
 className="w-full rounded-lg bg-yellow-600 text-white p-3 font-semibold hover:bg-yellow-700 transition-all"
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
 className="w-full rounded-lg bg-blue-600 text-white p-3 sm:p-4 font-semibold hover:bg-blue-700 transition-colors shadow-lg touch-manipulation min-h-[44px]"
 >
 {assets.length > 0 ? 'Add Assets from Selected Wallet' : 'Load Assets from Selected Wallet →'}
 </button>
 {connectedEVMAddresses.size > 1 && Array.from(connectedEVMAddresses).filter(addr => verifiedAddresses.has(addr)).length > 1 && (
 <button
 onClick={async () => {
 await loadAssets(assets.length > 0, true) // Append if we already have assets, load from ALL verified wallets
 setStep('assets')
 }}
 className="w-full rounded-lg bg-green-600 text-white p-3 sm:p-4 font-semibold hover:bg-green-700 transition-colors shadow-lg touch-manipulation min-h-[44px]"
 >
 Load Assets from ALL Verified Wallets ({Array.from(connectedEVMAddresses).filter(addr => verifiedAddresses.has(addr)).length}) →
 </button>
 )}
 {assets.length > 0 && (
 <button
 onClick={() => setStep('assets')}
 className="w-full rounded-lg border-2 border-gray-300 bg-white p-3 sm:p-4 font-semibold text-gray-900 hover:bg-gray-50 transition-colors touch-manipulation min-h-[44px]"
 >
 Continue with Current Assets ({assets.length}) →
 </button>
 )}
 <div className="mt-4 text-center">
 <p className="text-sm text-gray-600">
 💡 You can connect multiple wallets. Load assets from each wallet individually, or load from all verified wallets at once.
 </p>
 </div>
 </div>
 )}
 </div>
 )}

 {step === 'assets' && (
 <div>
 <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Your Assets</h2>
 <p className="text-gray-600 mb-8">
 {selectedWalletForLoading || btcAddress 
   ? 'Assets from the currently selected wallet'
   : queuedSessions.length > 0 && assets.length === 0
   ? 'Queued assets from your saved wallets'
   : 'Review all assets across your connected wallets'}
 </p>
 {loading ? (
 <div className="text-center py-12">
 <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 <p className="mt-4 text-gray-600 font-semibold">Loading assets, be patient...</p>
 <p className="mt-2 text-sm text-gray-500">This may take a few seconds as we fetch data from the blockchain</p>
 </div>
 ) : assets.length === 0 && queuedSessions.length === 0 ? (
 <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
   <div className="max-w-md mx-auto">
     <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
       <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
       </svg>
     </div>
     <h3 className="text-xl font-bold text-gray-900 mb-2">No Assets Loaded Yet</h3>
     <p className="text-gray-600 mb-6">
       Connect your wallets and load assets to get started. You can connect multiple wallets and load assets from each one.
     </p>
     <button
       onClick={() => setStep('connect')}
       className="inline-flex items-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-lg"
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
   <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
     <p className="text-sm font-semibold text-blue-900 mb-1">
       Currently Viewing Assets From:
     </p>
     {selectedWalletForLoading && (
       <div>
         <p className="text-sm font-bold text-blue-900 mb-1">
           {walletNames[selectedWalletForLoading] || resolvedEnsNames[selectedWalletForLoading.toLowerCase()] || selectedWalletForLoading.slice(0, 10) + '...' + selectedWalletForLoading.slice(-8)}
         </p>
       <p className="text-xs text-blue-700 font-mono break-all">
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
         <p className="text-xs text-blue-700 font-mono break-all">
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
  <h3 className="text-xl font-bold text-gray-900">Select Assets</h3>
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={hideSpamTokens}
      onChange={(e) => setHideSpamTokens(e.target.checked)}
      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
    />
    <span className="text-sm text-gray-700 font-semibold">Hide Spam/Dust Tokens</span>
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
 <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <p className="text-sm font-semibold text-blue-900 mb-1">
                        Want to add assets from another wallet?
                      </p>
                      <p className="text-xs text-blue-700">
                        You can connect multiple wallets and add assets incrementally. Your current selections will be preserved.
                      </p>
                    </div>
                    <button
                      onClick={() => setStep('connect')}
 className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
 >
 + Add More Wallets
 </button>
 </div>
 </div>
 <div className="mt-8 flex gap-4">
 <button
 onClick={() => setStep('allocate')}
 disabled={selectedAssetIds.length === 0}
 className="flex-1 rounded-lg bg-blue-600 text-white p-4 font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
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
 <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Allocate Your Assets</h2>
 <p className="text-gray-600 mb-6">
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
       <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
         <div className="max-w-md mx-auto">
           <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
           </div>
           <h3 className="text-xl font-bold text-gray-900 mb-2">No Assets Available</h3>
           <p className="text-gray-600 mb-6">
             Go back to the Assets step to load and select assets for allocation.
           </p>
           <button
             onClick={() => setStep('assets')}
             className="inline-flex items-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-lg"
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
       <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
         <div className="max-w-md mx-auto">
           <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
           </div>
           <h3 className="text-xl font-bold text-gray-900 mb-2">No Assets Selected</h3>
           <p className="text-gray-600 mb-6">
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
             className="inline-flex items-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-lg"
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
     <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
       <h3 className="font-bold text-lg text-gray-900 mb-4">Beneficiaries ({beneficiaries.length})</h3>
       
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
                   <span className="text-sm font-bold text-black">{ben.name}</span>
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
                           
                           // Scroll to form and focus
                           nameInput?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                           setTimeout(() => nameInput?.focus(), 300)
                         }
                       }}
                       className="text-blue-600 hover:text-blue-700 text-xs font-semibold px-1"
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
                       <p className="text-xs font-mono text-gray-500 break-all leading-tight">
                         ({ben.walletAddress})
                       </p>
                     )}
                   </div>
                 )}
                 {(!ben.ensName || ben.ensName === ben.walletAddress) && ben.walletAddress && (
                   <p className="text-xs font-mono text-gray-600 break-all leading-tight mb-1">
                     {ben.walletAddress}
                   </p>
                 )}
                 {ben.phone && (
                   <p className="text-xs text-gray-600 mb-1">📞 {ben.phone}</p>
                 )}
                 {ben.email && (
                   <p className="text-xs text-gray-600 mb-1">✉️ {ben.email}</p>
                 )}
                 {ben.notes && (
                   <p className="text-xs text-gray-500 italic mb-1">💬 {ben.notes}</p>
                 )}
                 {beneficiaryAllocations.length > 0 && (
                   <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-blue-200">
                     {beneficiaryAllocations.length} allocation{beneficiaryAllocations.length !== 1 ? 's' : ''}
                   </p>
                 )}
               </div>
             )
           })}
         </div>
       ) : (
         <div className="text-center py-8 text-gray-500">
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
       <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 text-center">
         <p className="text-yellow-800 font-semibold">Add at least one beneficiary above to start allocating assets</p>
       </div>
     )}
   </div>
 )}
 
 <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
   <div className="flex items-start justify-between">
     <div className="flex-1">
       <p className="text-sm font-semibold text-blue-900 mb-1">
         Need to add more assets?
       </p>
       <p className="text-xs text-blue-700">
         Go back to connect another wallet and add more assets to your portfolio.
       </p>
     </div>
     <button
       onClick={() => setStep('connect')}
       className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
     >
       + Add Wallet
     </button>
   </div>
 </div>
 
 <div className="mt-8 flex gap-4">
   <button
     onClick={() => setStep('assets')}
     className="flex-1 rounded-lg border-2 border-gray-300 p-4 font-semibold hover:bg-gray-50 transition-colors"
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
       className="flex-1 rounded-lg bg-blue-600 text-white p-4 font-semibold hover:bg-blue-700 transition-colors shadow-lg"
     >
       Continue to Details ({queuedSessions.length} wallet{queuedSessions.length !== 1 ? 's' : ''}) →
     </button>
   )}
 </div>
 </div>
 )}

 {step === 'details' && (
 <div className="max-w-2xl mx-auto">
 <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Enter Details</h2>
 <p className="text-gray-600 mb-8">
 Provide information about yourself, your executor, and instructions for accessing your assets
 </p>
 <div className="space-y-6">
 <div className="border-b pb-6">
 <h3 className="text-xl font-bold text-gray-900 mb-4">Owner Information</h3>
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">Full Legal Name *</label>
 <input
 type="text"
 value={ownerFullName}
 onChange={(e) => setOwnerFullName(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="John Michael Doe"
 />
 </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">ENS Address (Optional)</label>
            <input
              type="text"
              value={ownerEnsName}
              onChange={(e) => setOwnerEnsName(e.target.value)}
              className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="yourname.eth, yourname.base.eth, yourname.sol, yourname.btc"
            />
            {ownerEnsResolvedName && ownerResolvedAddress && (
              <div className="mt-2 text-sm text-green-600">
                <span className="font-semibold">✓ {ownerEnsResolvedName}</span>
                <span className="text-gray-500 ml-2 font-mono">({ownerResolvedAddress})</span>
              </div>
            )}
            {ownerEnsResolvedName && !ownerResolvedAddress && (
              <div className="mt-2 text-sm text-yellow-600">
                <span className="font-semibold">⚠ {ownerEnsResolvedName}</span>
                <span className="text-gray-500 ml-2">(Could not resolve - may be .sol, .btc, or other naming system)</span>
              </div>
            )}
            {!ownerEnsResolvedName && ownerResolvedAddress && (
              <div className="mt-2 text-sm text-gray-600 font-mono">
                {ownerResolvedAddress}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">Supports .eth, .base.eth, .sol, .btc, and other naming systems</p>
          </div>
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">Street Address *</label>
 <input
 type="text"
 value={ownerAddress}
 onChange={(e) => setOwnerAddress(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="123 Main Street"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">City *</label>
 <input
 type="text"
 value={ownerCity}
 onChange={(e) => setOwnerCity(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="Nashville"
 />
 </div>
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">State *</label>
 <input
 type="text"
 value={ownerState}
 onChange={(e) => setOwnerState(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="TN"
 maxLength={2}
 />
 </div>
 </div>
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">ZIP Code *</label>
 <input
 type="text"
 value={ownerZipCode}
 onChange={(e) => setOwnerZipCode(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="37203"
 />
 </div>
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
 <input
 type="tel"
 value={ownerPhone}
 onChange={(e) => setOwnerPhone(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="(615) 555-1234"
 />
 </div>
 </div>
 </div>

 <div className="border-b pb-6">
 <h3 className="text-xl font-bold text-gray-900 mb-4">Executor Information</h3>
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">Executor Full Name *</label>
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
 className="w-full rounded-lg border-2 border-blue-300 bg-blue-50 p-2 text-sm focus:border-blue-500 focus:outline-none transition-colors"
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
 className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="Jane Marie Doe"
 />
 {beneficiaries.length > 0 && (
 <p className="text-xs text-gray-500 mt-1">Select from beneficiaries above or type a name manually</p>
 )}
 </div>
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">Executor Wallet Address (Optional)</label>
 <input
 type="text"
 value={executorAddress}
 onChange={(e) => setExecutorAddress(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 font-mono text-sm focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="0x... or name.eth, name.base.eth, name.sol, name.btc"
 />
 {executorEnsName && executorResolvedAddress && (
 <div className="mt-2 text-sm text-green-600">
 <span className="font-semibold">✓ {executorEnsName}</span>
 <span className="text-gray-500 ml-2 font-mono">({executorResolvedAddress})</span>
 </div>
 )}
 {executorEnsName && !executorResolvedAddress && (
 <div className="mt-2 text-sm text-yellow-600">
 <span className="font-semibold">⚠ {executorEnsName}</span>
 <span className="text-gray-500 ml-2">(Could not resolve - may be .sol, .btc, or other naming system)</span>
 </div>
 )}
 {!executorEnsName && executorResolvedAddress && (
 <div className="mt-2 text-sm text-gray-600 font-mono">
 {executorResolvedAddress}
 </div>
 )}
 <p className="text-xs text-gray-500 mt-1">Supports .eth, .base.eth, .sol, .btc, and other naming systems</p>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">Executor Phone *</label>
 <input
 type="tel"
 value={executorPhone}
 onChange={(e) => setExecutorPhone(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="(615) 555-5678"
 />
 </div>
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">Executor Email *</label>
 <input
 type="email"
 value={executorEmail}
 onChange={(e) => setExecutorEmail(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="jane@example.com"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">Twitter / X (Optional)</label>
 <input
 type="text"
 value={executorTwitter}
 onChange={(e) => setExecutorTwitter(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="@username"
 />
 </div>
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">LinkedIn (Optional)</label>
 <input
 type="text"
 value={executorLinkedIn}
 onChange={(e) => setExecutorLinkedIn(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="linkedin.com/in/username"
 />
 </div>
 </div>
 </div>
 </div>

 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">
 Instructions for Executor *
 </label>
 <p className="text-xs text-gray-500 mb-2">
 These instructions are for your executor, who should already be aware of this document and know where to find it. Provide clear instructions for locating keys, seed phrases, or accessing wallets.
 </p>
 <textarea
 value={keyInstructions}
 onChange={(e) => setKeyInstructions(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 h-40 focus:border-blue-500 focus:outline-none transition-colors resize-none"
 placeholder="Example: The seed phrase is stored in a safety deposit box at First National Bank, box #123. The key is with my attorney, John Smith, at 456 Legal Ave. The hardware wallet is in my home safe, combination is also in that box."
 />
 </div>
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">
 Discount Code (Optional)
 </label>
 <div className="flex gap-2">
 <input
 type="text"
 value={discountCode}
 onChange={(e) => {
 setDiscountCode(e.target.value)
 setError(null)
 }}
 onBlur={handleDiscountCode}
 className="flex-1 rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors uppercase"
 placeholder="Enter discount code"
 />
 <button
 onClick={handleDiscountCode}
 className="px-4 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
 >
 Apply
 </button>
 </div>
 {discountApplied && (
 <p className="mt-2 text-sm text-green-600 font-semibold">✓ Discount applied! 100% off</p>
 )}
 </div>
 </div>
 
 {/* Show validation errors if button is disabled */}
 {!canProceedToPayment() && (
 <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
 <p className="text-sm font-semibold text-yellow-900 mb-2">
 ⚠️ Please complete the following to unlock PDF generation:
 </p>
 <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
 {getPaymentValidationErrors().filter(err => !err.includes('Tier limit')).map((error, index) => (
 <li key={index}>{error}</li>
 ))}
 </ul>
 </div>
 )}
 {getPaymentValidationErrors().some(err => err.includes('Tier limit')) && (
 <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
 <p className="text-sm font-semibold text-blue-900 mb-2">
 💡 Tier Limit Notice:
 </p>
 <p className="text-sm text-blue-700 mb-2">
 Your current setup exceeds the selected tier limits. You can:
 </p>
 <ul className="text-sm text-blue-700 list-disc list-inside space-y-1 ml-4">
 <li>Select a higher tier (Standard or Premium) on the Payment step</li>
 <li>Use a discount code to bypass limits</li>
 <li>Reduce wallets/beneficiaries to fit your selected tier</li>
 </ul>
 </div>
 )}
 
 <div className="mt-8 flex gap-4">
 <button
 onClick={() => setStep('allocate')}
 className="flex-1 rounded-lg border-2 border-gray-300 p-4 font-semibold hover:bg-gray-50 transition-colors"
 >
 ← Back
 </button>
 <button
 onClick={handleCreateInvoice}
 disabled={!canProceedToPayment()}
 className="flex-1 rounded-lg bg-blue-600 text-white p-4 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
 title={!canProceedToPayment() ? `Missing: ${getPaymentValidationErrors().filter(err => !err.includes('Tier limit')).join(', ')}` : 'Continue to select your plan and payment'}
 >
              Continue to Payment →
 </button>
 </div>
 </div>
 )}

 {step === 'payment' && !invoiceId && !discountApplied && (
<div className="max-w-2xl mx-auto">
<h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Payment</h2>
<p className="text-gray-600 mb-6">
{selectedTier === 'free' ? (
'Free tier selected - no payment required'
) : (
`Selected plan: ${selectedTier === 'standard' ? 'Standard' : 'Premium'} - $${pricing.usdAmount.toFixed(2)}`
)}
</p>

{!canProceedToPayment() && !discountApplied && (
<div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
<p className="text-red-800 font-semibold mb-2">⚠️ Please complete the following:</p>
<ul className="list-disc list-inside space-y-1 text-red-700 text-sm">
{getPaymentValidationErrors().map((error, index) => (
<li key={index}>{error}</li>
))}
</ul>
</div>
)}

{discountApplied && (
<div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-6">
<p className="text-green-800 font-semibold mb-2">✓ Discount Code Applied!</p>
<p className="text-green-700 text-sm">Tier limits bypassed - you have unlimited access with the discount code.</p>
</div>
)}

<div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
<label className="block text-sm font-semibold text-gray-700 mb-3">
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
className="flex-1 rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors uppercase"
placeholder="Enter discount code"
/>
<button
onClick={handleDiscountCode}
className="px-6 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
>
Apply
</button>
</div>
{discountApplied && (
<div className="mt-2">
<p className="text-sm text-green-600 font-semibold mb-1">✓ Discount applied! 100% off - Tier limits bypassed</p>
<p className="text-xs text-green-600">Redirecting to download...</p>
</div>
)}
</div>

<div className="flex gap-4">
 <button
 onClick={() => setStep('details')}
className="flex-1 rounded-lg border-2 border-gray-300 p-4 font-semibold hover:bg-gray-50 transition-colors"
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
className="flex-1 rounded-lg bg-blue-600 text-white p-4 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
 <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Payment Required</h2>
 <p className="text-gray-600 mb-8">
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
 <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 border-2 border-blue-200">
 <div className="space-y-4">
 <div className={`rounded-lg p-6 ${pricing.isSpecial ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-3 border-green-400 shadow-lg' : 'bg-gray-50'}`}>
 <p className="text-sm text-gray-600 mb-2 font-semibold">Payment Amount</p>
                    {pricing.isSpecial ? (
                      <div className="space-y-3">
                        <div className="flex items-baseline gap-4">
                          <p className="text-5xl font-bold text-green-700 animate-pulse">
                            🎉 $20.26
                          </p>
                          <p className="text-3xl line-through text-gray-400">$42.00</p>
                        </div>
                        <p className="text-xl text-green-700 font-bold">
                          ✨ New Year 2026 Special - Save $21.74! ✨
                        </p>
                        <p className="text-base text-gray-700 font-semibold">
                          ({paymentAmountETH} ETH) • Regular price $42.00 returns February 1st
                        </p>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-gray-900">
                        ${pricing.usdAmount.toFixed(2)} ({paymentAmountETH} ETH)
                      </p>
                    )}
                  </div>
 <div className="bg-gray-50 rounded-lg p-4">
 <p className="text-sm text-gray-600 mb-1">Token</p>
                    <p className="text-lg font-semibold text-gray-900">Native ETH on Ethereum Mainnet</p>
 </div>
 <div className="bg-gray-50 rounded-lg p-4">
 <p className="text-sm text-gray-600 mb-1">Recipient</p>
 <p className="text-lg font-mono text-gray-900 break-all">lastwish.eth</p>
 </div>
 {isConnected && chain?.id === mainnet.id && paymentRecipientAddress && (
 <div className="bg-green-50 border border-green-200 rounded-lg p-4">
 <p className="text-sm text-green-800">
                <strong>✓ Ready to Pay:</strong> Click "Send Payment" below to send {paymentAmountETH} ETH (${pricing.usdAmount.toFixed(2)}) directly from your connected wallet. No need to leave this page!
 </p>
 </div>
 )}
 {!isConnected && (
 <div className="bg-red-50 border border-red-200 rounded-lg p-4">
 <p className="text-sm text-red-800">
 <strong>Connect Wallet Required:</strong> Please connect your wallet to send payment directly from this page.
 </p>
 </div>
 )}
 {isConnected && chain?.id !== mainnet.id && (
 <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
 <p className="text-sm text-orange-800">
 <strong>Wrong Network:</strong> Please switch to Ethereum Mainnet to send payment.
 </p>
 </div>
 )}
 {isSendingPayment && (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <p className="text-sm text-blue-800">
 <strong>Sending Payment...</strong> Please confirm the transaction in your wallet.
 </p>
 </div>
 )}
 {isConfirming && (
 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
 <p className="text-sm text-yellow-800">
 <strong>Transaction Pending...</strong> Waiting for confirmation. This may take a few moments.
 </p>
 </div>
 )}
 {isPaymentSent && (
 <div className="bg-green-50 border border-green-200 rounded-lg p-4">
 <p className="text-sm text-green-800">
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
       <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
         <p className="text-sm text-yellow-800">
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
 className="w-full rounded-lg bg-blue-600 text-white p-4 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg"
 >
              {isSendingPayment ? 'Confirm in Wallet...' : isConfirming ? 'Confirming Transaction...' : `💳 Send Payment (${paymentAmountETH} ETH)`}
 </button>
 ) : !isConnected ? (
 <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 text-center space-y-3">
 <p className="text-sm text-gray-700 mb-2">Connect your wallet to send payment directly from this page</p>
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
 className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
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
 className="flex-1 rounded-lg border-2 border-gray-300 p-4 font-semibold hover:bg-gray-50 transition-colors"
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
 <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Document Ready!</h2>
 <p className="text-gray-600 mb-8">
 Your crypto inheritance instructions document is ready to download
 </p>
 <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-8 border-2 border-green-200">
 <div className="mb-6">
 <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
 <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
 </svg>
 </div>
 <p className="text-lg font-semibold text-gray-900 mb-2">
 {discountApplied ? 'Discount Applied - FREE' : 'Payment Verified'}
 </p>
 <p className="text-sm text-gray-600">
 Your document has been generated and is ready to download
 </p>
 </div>
 <button
 onClick={handleDownloadPDF}
 disabled={generatingPDF}
 className="w-full rounded-lg bg-blue-600 text-white p-4 font-semibold hover:bg-blue-700 transition-colors shadow-lg mb-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
 <p className="text-sm text-gray-600 mt-2">
 This may take a few moments as we compile your document...
 </p>
 )}
 <p className="text-xs text-gray-500">
 Print this document and have it notarized. Keep it in a safe place.
 </p>
 </div>
        </div>
  )
})()}

 {step === 'download' && !paymentVerified && !discountApplied && (
 <div className="max-w-2xl mx-auto text-center">
 <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-8">
 <h2 className="text-2xl font-bold text-yellow-900 mb-4">Payment Required</h2>
 <p className="text-yellow-800 mb-4">
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

 <footer className="mt-12 text-center text-sm text-gray-500">
 <p className="mb-2">
 LastWishCrypto is a backup plan tool. It does not store your keys or execute transactions.
 </p>
 <p>
 This document is for informational purposes only and does not constitute legal advice.
 </p>
 </footer>
 </div>
    </div>
 )
}
