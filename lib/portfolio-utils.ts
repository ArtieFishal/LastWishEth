import type { Asset } from '@/types'

export interface RetryFetchOptions extends RequestInit {
  retries?: number
  timeoutMs?: number
  retryDelayMs?: number
  retryOnStatuses?: number[]
}

export async function fetchJsonWithRetry<T = any>(url: string, options: RetryFetchOptions = {}): Promise<T> {
  const {
    retries = 2,
    timeoutMs = 10000,
    retryDelayMs = 750,
    retryOnStatuses = [408, 425, 429, 500, 502, 503, 504],
    headers,
    ...fetchOptions
  } = options

  let lastError: unknown = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          Accept: 'application/json',
          ...headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '')
        const error = new Error(`HTTP ${response.status} for ${url}${bodyText ? `: ${bodyText.slice(0, 200)}` : ''}`)
        ;(error as any).status = response.status

        if (attempt < retries && retryOnStatuses.includes(response.status)) {
          await wait(retryDelayMs * Math.pow(2, attempt))
          lastError = error
          continue
        }

        throw error
      }

      return await response.json() as T
    } catch (error: any) {
      clearTimeout(timeoutId)
      lastError = error

      if (attempt >= retries) {
        break
      }

      const shouldRetry = error?.name === 'AbortError' || /fetch failed/i.test(error?.message || '')
      if (!shouldRetry) {
        break
      }

      await wait(retryDelayMs * Math.pow(2, attempt))
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`)
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function formatUnitsSafe(value: string | number | bigint | null | undefined, decimals = 0, maxFractionDigits = 6): string {
  if (value === null || value === undefined) return '0'

  const normalized = typeof value === 'bigint' ? value.toString() : String(value).trim()
  if (!normalized || !/^-?\d+$/.test(normalized)) return '0'

  const negative = normalized.startsWith('-')
  const digits = negative ? normalized.slice(1) : normalized
  const big = BigInt(digits || '0')
  const base = BigInt(10) ** BigInt(Math.max(0, decimals))
  const whole = big / base
  const fraction = decimals > 0 ? (big % base).toString().padStart(decimals, '0') : ''
  const trimmedFraction = fraction.slice(0, maxFractionDigits).replace(/0+$/, '')
  const formatted = trimmedFraction ? `${whole.toString()}.${trimmedFraction}` : whole.toString()

  return negative ? `-${formatted}` : formatted
}

export function dedupeAssets(assets: Asset[]): Asset[] {
  const seen = new Set<string>()
  const deduped: Asset[] = []

  for (const asset of assets) {
    if (!asset?.id || seen.has(asset.id)) continue
    seen.add(asset.id)
    deduped.push(asset)
  }

  return deduped
}

export function parseJsonIfString<T = Record<string, any>>(value: unknown): T | undefined {
  if (!value) return undefined
  if (typeof value === 'object') return value as T
  if (typeof value !== 'string') return undefined

  try {
    return JSON.parse(value) as T
  } catch {
    return undefined
  }
}

export function firstDefinedString(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return undefined
}
