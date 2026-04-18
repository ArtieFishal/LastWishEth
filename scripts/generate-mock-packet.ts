import fs from 'node:fs/promises'
import path from 'node:path'
import { generatePDF } from '../lib/pdf-generator'
import type { Allocation, Asset, Beneficiary, UserData, WalletGroup } from '../types'
import { getAddressLookupKey } from '../lib/address-utils'

const ethWallet = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
const solWallet = '9xQeWvG816bUx9EPf8n4qCZdrDam6DCQE4k74vNysGEo'
const btcWallet = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
const btcNameAddress = 'SP3BB8XZ049ECNX2VRAFPD67SQRXGVZX0TM9MS2S0'
const sarahWallet = '4Nd1mSxQshFZ3VAb9YSEuxsjjXNMTvFyfgQ6VbUaz2Ys'

const beneficiaries: Beneficiary[] = [
  {
    id: 'ben-1',
    name: 'Sarah Carter',
    walletAddress: sarahWallet,
    ensName: 'sarahlegacy.sol',
    phone: '615-555-0101',
    email: 'sarah@example.com',
    address: '114 Cedar Lane',
    city: 'Nashville',
    state: 'TN',
    zipCode: '37203',
    notes: 'Primary executor and family coordinator.',
  },
  {
    id: 'ben-2',
    name: 'Michael Carter',
    walletAddress: btcNameAddress,
    ensName: 'satoshi.btc',
    phone: '615-555-0102',
    email: 'michael@example.com',
    address: '88 Hillcrest Ave',
    city: 'Knoxville',
    state: 'TN',
    zipCode: '37902',
    notes: 'Receives long-term reserve assets.',
  },
  {
    id: 'ben-3',
    name: 'Nina Alvarez',
    walletAddress: '0x5aeda56215b167893e80b4fe645ba6d5bab767de',
    ensName: 'ninaheir.eth',
    phone: '407-555-0103',
    email: 'nina@example.com',
    address: '22 Palm Street',
    city: 'Orlando',
    state: 'FL',
    zipCode: '32801',
    notes: 'Receives ETH and stablecoin allocation.',
  },
  {
    id: 'ben-4',
    name: 'Jordan Reed',
    walletAddress: 'bc1p5cyxnuxmeuwuvkwfem96lxyepd0wcx8r8g4x0j',
    phone: '206-555-0104',
    email: 'jordan@example.com',
    address: '407 Pine Market Rd',
    city: 'Seattle',
    state: 'WA',
    zipCode: '98101',
    notes: 'Receives bitcoin and ordinal allocation.',
  },
  {
    id: 'ben-5',
    name: 'Amira Khan',
    walletAddress: '7YWHG2K9sJ5M2nJpFwNfER3sYb6tYrzNRXS6Smttu99o',
    phone: '512-555-0105',
    email: 'amira@example.com',
    address: '501 Barton Springs Rd',
    city: 'Austin',
    state: 'TX',
    zipCode: '78704',
    notes: 'Receives Solana ecosystem assets and NFTs.',
  },
]

const assets: Asset[] = [
  {
    id: 'asset-eth',
    chain: 'ethereum',
    type: 'native',
    symbol: 'ETH',
    name: 'Ethereum',
    balance: '12.5',
    balanceFormatted: '12.50 ETH',
    usdValue: 41250,
    walletAddress: ethWallet,
    walletProvider: 'MetaMask',
  },
  {
    id: 'asset-usdc',
    chain: 'ethereum',
    type: 'erc20',
    symbol: 'USDC',
    name: 'USD Coin',
    balance: '18500',
    balanceFormatted: '18,500 USDC',
    usdValue: 18500,
    walletAddress: ethWallet,
    walletProvider: 'MetaMask',
  },
  {
    id: 'asset-nft',
    chain: 'ethereum',
    type: 'erc721',
    symbol: 'NFT',
    name: 'Legacy Art Pass',
    balance: '1',
    balanceFormatted: '1 NFT',
    walletAddress: ethWallet,
    walletProvider: 'MetaMask',
    collectionName: 'Legacy Art Vault',
    tokenId: '144',
    metadata: {
      collection: 'Legacy Art Vault',
      description: 'Signature NFT left to a family collector.',
    },
  },
  {
    id: 'asset-sol',
    chain: 'solana',
    type: 'native',
    symbol: 'SOL',
    name: 'Solana',
    balance: '240',
    balanceFormatted: '240 SOL',
    usdValue: 38400,
    walletAddress: solWallet,
    walletProvider: 'Phantom',
  },
  {
    id: 'asset-bonk',
    chain: 'solana',
    type: 'spl-token',
    symbol: 'BONK',
    name: 'Bonk',
    balance: '25000000',
    balanceFormatted: '25,000,000 BONK',
    usdValue: 650,
    walletAddress: solWallet,
    walletProvider: 'Phantom',
  },
  {
    id: 'asset-btc',
    chain: 'bitcoin',
    type: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    balance: '1.85',
    balanceFormatted: '1.85 BTC',
    usdValue: 129500,
    walletAddress: btcWallet,
    walletProvider: 'Xverse',
    contractAddress: btcWallet,
    metadata: {
      sats: '185000000',
      satsFormatted: '185,000,000 sats',
    },
  },
  {
    id: 'asset-ordinal',
    chain: 'bitcoin',
    type: 'ordinal',
    symbol: 'ORD',
    name: 'Family Archive Ordinal',
    balance: '1',
    balanceFormatted: '1 Ordinal',
    walletAddress: btcWallet,
    walletProvider: 'Xverse',
    contractAddress: btcWallet,
    metadata: {
      assetType: 'ordinal',
      inscriptionId: 'b61b3b1f8b2e0d5589d981c75c8c5fd021e0f1edfe13f67f8d5015c60d9d8d3fi0',
      note: 'Keepsake ordinal intended for Jordan.',
    },
  },
]

