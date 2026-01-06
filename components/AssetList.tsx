'use client'

import { Asset } from '@/types'
import { NFTImage } from './NFTImage'

interface AssetListProps {
  assets: Asset[]
}

const getChainColor = (chain: string) => {
  const colors: Record<string, string> = {
    eth: 'bg-blue-100 text-blue-800',
    base: 'bg-indigo-100 text-indigo-800',
    arbitrum: 'bg-cyan-100 text-cyan-800',
    polygon: 'bg-purple-100 text-purple-800',
    bitcoin: 'bg-orange-100 text-orange-800',
    apechain: 'bg-yellow-100 text-yellow-800',
  }
  return colors[chain.toLowerCase()] || 'bg-gray-100 text-gray-800'
}

export function AssetList({ assets }: AssetListProps) {
  if (assets.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m16-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="text-gray-500 font-medium">No assets found</p>
        <p className="text-sm text-gray-400 mt-1">Connect your wallets to see your holdings</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {assets.map((asset) => (
        <div
          key={asset.id}
          className="rounded-lg border-2 border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all bg-white"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-bold text-lg text-gray-900">{asset.symbol}</span>
                <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${getChainColor(asset.chain)}`}>
                  {asset.chain}
                </span>
                {asset.type === 'erc721' || asset.type === 'erc1155' ? (
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-semibold">
                    NFT
                  </span>
                ) : null}
                {asset.type === 'ethscription' ? (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-semibold">
                    ETHSCRIPTION
                  </span>
                ) : null}
                {asset.type === 'ordinal' ? (
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-semibold">
                    ORDINAL
                  </span>
                ) : null}
                {asset.type === 'btc' && asset.metadata?.hasOrdinals ? (
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-semibold">
                    HAS ORDINALS ({asset.metadata.ordinalsCount})
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-gray-600 font-medium">{asset.name}</p>
              {asset.type === 'btc' && asset.walletAddress && (
                <p className="text-xs text-gray-500 font-mono mt-1 break-all" title={asset.walletAddress}>
                  Address: {asset.walletAddress}
                </p>
              )}
              {asset.tokenId && (
                <p className="text-xs text-gray-500 font-mono mt-1">Token ID: {asset.tokenId}</p>
              )}
              {asset.type === 'ordinal' && (
                <div className="mt-2 space-y-1">
                  {asset.metadata?.inscriptionId && (
                    <p className="text-xs text-gray-600 font-semibold">
                      Inscription #{asset.metadata.inscriptionId}
                    </p>
                  )}
                  {asset.metadata?.contentType && (
                    <p className="text-xs text-gray-500">
                      Type: {asset.metadata.contentType}
                    </p>
                  )}
                </div>
              )}
              {asset.type === 'ethscription' && (
                <div className="mt-2 space-y-1">
                  {asset.metadata?.ethscriptionNumber && (
                    <p className="text-xs text-gray-600 font-semibold">
                      Ethscription #{asset.metadata.ethscriptionNumber}
                    </p>
                  )}
                  {asset.ethscriptionId && (
                    <p className="text-xs text-gray-500 font-mono truncate" title={asset.ethscriptionId}>
                      TX: {asset.ethscriptionId.slice(0, 10)}...{asset.ethscriptionId.slice(-8)}
                    </p>
                  )}
                  {asset.metadata?.mimetype && (
                    <p className="text-xs text-gray-500">
                      Type: {asset.metadata.mimetype}
                    </p>
                  )}
                  {asset.metadata?.creator && (
                    <p className="text-xs text-gray-500 font-mono truncate" title={asset.metadata.creator}>
                      Creator: {asset.metadata.creator.slice(0, 6)}...{asset.metadata.creator.slice(-4)}
                    </p>
                  )}
                  {asset.metadata?.currentOwner && asset.metadata.currentOwner !== asset.metadata?.creator && (
                    <p className="text-xs text-gray-500 font-mono truncate" title={asset.metadata.currentOwner}>
                      Owner: {asset.metadata.currentOwner.slice(0, 6)}...{asset.metadata.currentOwner.slice(-4)}
                    </p>
                  )}
                  {asset.metadata?.blockNumber && (
                    <p className="text-xs text-gray-400">
                      Block: {asset.metadata.blockNumber}
                    </p>
                  )}
                </div>
              )}
              {asset.ethscriptionId && asset.type !== 'ethscription' && (
                <p className="text-xs text-gray-500 font-mono mt-1 truncate">
                  ID: {asset.ethscriptionId.slice(0, 10)}...{asset.ethscriptionId.slice(-8)}
                </p>
              )}
              {asset.type === 'btc' && asset.metadata?.satsFormatted && (
                <p className="text-xs text-gray-500 mt-1">
                  {asset.metadata.satsFormatted} SATs
                  {asset.metadata.note && (
                    <span className="block text-xs text-amber-600 mt-1 italic">
                      ⚠️ {asset.metadata.note}
                    </span>
                  )}
                </p>
              )}
              {asset.contractAddress && asset.type !== 'native' && asset.type !== 'btc' && asset.type !== 'ethscription' && asset.type !== 'ordinal' && (
                <p className="text-xs text-gray-500 font-mono mt-1 truncate">
                  {asset.contractAddress.slice(0, 10)}...{asset.contractAddress.slice(-8)}
                </p>
              )}
              {(asset.type === 'erc721' || asset.type === 'erc1155' || asset.type === 'ethscription' || asset.type === 'ordinal') && (
                <div className="mt-3">
                  <NFTImage
                    imageUrl={asset.imageUrl}
                    tokenUri={asset.type === 'ordinal'
                      ? (asset.metadata?.contentUrl || asset.contentUri || asset.imageUrl || `https://ord.io/preview/${asset.tokenId}`)
                      : (asset.metadata?.token_uri || asset.metadata?.tokenUri || asset.contentUri)}
                    contractAddress={asset.contractAddress}
                    tokenId={asset.tokenId}
                    alt={asset.name}
                    className="w-32 h-32 object-contain rounded border-2 border-gray-300 bg-gray-50"
                  />
                  {asset.type === 'ethscription' && !asset.imageUrl && asset.contentUri && (
                    <p className="text-xs text-gray-400 mt-1 text-center">
                      {asset.metadata?.mimetype?.startsWith('text/') ? 'Text Content' : 
                       asset.metadata?.mimetype?.includes('json') ? 'JSON Data' : 
                       'Content Available'}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="text-right ml-4">
              <p className="font-bold text-lg text-gray-900">{asset.balanceFormatted} {asset.symbol}</p>
              {asset.type === 'btc' && asset.metadata?.satsFormatted && (
                <p className="text-xs text-gray-500 mt-1">{asset.metadata.satsFormatted} SATs</p>
              )}
              {asset.usdValue && (
                <p className="text-sm text-gray-600 mt-1">${asset.usdValue.toFixed(2)}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
