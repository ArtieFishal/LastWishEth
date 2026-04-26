import type { Asset } from '@/types'

/**
 * Conservative spam filter for ERC-20 tokens.
 *
 * - When `enabled` is false, returns the input unchanged so discovery stays complete by default.
 * - Native, NFT, ethscription, ordinal, and Solana SPL/NFT assets are always kept.
 * - Only ERC-20 entries are considered for filtering.
 *
 * Behavior is intentionally identical to the previous inline implementation in
 * `app/app/page.tsx`; this is a pure mechanical extraction.
 */
export function filterSpamTokens(assets: Asset[], enabled: boolean): Asset[] {
  if (!enabled) return assets

  return assets.filter(asset => {
    if (asset.type === 'native' || asset.type === 'btc') return true
    if (asset.type === 'erc721' || asset.type === 'erc1155' || asset.type === 'nft') return true
    if (asset.type === 'ethscription' || asset.type === 'ordinal') return true
    if (asset.type !== 'erc20') return true

    const decimals = asset.decimals || 18
    const balance = parseFloat(asset.balanceFormatted || '0')
    const possibleSpam = Boolean(asset.metadata?.possibleSpam)
    const name = (asset.name || '').toLowerCase()
    const symbol = (asset.symbol || '').toLowerCase()
    const obviouslySuspicious = [
      /^test$/i,
      /^fake$/i,
      /^scam$/i,
      /^spam$/i,
      /^airdrop$/i,
      /^claim$/i,
      /^free$/i,
      /^unknown$/i,
      /^unnamed$/i,
    ].some(pattern => pattern.test(name) || pattern.test(symbol))

    const isDust = balance > 0 && balance < (decimals >= 18 ? 0.000001 : 0.0001)

    if ((possibleSpam && isDust) || obviouslySuspicious) {
      console.log(`[Spam Filter] Filtered ${asset.symbol} (${asset.name})`)
      return false
    }

    return true
  })
}
