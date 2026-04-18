'use client'

import { useMemo, useState } from 'react'
import type { Asset } from '@/types'
import { buildInventoryReference } from '@/lib/inventory-reference'

interface GroupedInventoryReferenceProps {
  assets: Asset[]
  selectedAssetIds?: string[]
  walletNames?: Record<string, string>
  resolvedEnsNames?: Record<string, string>
  onToggleGroupSelection?: (assetIds: string[]) => void
}

const chainBadgeClass: Record<string, string> = {
  eth: 'bg-blue-500/15 text-blue-100 border border-blue-400/20',
  base: 'bg-indigo-500/15 text-indigo-100 border border-indigo-400/20',
  arbitrum: 'bg-cyan-500/15 text-cyan-100 border border-cyan-400/20',
  polygon: 'bg-purple-500/15 text-purple-100 border border-purple-400/20',
  bitcoin: 'bg-orange-500/15 text-orange-100 border border-orange-400/20',
  solana: 'bg-fuchsia-500/15 text-fuchsia-100 border border-fuchsia-400/20',
  apechain: 'bg-yellow-500/15 text-yellow-100 border border-yellow-400/20',
}

export function GroupedInventoryReference({
  assets,
  selectedAssetIds = [],
  walletNames = {},
  resolvedEnsNames = {},
  onToggleGroupSelection,
}: GroupedInventoryReferenceProps) {
  const [expanded, setExpanded] = useState(true)

  const data = useMemo(() => buildInventoryReference(assets, {
    selectedAssetIds,
    walletNames,
    resolvedEnsNames,
  }), [assets, selectedAssetIds, walletNames, resolvedEnsNames])

  if (assets.length === 0) return null

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80 mb-2">Inventory Reference</p>
          <h3 className="text-xl font-bold text-white">Grouped wallet inventory</h3>
          <p className="text-sm text-gray-300 mt-1">
            A clean reference view of what each wallet currently holds, grouped by chain and asset class.
          </p>
        </div>
        <button
          onClick={() => setExpanded(value => !value)}
          className="self-start px-3 py-2 rounded-lg bg-white/10 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
        >
          {expanded ? 'Hide reference' : 'Show reference'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="px-3 py-1 rounded-full bg-white/10 text-sm text-white">{data.walletCount} wallets</span>
        <span className="px-3 py-1 rounded-full bg-white/10 text-sm text-white">{data.chainCount} chain sections</span>
        <span className="px-3 py-1 rounded-full bg-white/10 text-sm text-white">{data.assetCount} assets</span>
        <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-sm text-emerald-100 border border-emerald-400/20">
          {data.selectedCount} selected
        </span>
      </div>

      {expanded && (
        <div className="mt-5 space-y-4">
          {data.wallets.map(wallet => (
            <div key={wallet.walletKey} className="rounded-xl border border-white/10 bg-black/15 p-4">
              <div className="mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-lg font-semibold text-white">{wallet.walletLabel}</h4>
                  {wallet.walletLabel !== wallet.walletShort && (
                    <span className="text-xs font-mono text-gray-400">{wallet.walletShort}</span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {wallet.chains.map(chainGroup => (
                  <div key={`${wallet.walletKey}-${chainGroup.chain}`} className="rounded-xl bg-white/5 p-4 border border-white/5">
                    <div className="mb-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${chainBadgeClass[chainGroup.chain.toLowerCase()] || 'bg-white/10 text-white border border-white/10'}`}>
                        {chainGroup.chain}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {chainGroup.categories.map(category => (
                        <div key={`${chainGroup.chain}-${category.name}`} className="rounded-lg bg-black/20 p-3 border border-white/5">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-white">{category.name}</p>
                            <span className="text-xs text-gray-400">{category.entries.length} groups</span>
                          </div>
                          <div className="space-y-2">
                            {category.entries.map(entry => {
                              const selectable = entry.selectableAssetIds.length > 0 && !!onToggleGroupSelection
                              const allSelected = selectable && entry.selectedCount === entry.selectableAssetIds.length

                              return (
                                <button
                                  key={entry.key}
                                  type="button"
                                  disabled={!selectable}
                                  onClick={() => selectable && onToggleGroupSelection(entry.selectableAssetIds)}
                                  className={`w-full text-left rounded-lg px-3 py-2 transition-colors border ${
                                    selectable
                                      ? allSelected
                                        ? 'bg-emerald-500/15 border-emerald-400/30 hover:bg-emerald-500/20'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                                      : 'bg-white/5 border-white/5 opacity-75 cursor-default'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-white truncate">{entry.label}</p>
                                      {entry.detail && (
                                        <p className="text-xs text-gray-400 truncate">{entry.detail}</p>
                                      )}
                                      {selectable ? (
                                        <p className="text-[11px] text-cyan-200/80 mt-1">
                                          {allSelected ? 'Click to deselect this group' : 'Click to select this group'}
                                        </p>
                                      ) : (
                                        <p className="text-[11px] text-amber-300/80 mt-1">Reference only</p>
                                      )}
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="text-sm font-semibold text-cyan-100">{entry.countLabel}</p>
                                      {entry.selectedCount > 0 && (
                                        <p className="text-[11px] text-emerald-300">{entry.selectedCount} selected</p>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
