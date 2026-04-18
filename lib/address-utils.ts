import { isAddress as isEvmAddressViem } from 'viem'

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const BITCOIN_BASE58_REGEX = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/
const BITCOIN_BECH32_REGEX = /^(bc1|tb1)[ac-hj-np-z02-9]{11,71}$/i
const STACKS_ADDRESS_REGEX = /^S[MPNT][A-Z0-9]{39}$/i
const BLOCKCHAIN_NAME_REGEX = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i

export function isEvmAddress(value?: string | null): boolean {
  if (!value) return false
  return isEvmAddressViem(value.trim())
}

export function isSolanaAddress(value?: string | null): boolean {
  if (!value) return false
  const trimmed = value.trim()
  return !trimmed.startsWith('0x') && SOLANA_ADDRESS_REGEX.test(trimmed)
}

export function isBitcoinAddress(value?: string | null): boolean {
  if (!value) return false
  const trimmed = value.trim()
  return BITCOIN_BASE58_REGEX.test(trimmed) || BITCOIN_BECH32_REGEX.test(trimmed)
}

export function isStacksAddress(value?: string | null): boolean {
  if (!value) return false
  return STACKS_ADDRESS_REGEX.test(value.trim())
}

export function isSupportedWalletAddress(value?: string | null): boolean {
  return isEvmAddress(value) || isSolanaAddress(value) || isBitcoinAddress(value) || isStacksAddress(value)
}

export function looksLikeBlockchainName(value?: string | null): boolean {
  if (!value) return false
  return BLOCKCHAIN_NAME_REGEX.test(value.trim())
}

export function normalizeWalletAddress(value?: string | null): string {
  const trimmed = value?.trim() || ''
  if (!trimmed) return ''
  if (isEvmAddress(trimmed)) return trimmed.toLowerCase()
  if (/^(bc1|tb1)/i.test(trimmed)) return trimmed.toLowerCase()
  return trimmed
}

export function getAddressLookupKey(value?: string | null): string {
  return normalizeWalletAddress(value)
}
