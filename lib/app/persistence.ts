import type { Asset, Beneficiary, Allocation, QueuedWalletSession } from '@/types'
import type { PricingTier } from '@/lib/pricing'
import type { Step } from './steps'

/**
 * localStorage persistence for the /app step UI.
 *
 * This is a mechanical extraction of the load/save logic that previously lived
 * inline inside `app/app/page.tsx`. Behavior is intentionally identical:
 *   - Same storage key.
 *   - Same per-field truthiness gating on load (`if (parsed.x) setX(parsed.x)`).
 *   - Same set of fields persisted, in the same shape.
 *   - Same swallow-and-log error handling.
 */

export const APP_STATE_STORAGE_KEY = 'lastwish_state'

export interface PersistedAppStateInput {
  assets: Asset[]
  beneficiaries: Beneficiary[]
  allocations: Allocation[]
  selectedAssetIds: string[]
  ownerName: string
  ownerFullName: string
  ownerEnsName: string
  ownerAddress: string
  ownerCity: string
  ownerState: string
  ownerZipCode: string
  ownerPhone: string
  executorName: string
  executorAddress: string
  executorPhone: string
  executorEmail: string
  executorTwitter: string
  executorLinkedIn: string
  keyInstructions: string
  resolvedEnsNames: Record<string, string>
  paymentWalletAddress: string | null
  step: Step
  invoiceId: string | null
  paymentVerified: boolean
  discountCode: string
  discountApplied: boolean
  queuedSessions: QueuedWalletSession[]
  selectedTier: PricingTier
  connectedEVMAddresses: Set<string>
  connectedSolanaAddresses: Set<string>
  verifiedAddresses: Set<string>
  btcAddress: string | null
  walletNames: Record<string, string>
  walletProviders: Record<string, string>
}

export function buildPersistedState(input: PersistedAppStateInput): Record<string, unknown> {
  return {
    assets: input.assets,
    beneficiaries: input.beneficiaries,
    allocations: input.allocations,
    selectedAssetIds: input.selectedAssetIds,
    ownerName: input.ownerName,
    ownerFullName: input.ownerFullName,
    ownerEnsName: input.ownerEnsName || undefined,
    ownerAddress: input.ownerAddress,
    ownerCity: input.ownerCity,
    ownerState: input.ownerState,
    ownerZipCode: input.ownerZipCode,
    ownerPhone: input.ownerPhone,
    executorName: input.executorName,
    executorAddress: input.executorAddress,
    executorPhone: input.executorPhone,
    executorEmail: input.executorEmail,
    executorTwitter: input.executorTwitter,
    executorLinkedIn: input.executorLinkedIn,
    keyInstructions: input.keyInstructions,
    resolvedEnsNames: input.resolvedEnsNames,
    paymentWalletAddress: input.paymentWalletAddress,
    step: input.step,
    invoiceId: input.invoiceId,
    paymentVerified: input.paymentVerified,
    discountCode: input.discountCode,
    discountApplied: input.discountApplied,
    queuedSessions: input.queuedSessions,
    selectedTier: input.selectedTier,
    connectedEVMAddresses: Array.from(input.connectedEVMAddresses),
    connectedSolanaAddresses: Array.from(input.connectedSolanaAddresses),
    verifiedAddresses: Array.from(input.verifiedAddresses),
    btcAddress: input.btcAddress,
    walletNames: input.walletNames,
    walletProviders: input.walletProviders,
  }
}

export function savePersistedState(input: PersistedAppStateInput): void {
  if (typeof window === 'undefined') return
  try {
    const stateToSave = buildPersistedState(input)
    localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify(stateToSave))
  } catch (err) {
    console.error('Error saving state:', err)
  }
}

export interface PersistedAppStateSetters {
  setAssets: (v: Asset[]) => void
  setBeneficiaries: (v: Beneficiary[]) => void
  setAllocations: (v: Allocation[]) => void
  setSelectedAssetIds: (v: string[]) => void
  setOwnerName: (v: string) => void
  setOwnerFullName: (v: string) => void
  setOwnerEnsName: (v: string) => void
  setOwnerAddress: (v: string) => void
  setOwnerCity: (v: string) => void
  setOwnerState: (v: string) => void
  setOwnerZipCode: (v: string) => void
  setOwnerPhone: (v: string) => void
  setExecutorName: (v: string) => void
  setExecutorAddress: (v: string) => void
  setExecutorPhone: (v: string) => void
  setExecutorEmail: (v: string) => void
  setExecutorTwitter: (v: string) => void
  setExecutorLinkedIn: (v: string) => void
  setKeyInstructions: (v: string) => void
  setResolvedEnsNames: (v: Record<string, string>) => void
  setPaymentWalletAddress: (v: string) => void
  setStep: (v: Step) => void
  setInvoiceId: (v: string) => void
  setPaymentVerified: (v: boolean) => void
  setDiscountCode: (v: string) => void
  setDiscountApplied: (v: boolean) => void
  setQueuedSessions: (v: QueuedWalletSession[]) => void
  setSelectedTier: (v: PricingTier) => void
  setConnectedEVMAddresses: (v: Set<string>) => void
  setVerifiedAddresses: (v: Set<string>) => void
  setBtcAddress: (v: string) => void
  setConnectedSolanaAddresses: (v: Set<string>) => void
  setWalletNames: (v: Record<string, string>) => void
  setWalletProviders: (v: Record<string, string>) => void
  // Refs that must be kept in sync with their state counterparts.
  resolvedEnsNamesRef: { current: Record<string, string> }
  walletNamesRef: { current: Record<string, string> }
}

