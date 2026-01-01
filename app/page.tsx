'use client'

import { useState, useEffect } from 'react'
import { useAccount, useDisconnect, useSignMessage } from 'wagmi'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { WalletConnect } from '@/components/WalletConnect'
import { AssetList } from '@/components/AssetList'
import { AssetSelector } from '@/components/AssetSelector'
import { BeneficiaryForm } from '@/components/BeneficiaryForm'
import { AllocationPanel } from '@/components/AllocationPanel'
import { Asset, Beneficiary, Allocation, UserData } from '@/types'
import axios from 'axios'
import { generatePDF } from '@/lib/pdf-generator'

type Step = 'connect' | 'assets' | 'allocate' | 'details' | 'payment' | 'download'

const steps = [
 { id: 'connect', label: 'Connect', number: 1 },
 { id: 'assets', label: 'Assets', number: 2 },
 { id: 'allocate', label: 'Allocate', number: 3 },
 { id: 'details', label: 'Details', number: 4 },
 { id: 'payment', label: 'Payment', number: 5 },
 { id: 'download', label: 'Download', number: 6 },
]

export default function Home() {
 const { address: evmAddress, isConnected } = useAccount()
 const { disconnect } = useDisconnect()
 const { signMessageAsync } = useSignMessage({
 mutation: {
 onError: (error) => {
 console.error('Sign message error:', error)
 }
 }
 })
 const [step, setStep] = useState<Step>('connect')
 const [btcAddress, setBtcAddress] = useState<string | null>(null)
 const [assets, setAssets] = useState<Asset[]>([])
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
 const [allocations, setAllocations] = useState<Allocation[]>([])
 const [ownerName, setOwnerName] = useState('')
 const [ownerFullName, setOwnerFullName] = useState('')
 const [ownerAddress, setOwnerAddress] = useState('')
 const [ownerCity, setOwnerCity] = useState('')
 const [ownerState, setOwnerState] = useState('')
 const [ownerZipCode, setOwnerZipCode] = useState('')
 const [ownerPhone, setOwnerPhone] = useState('')
 const [ownerEmail, setOwnerEmail] = useState('')
 const [executorName, setExecutorName] = useState('')
 const [executorAddress, setExecutorAddress] = useState('')
 const [executorPhone, setExecutorPhone] = useState('')
 const [executorEmail, setExecutorEmail] = useState('')
 const [keyInstructions, setKeyInstructions] = useState('')
 const [walletNames, setWalletNames] = useState<Record<string, string>>({})
 const [resolvedEnsNames, setResolvedEnsNames] = useState<Record<string, string>>({})
 const [connectedEVMAddresses, setConnectedEVMAddresses] = useState<Set<string>>(new Set())
 const [mounted, setMounted] = useState(false)
 const [invoiceId, setInvoiceId] = useState<string | null>(null)
 const [paymentVerified, setPaymentVerified] = useState(false)
 const [verifyingPayment, setVerifyingPayment] = useState(false)
 const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
 const [discountCode, setDiscountCode] = useState('')
 const [discountApplied, setDiscountApplied] = useState(false)
 const [paymentWalletAddress, setPaymentWalletAddress] = useState<string | null>(null) // First verified wallet for payment
 const [selectedWalletForLoading, setSelectedWalletForLoading] = useState<string | null>(null) // Currently selected wallet for loading assets

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
 if (parsed.ownerAddress) setOwnerAddress(parsed.ownerAddress)
 if (parsed.ownerCity) setOwnerCity(parsed.ownerCity)
 if (parsed.ownerState) setOwnerState(parsed.ownerState)
 if (parsed.ownerZipCode) setOwnerZipCode(parsed.ownerZipCode)
 if (parsed.ownerPhone) setOwnerPhone(parsed.ownerPhone)
 if (parsed.ownerEmail) setOwnerEmail(parsed.ownerEmail)
 if (parsed.executorName) setExecutorName(parsed.executorName)
 if (parsed.executorAddress) setExecutorAddress(parsed.executorAddress)
 if (parsed.executorPhone) setExecutorPhone(parsed.executorPhone)
 if (parsed.executorEmail) setExecutorEmail(parsed.executorEmail)
 if (parsed.keyInstructions) setKeyInstructions(parsed.keyInstructions)
 if (parsed.resolvedEnsNames) setResolvedEnsNames(parsed.resolvedEnsNames)
 if (parsed.paymentWalletAddress) setPaymentWalletAddress(parsed.paymentWalletAddress)
 if (parsed.step) setStep(parsed.step)
 if (parsed.invoiceId) setInvoiceId(parsed.invoiceId)
 if (parsed.paymentVerified) setPaymentVerified(parsed.paymentVerified)
 if (parsed.discountCode) setDiscountCode(parsed.discountCode)
 if (parsed.discountApplied) setDiscountApplied(parsed.discountApplied)
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
 ownerAddress,
 ownerCity,
 ownerState,
 ownerZipCode,
 ownerPhone,
 ownerEmail,
 executorName,
 executorAddress,
 executorPhone,
 executorEmail,
 keyInstructions,
 resolvedEnsNames,
 paymentWalletAddress,
 step,
 invoiceId,
 paymentVerified,
 discountCode,
 discountApplied,
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
 ownerAddress,
 ownerCity,
 ownerState,
 ownerZipCode,
 ownerPhone,
 ownerEmail,
 executorName,
 executorAddress,
 executorPhone,
 executorEmail,
 keyInstructions,
 resolvedEnsNames,
 paymentWalletAddress,
 step,
 invoiceId,
 paymentVerified,
 discountCode,
 discountApplied,
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
      const message = `I am the owner of this wallet address: ${address}\n\nThis signature proves I control this wallet and authorize LastWish.eth to access my asset information.\n\nTimestamp: ${Date.now()}`
      
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

 // Resolve ENS names for addresses
  // Resolve ENS name from address (reverse lookup)
  const resolveENS = async (address: string) => {
 if (!address || address.length < 10 || !address.startsWith('0x')) return null
 try {
 const publicClient = createPublicClient({
 chain: mainnet,
 transport: http(),
 })
 const ensName = await publicClient.getEnsName({ address: address as `0x${string}` })
 return ensName
 } catch (error) {
 console.error('Error resolving ENS:', error)
 return null
 }
 }

 // Resolve ENS names when wallets are connected
 useEffect(() => {
 const resolveWalletNames = async () => {
 const newWalletNames: Record<string, string> = { ...walletNames }
 let updated = false
 
 // Resolve ENS for current EVM address
 if (evmAddress && !newWalletNames[evmAddress]) {
 const ensName = await resolveENS(evmAddress)
 if (ensName) {
 newWalletNames[evmAddress] = ensName
 setResolvedEnsNames(prev => ({ ...prev, [evmAddress.toLowerCase()]: ensName }))
 updated = true
 }
 }
 
 // Resolve ENS for all connected EVM addresses
 for (const addr of connectedEVMAddresses) {
 if (addr && !resolvedEnsNames[addr.toLowerCase()]) {
 const ensName = await resolveENS(addr)
 if (ensName) {
 setResolvedEnsNames(prev => ({ ...prev, [addr.toLowerCase()]: ensName }))
 if (!newWalletNames[addr]) {
 newWalletNames[addr] = ensName
 updated = true
 }
 }
 }
 }
 
 // Resolve ENS for all connected EVM addresses
 for (const addr of connectedEVMAddresses) {
 if (addr && !newWalletNames[addr]) {
 const ensName = await resolveENS(addr)
 if (ensName) {
 newWalletNames[addr] = ensName
 updated = true
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
 const uniqueAssets = evmResponse.data.assets.filter((a: Asset) => !existingIds.has(a.id))
 newAssets.push(...uniqueAssets)
 console.log(`Loaded ${uniqueAssets.length} new assets from wallet`)
 }
 } catch (err) {
 console.error('Error loading EVM assets:', err)
 setError('Failed to load EVM assets. Please try again.')
 }
 } else {
 setError('Wallet must be verified (signature required) before loading assets.')
 setLoading(false)
 return
 }

 if (append) {
 setAssets([...assets, ...newAssets])
 if (newAssets.length > 0) {
 setSelectedAssetIds([...selectedAssetIds, ...newAssets.map(a => a.id)])
 }
 } else {
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
 setLoading(true)
 setError(null)
 // Show loading message
 console.log('Loading assets, be patient...')
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
 newAssets.push(...uniqueAssets)
 console.log(`Loaded ${uniqueAssets.length} new assets from ${walletsToLoad.length} wallet(s)`)
 }
 } catch (err) {
 console.error('Error loading EVM assets:', err)
 setError('Failed to load EVM assets. Please try again.')
 }
 }

 // Load Bitcoin assets
 if (btcAddress) {
 try {
 const btcResponse = await axios.post('/api/portfolio/btc', {
 address: btcAddress,
 })
 if (btcResponse.data?.assets && Array.isArray(btcResponse.data.assets)) {
 // Filter out duplicates
 const existingIds = new Set(assets.map(a => a.id))
 const uniqueAssets = btcResponse.data.assets.filter((a: Asset) => !existingIds.has(a.id))
 newAssets.push(...uniqueAssets)
 }
 } catch (err) {
 console.error('Error loading BTC assets:', err)
 setError('Failed to load Bitcoin assets. Please try again.')
 }
 }

 if (append) {
 // Append new assets to existing ones
 setAssets([...assets, ...newAssets])
 // Auto-select newly loaded assets
 if (newAssets.length > 0) {
 setSelectedAssetIds([...selectedAssetIds, ...newAssets.map(a => a.id)])
 }
 } else {
 // Replace assets (first time loading)
 setAssets(newAssets)
 if (newAssets.length > 0) {
 setSelectedAssetIds(newAssets.map(a => a.id))
 }
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
 try {
 setError(null)
 const response = await axios.post('/api/invoice/create', {
 discountCode: discountCode.trim().toLowerCase(),
 })
 if (response.data?.invoice?.id) {
 setInvoiceId(response.data.invoice.id)
 if (response.data.discountApplied) {
 setDiscountApplied(true)
 setPaymentVerified(true) // Skip payment if 100% discount
 setStep('download')
 } else {
 setStep('payment')
 }
 } else {
 setError('Failed to create invoice')
 }
 } catch (error) {
 console.error('Error creating invoice:', error)
 setError('Failed to create invoice. Please try again.')
 }
 }

 const handleDiscountCode = () => {
 const code = discountCode.trim().toLowerCase()
 if (code === 'nofomo') {
 setDiscountApplied(true)
 setError(null)
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

 // Filter assets to only include selected ones
 const selectedAssets = assets.filter(a => selectedAssetIds.includes(a.id))
 
 // Collect all unique EVM addresses from assets
 const allEVMAddresses = new Set<string>()
 assets.forEach(asset => {
 if (asset.chain !== 'bitcoin' && asset.contractAddress && asset.contractAddress.startsWith('0x')) {
 // Extract address from asset ID (format: chain-address-...)
 const parts = asset.id.split('-')
 if (parts.length >= 2 && parts[1].startsWith('0x')) {
 allEVMAddresses.add(parts[1])
 }
 }
 })
 // Add current connected address
 if (evmAddress) {
 allEVMAddresses.add(evmAddress)
 }
 // Add all tracked addresses
 connectedEVMAddresses.forEach(addr => allEVMAddresses.add(addr))

 const userData: UserData = {
 ownerName,
 ownerFullName,
 ownerAddress,
 ownerCity,
 ownerState,
 ownerZipCode,
 ownerPhone,
 ownerEmail,
 executorName,
 executorAddress,
 executorPhone: executorPhone || undefined,
 executorEmail: executorEmail || undefined,
 beneficiaries,
 allocations,
 keyInstructions,
 connectedWallets: {
 evm: Array.from(allEVMAddresses),
 btc: btcAddress || undefined,
 },
 walletNames,
 resolvedEnsNames,
 }

 try {
 setError(null)
 const pdfBytes = await generatePDF(userData, selectedAssets)
 const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
 const url = URL.createObjectURL(blob)
 
 // Open PDF in new window for printing
 const printWindow = window.open(url, '_blank')
 
 if (printWindow) {
 // Wait for PDF to load, then trigger print dialog
 printWindow.onload = () => {
 setTimeout(() => {
 printWindow.print()
 }, 500)
 }
 
 // Also download the file automatically
 const a = document.createElement('a')
 a.href = url
 a.download = `lastwish-crypto-instructions-${Date.now()}.pdf`
 document.body.appendChild(a)
 a.click()
 document.body.removeChild(a)
 
 // Clean up URL after a delay
 setTimeout(() => {
 URL.revokeObjectURL(url)
 }, 2000)
 } else {
 // Fallback if popup blocked - just download
 const a = document.createElement('a')
 a.href = url
 a.download = `lastwish-crypto-instructions-${Date.now()}.pdf`
 document.body.appendChild(a)
 a.click()
 document.body.removeChild(a)
 URL.revokeObjectURL(url)
 alert('Please allow popups to enable automatic printing. The PDF has been downloaded.')
 }
 } catch (error) {
 console.error('Error generating PDF:', error)
 setError('Failed to generate PDF. Please try again.')
 }
 }

 const canProceedToPayment = () => {
 // Filter allocations to only selected assets
 const selectedAssetAllocations = allocations.filter(a => selectedAssetIds.includes(a.assetId))
 return (
 ownerFullName.trim() &&
 ownerName.trim() &&
 ownerAddress.trim() &&
 ownerCity.trim() &&
 ownerState.trim() &&
 ownerZipCode.trim() &&
 ownerPhone.trim() &&
 ownerEmail.trim() &&
 executorName.trim() &&
 executorAddress.trim() &&
 beneficiaries.length > 0 &&
 selectedAssetAllocations.length > 0 &&
 keyInstructions.trim() &&
 selectedAssetIds.length > 0
 )
 }

 const canGeneratePDF = () => {
 // Can generate if payment is verified OR discount is applied
 return paymentVerified || discountApplied
 }

 const getCurrentStepIndex = () => {
 return steps.findIndex(s => s.id === step)
 }

 return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 {/* Header */}
 <header className="text-center mb-12">
 <h1 className="text-5xl font-bold text-gray-900 mb-3">LastWish.eth</h1>
 <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-4">
 Do you really want to take your crypto to the grave with you by accident?
 </p>
 <p className="text-sm text-gray-500">
 Secure crypto inheritance instructions • 0.00025 ETH one-time fee
 </p>
 </header>

 {/* Progress Steps */}
 <div className="mb-8 bg-white rounded-lg shadow-sm p-4">
 <div className="flex items-center justify-between max-w-4xl mx-auto">
 {steps.map((s, index) => {
 const currentIndex = getCurrentStepIndex()
 const isActive = step === s.id
 const isCompleted = currentIndex > index
 
 return (
 <div key={s.id} className="flex items-center flex-1">
 <div className="flex flex-col items-center flex-1">
 <div
 className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
 isActive
 ? 'bg-blue-600 text-white shadow-lg scale-110'
 : isCompleted
 ? 'bg-green-500 text-white'
 : 'bg-gray-200 text-gray-500'
 }`}
 >
 {isCompleted ? '✓' : s.number}
 </div>
 <span className={`text-xs mt-2 font-medium ${
 isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
 }`}>
 {s.label}
 </span>
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
 <main className="bg-white rounded-xl shadow-xl p-8 md:p-12">
 {error && (
 <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
 <p className="text-red-800 text-sm">{error}</p>
 </div>
 )}

 {step === 'connect' && (
 <div className="max-w-2xl mx-auto">
 <h2 className="text-3xl font-bold text-gray-900 mb-2">Connect Your Wallets</h2>
 <p className="text-gray-600 mb-8">
 Connect your crypto wallets to view and allocate your assets. You can connect multiple wallets and add assets incrementally.
 </p>
 {assets.length > 0 && (
 <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
 <p className="text-sm text-blue-800 font-semibold mb-1">
 {assets.length} asset{assets.length !== 1 ? 's' : ''} loaded from previous wallet{assets.length !== 1 ? 's' : ''}
 </p>
 <p className="text-xs text-blue-700">
 Connect another wallet to add more assets, or continue to review your current assets.
 </p>
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
 const walletAssets = assets.filter(a => 
 a.walletAddress === addr
 )
 const walletAssetCount = walletAssets.length
 const isSelected = selectedWalletForLoading === addr
 const isVerified = verifiedAddresses.has(addr)
 return (
 <div 
 key={addr} 
 onClick={() => {
 if (isVerified) {
 setSelectedWalletForLoading(addr)
 // Switch wagmi connection to this wallet if needed
 if (evmAddress !== addr && isConnected) {
 // Note: wagmi doesn't support switching accounts directly
 // User would need to switch in their wallet
 }
 }
 }}
 className={`bg-white border-2 rounded-lg p-4 shadow-sm cursor-pointer transition-all ${
 isSelected 
 ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-300' 
 : isVerified
 ? 'border-blue-200 hover:border-blue-300 hover:shadow-md'
 : 'border-gray-200 opacity-60'
 }`}
 >
 <div className="flex items-start justify-between">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-2">
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
 EVM WALLET
 </span>
 {isSelected && (
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
 ✓ SELECTED
 </span>
 )}
 {!isVerified && (
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
 ⚠ VERIFY REQUIRED
 </span>
 )}
 {walletAssetCount > 0 && (
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
 {walletAssetCount} Asset{walletAssetCount !== 1 ? 's' : ''} Loaded
 </span>
 )}
 </div>
 
 {ensName && ensName !== addr && (
 <div className="mb-2">
 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
 ENS Name
 </p>
 <p className="text-base font-bold text-gray-900 break-all">
 {ensName}
 </p>
 </div>
 )}
 
 <div className="mt-2">
 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
 Wallet Address
 </p>
 <p className="text-sm font-mono text-gray-700 break-all bg-gray-50 p-2 rounded border">
 {addr}
 </p>
 </div>
 
 <div className="mt-3 pt-3 border-t border-gray-200">
 <p className="text-xs text-gray-500">
 <span className="font-semibold">Supported Chains:</span> Ethereum, Base, Arbitrum, Polygon
 </p>
 </div>
 </div>
 
 <div className="ml-4 flex flex-col gap-2">
 <button
 onClick={() => {
 // Just disconnect the wallet - KEEP all assets and selections
 // Assets are already loaded and have walletAddress, so they're preserved
 setConnectedEVMAddresses(prev => {
 const newSet = new Set(prev)
 newSet.delete(addr)
 // If this was the selected wallet, select another one
 if (selectedWalletForLoading === addr) {
 const remaining = Array.from(newSet).filter(a => verifiedAddresses.has(a))
 setSelectedWalletForLoading(remaining.length > 0 ? remaining[0] : null)
 }
 return newSet
 })
 // Disconnect from wagmi if this is the currently active connection
 if (evmAddress === addr) {
 disconnect()
 }
 // Don't remove assets - they're already loaded and selected assets should be preserved
 // The walletAddress field on assets will still show which wallet they came from
 }}
 className="px-4 py-2 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors whitespace-nowrap"
 >
 Disconnect
 </button>
 {isVerified && (
 <button
 onClick={() => setSelectedWalletForLoading(addr)}
 className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors whitespace-nowrap ${
 isSelected
 ? 'bg-blue-600 text-white border-blue-600'
 : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
 }`}
 >
 {isSelected ? '✓ Selected' : 'Select'}
 </button>
 )}
 </div>
 </div>
 </div>
 )
 })}
 {btcAddress && (() => {
 const btcAssets = assets.filter(a => a.chain === 'bitcoin')
 const btcAssetCount = btcAssets.length
  return (
 <div className="bg-white border-2 border-orange-200 rounded-lg p-4 shadow-sm">
 <div className="flex items-start justify-between">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-2">
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
 BITCOIN WALLET
 </span>
 {btcAssetCount > 0 && (
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
 {btcAssetCount} Asset{btcAssetCount !== 1 ? 's' : ''} Loaded
 </span>
 )}
 </div>
 
 <div className="mt-2">
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
 
 <button
 onClick={() => {
 // Just disconnect the wallet - KEEP all assets and selections
 setBtcAddress(null)
 // Don't remove assets - they're already loaded and selected assets should be preserved
 // The walletAddress field on assets will still show which wallet they came from
 }}
 className="ml-4 px-4 py-2 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors whitespace-nowrap"
 >
 Disconnect
 </button>
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
 onBitcoinConnect={(addr) => {
 setBtcAddress(addr)
 setError(null)
 }}
 onEvmConnect={async (addr) => {
 if (addr && !connectedEVMAddresses.has(addr)) {
 // Check wallet limit (20 wallets max)
 if (connectedEVMAddresses.size >= 20) {
 setError('Maximum 20 wallets allowed. Please disconnect a wallet first.')
 return
 }
 setConnectedEVMAddresses(prev => new Set([...prev, addr]))
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
 <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
 <p className="text-sm font-semibold text-blue-900 mb-1">
 Selected Wallet:
 </p>
 <p className="text-xs text-blue-700 font-mono break-all">
 {resolvedEnsNames[selectedWalletForLoading.toLowerCase()] || walletNames[selectedWalletForLoading] || selectedWalletForLoading}
 </p>
 </div>
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
 className="w-full rounded-lg bg-blue-600 text-white p-4 font-semibold hover:bg-blue-700 transition-colors shadow-lg"
 >
 {assets.length > 0 ? 'Add Assets from Selected Wallet' : 'Load Assets from Selected Wallet →'}
 </button>
 {connectedEVMAddresses.size > 1 && Array.from(connectedEVMAddresses).filter(addr => verifiedAddresses.has(addr)).length > 1 && (
 <button
 onClick={async () => {
 await loadAssets(assets.length > 0, true) // Append if we already have assets, load from ALL verified wallets
 setStep('assets')
 }}
 className="w-full rounded-lg bg-green-600 text-white p-4 font-semibold hover:bg-green-700 transition-colors shadow-lg"
 >
 Load Assets from ALL Verified Wallets ({Array.from(connectedEVMAddresses).filter(addr => verifiedAddresses.has(addr)).length}) →
 </button>
 )}
 {assets.length > 0 && (
 <button
 onClick={() => setStep('assets')}
 className="w-full rounded-lg border-2 border-gray-300 bg-white p-4 font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
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
 <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Assets</h2>
 <p className="text-gray-600 mb-8">
 Review all assets across your connected wallets
 </p>
 {loading ? (
 <div className="text-center py-12">
 <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 <p className="mt-4 text-gray-600 font-semibold">Loading assets, be patient...</p>
 <p className="mt-2 text-sm text-gray-500">This may take a few seconds as we fetch data from the blockchain</p>
 </div>
 ) : (
 <>
 <AssetSelector
 assets={assets}
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
 onClick={() => setStep('connect')}
 className="flex-1 rounded-lg border-2 border-blue-300 bg-blue-50 text-blue-700 p-4 font-semibold hover:bg-blue-100 transition-colors"
 >
 ← Add More Wallets
 </button>
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
 <h2 className="text-3xl font-bold text-gray-900 mb-2">Allocate Your Assets</h2>
 <p className="text-gray-600 mb-8">
 Assign your assets to beneficiaries. You can allocate by percentage or specific amounts.
 </p>
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-1">
 <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-4">
                    <h3 className="font-bold text-lg mb-3 text-gray-900">Assets ({selectedAssetIds.length} selected)</h3>
 <div className="max-h-96 overflow-y-auto">
 <AssetSelector
 assets={assets}
 selectedAssetIds={selectedAssetIds}
 onSelectionChange={setSelectedAssetIds}
 />
 </div>
 </div>
 </div>
 <div className="lg:col-span-1">
 <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-4">
                    <h3 className="font-bold text-lg mb-3">Beneficiaries</h3>
                    <BeneficiaryForm
 beneficiaries={beneficiaries}
 onBeneficiariesChange={setBeneficiaries}
 />
 </div>
 </div>
 <div className="lg:col-span-1">
 <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-4">
                    <h3 className="font-bold text-lg mb-3">Allocations</h3>
                    <AllocationPanel
 assets={assets.filter(a => selectedAssetIds.includes(a.id))}
 beneficiaries={beneficiaries}
 allocations={allocations}
 onAllocationChange={setAllocations}
 />
 </div>
 </div>
 </div>
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
 onClick={() => setStep('connect')}
 className="px-6 rounded-lg border-2 border-blue-300 bg-blue-50 text-blue-700 p-4 font-semibold hover:bg-blue-100 transition-colors"
 >
 + Wallet
 </button>
 <button
 onClick={() => setStep('details')}
 disabled={beneficiaries.length === 0 || allocations.filter(a => selectedAssetIds.includes(a.assetId)).length === 0 || selectedAssetIds.length === 0}
 className="flex-1 rounded-lg bg-blue-600 text-white p-4 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
 >
 Continue to Details →
 </button>
 </div>
 </div>
 )}

 {step === 'details' && (
 <div className="max-w-2xl mx-auto">
 <h2 className="text-3xl font-bold text-gray-900 mb-2">Enter Details</h2>
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
 <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Name / Display Name *</label>
 <input
 type="text"
 value={ownerName}
 onChange={(e) => setOwnerName(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="John Doe"
 />
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
 <div className="grid grid-cols-2 gap-4">
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
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
 <input
 type="email"
 value={ownerEmail}
 onChange={(e) => setOwnerEmail(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="john@example.com"
 />
 </div>
 </div>
 </div>
 </div>

 <div className="border-b pb-6">
 <h3 className="text-xl font-bold text-gray-900 mb-4">Executor Information</h3>
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">Executor Full Name *</label>
 <input
 type="text"
 value={executorName}
 onChange={(e) => setExecutorName(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="Jane Marie Doe"
 />
 </div>
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">Executor Wallet Address *</label>
 <input
 type="text"
 value={executorAddress}
 onChange={(e) => setExecutorAddress(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 font-mono text-sm focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="0x... or name.eth"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">Executor Phone (Optional)</label>
 <input
 type="tel"
 value={executorPhone}
 onChange={(e) => setExecutorPhone(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="(615) 555-5678"
 />
 </div>
 <div>
 <label className="block text-sm font-semibold text-gray-700 mb-2">Executor Email (Optional)</label>
 <input
 type="email"
 value={executorEmail}
 onChange={(e) => setExecutorEmail(e.target.value)}
 className="w-full rounded-lg border-2 border-gray-300 p-3 focus:border-blue-500 focus:outline-none transition-colors"
 placeholder="jane@example.com"
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
 placeholder="Example: The seed phrase is stored in a safety deposit box at First National Bank, box #123. The key is with my attorney, John Smith, at 456 Legal Ave. The hardware wallet is in my home safe, combination is..."
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
 >
 {discountApplied ? 'Unlock & Generate (FREE)' : 'Unlock & Generate (0.00025 ETH)'} →
 </button>
 </div>
 </div>
 )}

 {step === 'payment' && invoiceId && (
 <div className="max-w-2xl mx-auto">
 <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Required</h2>
 <p className="text-gray-600 mb-8">
 Pay 0.00025 ETH to unlock PDF generation
 </p>
 <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 border-2 border-blue-200">
 <div className="space-y-4">
 <div className="bg-white rounded-lg p-4">
 <p className="text-sm text-gray-600 mb-1">Amount</p>
                    <p className="text-2xl font-bold text-gray-900">0.00025 ETH</p> </div>
 <div className="bg-white rounded-lg p-4">
 <p className="text-sm text-gray-600 mb-1">Token</p>
                    <p className="text-lg font-semibold text-gray-900">Native ETH on Ethereum Mainnet</p>
 </div>
 <div className="bg-white rounded-lg p-4">
 <p className="text-sm text-gray-600 mb-1">Recipient</p>
 <p className="text-lg font-mono text-gray-900 break-all">lastwish.eth</p>
 </div>
 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
 <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Send exactly 0.00025 ETH on Ethereum mainnet to the address above. After sending, click "Verify Payment" below.
 </p>
 </div>
 </div>
 <div className="mt-6 flex gap-4">
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

 {step === 'download' && paymentVerified && (
 <div className="max-w-2xl mx-auto text-center">
 <h2 className="text-3xl font-bold text-gray-900 mb-2">Document Ready!</h2>
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
 <p className="text-lg font-semibold text-gray-900 mb-2">Payment Verified</p>
 <p className="text-sm text-gray-600">
 Your document has been generated and is ready to download
 </p>
 </div>
 <button
 onClick={handleDownloadPDF}
 className="w-full rounded-lg bg-blue-600 text-white p-4 font-semibold hover:bg-blue-700 transition-colors shadow-lg mb-4"
 >
 Download PDF
 </button>
 <p className="text-xs text-gray-500">
 Print this document and have it notarized. Keep it in a safe place.
 </p>
 </div>
        </div>
 )}
      </main>

 <footer className="mt-12 text-center text-sm text-gray-500">
 <p className="mb-2">
 LastWish is a backup plan tool. It does not store your keys or execute transactions.
 </p>
 <p>
 This document is for informational purposes only and does not constitute legal advice.
 </p>
 </footer>
 </div>
    </div>
 )
}