const allocations: Allocation[] = [
  { assetId: 'asset-eth', beneficiaryId: 'ben-1', percentage: 40, type: 'percentage' },
  { assetId: 'asset-eth', beneficiaryId: 'ben-3', percentage: 35, type: 'percentage' },
  { assetId: 'asset-eth', beneficiaryId: 'ben-5', percentage: 25, type: 'percentage' },
  { assetId: 'asset-usdc', beneficiaryId: 'ben-1', percentage: 25, type: 'percentage' },
  { assetId: 'asset-usdc', beneficiaryId: 'ben-2', percentage: 25, type: 'percentage' },
  { assetId: 'asset-usdc', beneficiaryId: 'ben-3', percentage: 25, type: 'percentage' },
  { assetId: 'asset-usdc', beneficiaryId: 'ben-4', percentage: 25, type: 'percentage' },
  { assetId: 'asset-nft', beneficiaryId: 'ben-5', amount: '1', type: 'amount' },
  { assetId: 'asset-sol', beneficiaryId: 'ben-1', percentage: 50, type: 'percentage' },
  { assetId: 'asset-sol', beneficiaryId: 'ben-5', percentage: 50, type: 'percentage' },
  { assetId: 'asset-bonk', beneficiaryId: 'ben-1', percentage: 50, type: 'percentage' },
  { assetId: 'asset-bonk', beneficiaryId: 'ben-5', percentage: 50, type: 'percentage' },
  { assetId: 'asset-btc', beneficiaryId: 'ben-2', percentage: 55, type: 'percentage' },
  { assetId: 'asset-btc', beneficiaryId: 'ben-4', percentage: 45, type: 'percentage' },
  { assetId: 'asset-ordinal', beneficiaryId: 'ben-4', amount: '1', type: 'amount' },
]

const walletGroups: Record<string, WalletGroup> = {
  [getAddressLookupKey(ethWallet)]: 'long-term',
  [getAddressLookupKey(solWallet)]: 'active-trading',
  [getAddressLookupKey(btcWallet)]: 'cold-storage',
}

const resolvedNames: Record<string, string> = {
  [getAddressLookupKey(ethWallet)]: 'jamielegacy.eth',
  [getAddressLookupKey(solWallet)]: 'jamievault.sol',
  [getAddressLookupKey(btcNameAddress)]: 'satoshi.btc',
  [getAddressLookupKey(beneficiaries[0].walletAddress!)]: beneficiaries[0].ensName!,
  [getAddressLookupKey(beneficiaries[1].walletAddress!)]: beneficiaries[1].ensName!,
  [getAddressLookupKey(beneficiaries[2].walletAddress!)]: beneficiaries[2].ensName!,
}

const walletNames: Record<string, string> = {
  [ethWallet]: 'Primary Ethereum Wallet',
  [solWallet]: 'Phantom Solana Wallet',
  [btcWallet]: 'Xverse Bitcoin Vault',
}

const userData: UserData = {
  ownerName: 'Jamie Rowan',
  ownerFullName: 'Jamie Rowan',
  ownerEnsName: 'jamielegacy.eth',
  ownerAddress: ethWallet,
  ownerCity: 'Asheville',
  ownerState: 'NC',
  ownerZipCode: '28801',
  ownerPhone: '828-555-0199',
  executorName: beneficiaries[0].name,
  executorAddress: beneficiaries[0].walletAddress,
  executorPhone: beneficiaries[0].phone,
  executorEmail: beneficiaries[0].email,
  executorTwitter: '@sarahlegacy',
  executorLinkedIn: 'linkedin.com/in/sarah-carter-estates',
  beneficiaries,
  allocations,
  keyInstructions:
    'Master recovery instructions are stored in a sealed envelope in the home safe and a duplicate is with family counsel. Executor should verify identity, locate device passcodes, confirm estate authority, then move long-term holdings last after stable assets are accounted for.',
  connectedWallets: {
    evm: [ethWallet],
    btc: btcWallet,
    solana: [solWallet],
  },
  walletNames,
  resolvedEnsNames: resolvedNames,
  walletGroups,
}

const walletProviders: Record<string, string> = {
  [ethWallet]: 'MetaMask',
  [solWallet]: 'Phantom',
  [btcWallet]: 'Xverse',
}

async function main() {
  const pdfBytes = await generatePDF(userData, assets, walletProviders)
  const outputDir = path.resolve(process.cwd(), 'mock-output')
  await fs.mkdir(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, 'lastwish-mock-complete-packet.pdf')
  await fs.writeFile(outputPath, pdfBytes)
  console.log(outputPath)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