/**
 * Reads the persisted state from localStorage and applies it via the supplied
 * setters/refs. Returns true when something was loaded (matching the previous
 * inline behavior, which only restored fields when truthy).
 *
 * NOTE: Per-field truthiness gating is intentional and preserves the prior
 * inline behavior (e.g. an empty string did not overwrite the default).
 */
export function loadPersistedState(setters: PersistedAppStateSetters): boolean {
  if (typeof window === 'undefined') return false

  try {
    const saved = localStorage.getItem(APP_STATE_STORAGE_KEY)
    if (!saved) return false

    const parsed = JSON.parse(saved) ?? {}

    if (parsed.assets) setters.setAssets(parsed.assets)
    if (parsed.beneficiaries) setters.setBeneficiaries(parsed.beneficiaries)
    if (parsed.allocations) setters.setAllocations(parsed.allocations)
    if (parsed.selectedAssetIds) setters.setSelectedAssetIds(parsed.selectedAssetIds)
    if (parsed.ownerName) setters.setOwnerName(parsed.ownerName)
    if (parsed.ownerFullName) setters.setOwnerFullName(parsed.ownerFullName)
    if (parsed.ownerEnsName) setters.setOwnerEnsName(parsed.ownerEnsName)
    if (parsed.ownerAddress) setters.setOwnerAddress(parsed.ownerAddress)
    if (parsed.ownerCity) setters.setOwnerCity(parsed.ownerCity)
    if (parsed.ownerState) setters.setOwnerState(parsed.ownerState)
    if (parsed.ownerZipCode) setters.setOwnerZipCode(parsed.ownerZipCode)
    if (parsed.ownerPhone) setters.setOwnerPhone(parsed.ownerPhone)
    if (parsed.executorName) setters.setExecutorName(parsed.executorName)
    if (parsed.executorAddress) setters.setExecutorAddress(parsed.executorAddress)
    if (parsed.executorPhone) setters.setExecutorPhone(parsed.executorPhone)
    if (parsed.executorEmail) setters.setExecutorEmail(parsed.executorEmail)
    if (parsed.executorTwitter) setters.setExecutorTwitter(parsed.executorTwitter)
    if (parsed.executorLinkedIn) setters.setExecutorLinkedIn(parsed.executorLinkedIn)
    if (parsed.keyInstructions) setters.setKeyInstructions(parsed.keyInstructions)
    if (parsed.resolvedEnsNames) {
      setters.setResolvedEnsNames(parsed.resolvedEnsNames)
      setters.resolvedEnsNamesRef.current = parsed.resolvedEnsNames
    }
    if (parsed.paymentWalletAddress) setters.setPaymentWalletAddress(parsed.paymentWalletAddress)
    if (parsed.step) setters.setStep(parsed.step)
    if (parsed.invoiceId) setters.setInvoiceId(parsed.invoiceId)
    if (parsed.paymentVerified) setters.setPaymentVerified(parsed.paymentVerified)
    if (parsed.discountCode) setters.setDiscountCode(parsed.discountCode)
    if (parsed.discountApplied) setters.setDiscountApplied(parsed.discountApplied)
    if (parsed.queuedSessions) setters.setQueuedSessions(parsed.queuedSessions)
    if (parsed.selectedTier) setters.setSelectedTier(parsed.selectedTier)

    if (parsed.connectedEVMAddresses && Array.isArray(parsed.connectedEVMAddresses)) {
      setters.setConnectedEVMAddresses(new Set(parsed.connectedEVMAddresses))
    }
    if (parsed.verifiedAddresses && Array.isArray(parsed.verifiedAddresses)) {
      setters.setVerifiedAddresses(new Set(parsed.verifiedAddresses))
    }
    if (parsed.btcAddress) setters.setBtcAddress(parsed.btcAddress)
    if (parsed.connectedSolanaAddresses && Array.isArray(parsed.connectedSolanaAddresses)) {
      setters.setConnectedSolanaAddresses(new Set(parsed.connectedSolanaAddresses))
    }
    if (parsed.walletNames) {
      setters.setWalletNames(parsed.walletNames)
      setters.walletNamesRef.current = parsed.walletNames
    }
    if (parsed.walletProviders) setters.setWalletProviders(parsed.walletProviders)

    return true
  } catch (err) {
    console.error('Error loading saved state:', err)
    return false
  }
}
