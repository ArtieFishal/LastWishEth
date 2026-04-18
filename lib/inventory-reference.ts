import type { Asset } from '@/types'

export interface InventoryReferenceEntry {
  key: string
  label: string
  detail?: string
  countLabel: string
  assetIds: string[]
  selectableAssetIds: string[]
  selectedCount: number
}

export interface InventoryReferenceCategory {
  name: string
  entries: InventoryReferenceEntry[]
}

export interface InventoryReferenceChainGroup {
  chain: string
  categories: InventoryReferenceCategory[]
}

export interface InventoryReferenceWalletGroup {
  walletKey: string
  walletLabel: string
  walletShort: string
  chains: InventoryReferenceChainGroup[]
}

export interface InventoryReferenceData {
  wallets: InventoryReferenceWalletGroup[]
  walletCount: number
  chainCount: number
  assetCount: number
  selectedCount: number
}

function getWalletLabel(asset: Asset, walletNames: Record<string, string>, resolvedEnsNames: Record<string, string>) {
  const walletAddress = asset.walletAddress || asset.contractAddress || 'Unknown wallet'
  const addressKey = walletAddress.toLowerCase()
  const label = walletNames[walletAddress] || resolvedEnsNames[addressKey] || walletAddress
  const short = walletAddress.length > 18 ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : walletAddress
  return {
    walletKey: walletAddress,
    walletLabel: label,
    walletShort: short,
  }
}

export function getInventoryCategory(asset: Asset): string {
  if (asset.type === 'ethscription') return 'Ethscriptions'
  if (asset.type === 'ordinal') return 'Ordinals'
  if (asset.type === 'erc721' || asset.type === 'erc1155' || asset.type === 'nft') return 'Collectibles'
  if (asset.type === 'erc20' || asset.type === 'spl-token' || asset.type === 'native' || asset.type === 'btc') return 'Currencies'
  return 'Other'
}

function getEntryKey(asset: Asset): string {
  const category = getInventoryCategory(asset)
  if (category === 'Currencies') return `${asset.chain}:${asset.contractAddress || asset.symbol}`
  if (category === 'Collectibles') return `${asset.chain}:${asset.collectionName || asset.contractAddress || asset.name}`
  if (category === 'Ethscriptions') return `${asset.chain}:ethscriptions`
  if (category === 'Ordinals') return `${asset.chain}:ordinals`
  return `${asset.chain}:${asset.id}`
}

function getEntryLabel(asset: Asset): { label: string; detail?: string; countLabel: string } {
  const category = getInventoryCategory(asset)

  if (category === 'Currencies') {
    return {
      label: `${asset.symbol} · ${asset.name}`,
      detail: asset.contractAddress && asset.type !== 'native' && asset.type !== 'btc' ? asset.contractAddress : undefined,
      countLabel: asset.balanceFormatted,
    }
  }

  if (category === 'Collectibles') {
    return {
      label: asset.collectionName || asset.name || asset.symbol,
      detail: asset.symbol !== 'NFT' ? asset.symbol : undefined,
      countLabel: '1 item',
    }
  }

  if (category === 'Ethscriptions') {
    return {
      label: 'Ethscriptions',
      detail: 'Grouped by current wallet',
      countLabel: '1 item',
    }
  }

  if (category === 'Ordinals') {
    return {
      label: 'Ordinals',
      detail: 'Grouped by current wallet',
      countLabel: '1 item',
    }
  }

  return {
    label: asset.name || asset.symbol,
    countLabel: asset.balanceFormatted,
  }
}

export function isSelectableInventoryAsset(asset: Asset): boolean {
  return !(asset.type === 'btc' && asset.metadata?.hasOrdinals)
}

export function buildInventoryReference(
  assets: Asset[],
  options: {
    selectedAssetIds?: string[]
    walletNames?: Record<string, string>
    resolvedEnsNames?: Record<string, string>
  } = {}
): InventoryReferenceData {
  const {
    selectedAssetIds = [],
    walletNames = {},
    resolvedEnsNames = {},
  } = options

  const selectedSet = new Set(selectedAssetIds)
  const walletMap = new Map<string, {
    walletLabel: string
    walletShort: string
    chains: Map<string, Map<string, Map<string, InventoryReferenceEntry>>>
  }>()

  for (const asset of assets) {
    const wallet = getWalletLabel(asset, walletNames, resolvedEnsNames)
    if (!walletMap.has(wallet.walletKey)) {
      walletMap.set(wallet.walletKey, {
        walletLabel: wallet.walletLabel,
        walletShort: wallet.walletShort,
        chains: new Map(),
      })
    }

    const walletGroup = walletMap.get(wallet.walletKey)!
    const chainKey = asset.chain || 'unknown'
    const category = getInventoryCategory(asset)
    const entryKey = getEntryKey(asset)
    const entryMeta = getEntryLabel(asset)

    if (!walletGroup.chains.has(chainKey)) {
      walletGroup.chains.set(chainKey, new Map())
    }
    const chainGroup = walletGroup.chains.get(chainKey)!

    if (!chainGroup.has(category)) {
      chainGroup.set(category, new Map())
    }
    const categoryGroup = chainGroup.get(category)!

    if (!categoryGroup.has(entryKey)) {
      categoryGroup.set(entryKey, {
        key: entryKey,
        label: entryMeta.label,
        detail: entryMeta.detail,
        countLabel: entryMeta.countLabel,
        assetIds: [],
        selectableAssetIds: [],
        selectedCount: 0,
      })
    }

    const entry = categoryGroup.get(entryKey)!
    entry.assetIds.push(asset.id)
    if (isSelectableInventoryAsset(asset)) {
      entry.selectableAssetIds.push(asset.id)
      if (selectedSet.has(asset.id)) entry.selectedCount += 1
    }

    if (category === 'Collectibles' || category === 'Ethscriptions' || category === 'Ordinals') {
      const count = entry.assetIds.length
      entry.countLabel = `${count} ${count === 1 ? 'item' : 'items'}`
    }
  }

  const wallets: InventoryReferenceWalletGroup[] = [...walletMap.entries()]
    .map(([walletKey, walletGroup]) => ({
      walletKey,
      walletLabel: walletGroup.walletLabel,
      walletShort: walletGroup.walletShort,
      chains: [...walletGroup.chains.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([chain, categories]) => ({
          chain,
          categories: [...categories.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, entries]) => ({
              name,
              entries: [...entries.values()].sort((a, b) => a.label.localeCompare(b.label)),
            })),
        })),
    }))
    .sort((a, b) => a.walletLabel.localeCompare(b.walletLabel))

  return {
    wallets,
    walletCount: wallets.length,
    chainCount: wallets.reduce((sum, wallet) => sum + wallet.chains.length, 0),
    assetCount: assets.length,
    selectedCount: selectedAssetIds.length,
  }
}
