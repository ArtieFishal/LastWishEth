import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDeadline,
  DeadlineExceededError,
  dedupeAssets,
  fetchJsonWithRetry,
  formatUnitsSafe,
  isExternalAbort,
  parseJsonIfString,
  withDeadline,
} from '@/lib/portfolio-utils'
import type { Asset } from '@/types'

describe('portfolio-utils', () => {
  it('formats large integer balances safely', () => {
    expect(formatUnitsSafe('332906788768429413839', 18)).toBe('332.906788')
    expect(formatUnitsSafe('1750000000000', 8)).toBe('17500')
    expect(formatUnitsSafe('100000000', 8)).toBe('1')
  })

  it('deduplicates assets by id without losing order', () => {
    const assets: Asset[] = [
      {
        id: 'eth-1',
        chain: 'eth',
        type: 'native',
        symbol: 'ETH',
        name: 'Ethereum',
        balance: '1',
        balanceFormatted: '1',
      },
      {
        id: 'eth-1',
        chain: 'eth',
        type: 'native',
        symbol: 'ETH',
        name: 'Ethereum',
        balance: '1',
        balanceFormatted: '1',
      },
      {
        id: 'sol-1',
        chain: 'solana',
        type: 'nft',
        symbol: 'NFT',
        name: 'Collectible',
        balance: '1',
        balanceFormatted: '1',
      },
    ]

    expect(dedupeAssets(assets).map(asset => asset.id)).toEqual(['eth-1', 'sol-1'])
  })

  it('parses metadata when it is a JSON string', () => {
    expect(parseJsonIfString('{"name":"Test"}')).toEqual({ name: 'Test' })
    expect(parseJsonIfString({ name: 'Direct' })).toEqual({ name: 'Direct' })
    expect(parseJsonIfString('not-json')).toBeUndefined()
  })
})

describe('createDeadline', () => {
  it('expires after the configured budget', async () => {
    const handle = createDeadline(40)
    expect(handle.isExpired()).toBe(false)
    expect(handle.remainingMs()).toBeGreaterThan(0)

    await new Promise(resolve => setTimeout(resolve, 80))
    expect(handle.isExpired()).toBe(true)
    expect(handle.remainingMs()).toBe(0)

    handle.clear()
  })

  it('clear() releases the timer without aborting', () => {
    const handle = createDeadline(10_000)
    handle.clear()
    expect(handle.isExpired()).toBe(false)
  })
})

describe('isExternalAbort', () => {
  it('treats DeadlineExceededError as an external abort when signal aborted', () => {
    const handle = createDeadline(0)
    expect(handle.isExpired()).toBe(true)
    expect(isExternalAbort(new DeadlineExceededError(0), handle.signal)).toBe(true)
    handle.clear()
  })

  it('returns false when no signal is provided', () => {
    expect(isExternalAbort(new Error('boom'))).toBe(false)
  })
})

describe('withDeadline', () => {
  it('rejects with DeadlineExceededError when the signal aborts first', async () => {
    const handle = createDeadline(20)
    const slow = new Promise(resolve => setTimeout(() => resolve('late'), 200))
    await expect(withDeadline(slow, handle.signal)).rejects.toBeInstanceOf(DeadlineExceededError)
    handle.clear()
  })

  it('resolves when the inner promise wins the race', async () => {
    const handle = createDeadline(500)
    await expect(withDeadline(Promise.resolve('ok'), handle.signal)).resolves.toBe('ok')
    handle.clear()
  })
})

describe('fetchJsonWithRetry', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('does not retry when the external signal is already aborted', async () => {
    const handle = createDeadline(0)
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as any

    await expect(
      fetchJsonWithRetry('https://example.invalid/x', { signal: handle.signal }),
    ).rejects.toBeInstanceOf(DeadlineExceededError)

    expect(fetchSpy).not.toHaveBeenCalled()
    handle.clear()
  })

  it('does not retry on non-retryable HTTP statuses', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ error: 'bad' }), { status: 400 }))
    globalThis.fetch = fetchSpy as any

    await expect(fetchJsonWithRetry('https://example.invalid/x', { retries: 3 })).rejects.toThrow(/HTTP 400/)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('retries on retryable HTTP statuses up to `retries` times', async () => {
    const fetchSpy = vi.fn(async () => new Response('busy', { status: 503 }))
    globalThis.fetch = fetchSpy as any

    await expect(
      fetchJsonWithRetry('https://example.invalid/x', { retries: 1, retryDelayMs: 1, maxRetryDelayMs: 1 }),
    ).rejects.toThrow(/HTTP 503/)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('returns parsed JSON on success', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    globalThis.fetch = fetchSpy as any

    await expect(fetchJsonWithRetry<{ ok: boolean }>('https://example.invalid/x')).resolves.toEqual({ ok: true })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('aborts mid-flight when the external signal fires and surfaces the deadline error', async () => {
    const handle = createDeadline(20)

    globalThis.fetch = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        const sig = init?.signal
        if (sig) {
          sig.addEventListener('abort', () => {
            const err = new Error('aborted') as Error & { name: string }
            err.name = 'AbortError'
            reject(err)
          })
        }
      })) as any

    await expect(
      fetchJsonWithRetry('https://example.invalid/slow', { signal: handle.signal, retries: 5 }),
    ).rejects.toBeInstanceOf(DeadlineExceededError)
    handle.clear()
  })
})
