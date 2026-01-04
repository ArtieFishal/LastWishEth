export interface Asset {
  id: string
  chain: string
  type: 'native' | 'erc20' | 'erc721' | 'erc1155' | 'btc' | 'ethscription'
  symbol: string
  name: string
  balance: string
  balanceFormatted: string
  usdValue?: number
  contractAddress?: string
  tokenId?: string
  collectionName?: string
  decimals?: number
  walletAddress?: string // Wallet address this asset belongs to
  walletProvider?: string // Wallet provider name (MetaMask, Rainbow, WalletConnect, Xverse, etc.)
  imageUrl?: string // NFT image URL
  metadata?: any // Full NFT metadata
  // Ethscription-specific fields
  ethscriptionId?: string // The transaction hash or ethscription ID
  contentUri?: string // The content URI for the ethscription
}

export interface Beneficiary {
  id: string
  name: string
  walletAddress: string
  ensName?: string // Resolved ENS name for Ethereum addresses
  phone?: string // Optional phone number
  email?: string // Optional email
  notes?: string // Optional notes/description
}

export interface Allocation {
  assetId: string
  beneficiaryId: string
  amount?: string
  percentage?: number
  type: 'amount' | 'percentage'
}

export interface QueuedWalletSession {
  id: string // Unique ID for this session
  walletAddress: string
  walletType: 'evm' | 'btc'
  walletProvider?: string // Wallet provider name (MetaMask, Rainbow, WalletConnect, Xverse, etc.)
  ensName?: string // Resolved ENS name if available
  walletName?: string // Custom wallet name (manual or auto-resolved)
  assets: Asset[]
  allocations: Allocation[] // Allocations for assets in this wallet
  verified: boolean
  createdAt: number // Timestamp
}

export interface UserData {
  ownerName: string
  ownerFullName: string
  ownerEnsName?: string // Optional ENS name for owner
  ownerAddress: string
  ownerCity: string
  ownerState: string
  ownerZipCode: string
  ownerPhone: string
  executorName: string
  executorAddress?: string // Optional - can be empty if executor doesn't have a wallet
  executorPhone?: string
  executorEmail?: string
  executorTwitter?: string
  executorLinkedIn?: string
  beneficiaries: Beneficiary[]
  allocations: Allocation[]
  keyInstructions: string
  connectedWallets: {
    evm: string[]
    btc?: string
  }
  walletNames: Record<string, string> // Maps address to ENS name or custom name
  resolvedEnsNames?: Record<string, string> // Maps lowercase address to ENS name
}

export interface Invoice {
  id: string
  amount: string
  token: string
  chain: string
  recipientAddress: string
  status: 'pending' | 'paid' | 'expired'
  createdAt: string
}

