import type { Asset } from '@/types'

export interface RetryFetchOptions extends RequestInit {
  retries?: number
  timeoutMs?: number
  retryDelayMs?: number
  retryOnStatuses?: number[]
  /**
   * Hard upper bound on retry backoff. Prevents pathological cases where the
   * exponential backoff would itself blow the route's deadline budget.
   */
  maxRetryDelayMs?: number
}

/**
 * Bounded total time for a single portfolio API request, in ms.
 *
 * Netlify's standard synchronous function timeout is 10s. We give the route
 * itself a budget that's comfortably under that so we can build the JSON
 * response, log, and return cleanly even when an upstream is slow.
 *
 * Override at deploy time with PORTFOLIO_API_DEADLINE_MS for emergencies.
 */
export const DEFAULT_ROUTE_DEADLINE_MS = (() => {
  const fromEnv = Number.parseInt(String(process.env.PORTFOLIO_API_DEADLINE_MS || ''), 10)
  // Accept anything from 100ms (useful for chaos / load tests) up to 25s
  // (Netlify max for synchronous functions). Reject absurd / non-numeric
  // values silently to avoid a typo bricking the API.
  if (Number.isFinite(fromEnv) && fromEnv >= 100 && fromEnv <= 25000) return fromEnv
  return 9000
})()

export interface DeadlineHandle {
  /** Signal that aborts when the deadline elapses or `clear()` is called. */
  signal: AbortSignal
  /** Wall-clock ms remaining until the deadline (never negative). */
  remainingMs: () => number
  /** True once the deadline has elapsed. */
  isExpired: () => boolean
  /** Release the underlying timer. Safe to call multiple times. */
  clear: () => void
}

/**
 * Create a per-request deadline. Pass `handle.signal` into `fetchJsonWithRetry`
 * (or any other fetch) so all in-flight upstream calls abort together when the
 * route's overall budget is spent.
 */
export function createDeadline(ms: number = DEFAULT_ROUTE_DEADLINE_MS): DeadlineHandle {
  const controller = new AbortController()
  const startedAt = Date.now()
  const budget = Math.max(0, ms)

  // ms <= 0 means "already over budget"; abort synchronously so callers don't
  // accidentally fire upstream calls before the next tick.
  if (budget === 0) {
    controller.abort(new DeadlineExceededError(0))
    return {
      signal: controller.signal,
      remainingMs: () => 0,
      isExpired: () => true,
      clear: () => {},
    }
  }

  const timeoutId = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort(new DeadlineExceededError(budget))
    }
  }, budget)

  // Avoid keeping the Node event loop alive solely for this timer.
  if (typeof (timeoutId as any)?.unref === 'function') {
    ;(timeoutId as any).unref()
  }

  return {
    signal: controller.signal,
    remainingMs: () => Math.max(0, budget - (Date.now() - startedAt)),
    isExpired: () => controller.signal.aborted,
    clear: () => {
      clearTimeout(timeoutId)
    },
  }
}

export class DeadlineExceededError extends Error {
  public readonly budgetMs: number
  constructor(budgetMs: number) {
    super(`Upstream lookup exceeded ${budgetMs}ms budget`)
    this.name = 'DeadlineExceededError'
    this.budgetMs = budgetMs
  }
}

/**
 * True when the failure was caused by an external `AbortSignal` being aborted
 * (typically the route's deadline). These should NEVER be retried — the caller
 * has explicitly given up on this work.
 */
export function isExternalAbort(error: unknown, externalSignal?: AbortSignal | null): boolean {
  if (!externalSignal) return false
  if (!externalSignal.aborted) return false
  if (error instanceof DeadlineExceededError) return true
  if ((error as any)?.name === 'AbortError') return true
  return false
}

function redactSecretsFromUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl)
    const secretKeys = new Set([
      'api-key',
      'apikey',
      'api_key',
      'key',
      'token',
      'access_token',
      'auth',
      'signature',
    ])

    for (const [k] of url.searchParams) {
      if (secretKeys.has(k.toLowerCase())) {
        url.searchParams.set(k, '[REDACTED]')
      }
    }

    return url.toString()
  } catch {
    // If URL parsing fails, do a conservative redaction for common patterns.
    return rawUrl.replace(/(api[-_]?key|access_token|token)=([^&\s]+)/gi, '$1=[REDACTED]')
  }
}

/**
 * Resilient JSON fetch with bounded retries + per-attempt timeout.
 *
 * Production-safety guarantees:
 *   - Each attempt is hard-capped by `timeoutMs` (default 8s).
 *   - At most `retries + 1` attempts are made (default total = 2 attempts).
 *   - Backoff is exponential but capped by `maxRetryDelayMs` (default 1.5s)
 *     so backoff itself can never blow a route's budget.
 *   - When the caller passes a `signal` (e.g. a route deadline) the helper
 *     aborts immediately and does NOT retry. This is what lets routes enforce
 *     a single overall time budget across many upstream calls.
 *   - Non-retryable HTTP statuses (4xx other than 408/425/429) fail fast with
 *     no retry, so a "known-bad address" returns quickly.
 */
export async function fetchJsonWithRetry<T = any>(url: string, options: RetryFetchOptions = {}): Promise<T> {
  const {
    retries = 1,
    timeoutMs = 8000,
    retryDelayMs = 400,
    maxRetryDelayMs = 1500,
    retryOnStatuses = [408, 425, 429, 500, 502, 503, 504],
    headers,
    signal: externalSignal,
    ...fetchOptions
  } = options

  if (externalSignal?.aborted) {
    throw externalSignal.reason instanceof Error
      ? externalSignal.reason
      : new DeadlineExceededError(0)
  }

  let lastError: unknown = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const onExternalAbort = () => controller.abort(externalSignal?.reason)
    if (externalSignal) {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true })
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          Accept: 'application/json',
          ...headers,
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '')
        const safeUrl = redactSecretsFromUrl(url)
        const error = new Error(`HTTP ${response.status} for ${safeUrl}${bodyText ? `: ${bodyText.slice(0, 200)}` : ''}`)
        ;(error as any).status = response.status

        if (attempt < retries && retryOnStatuses.includes(response.status) && !externalSignal?.aborted) {
          lastError = error
          await wait(computeBackoffMs(retryDelayMs, attempt, maxRetryDelayMs), externalSignal)
          continue
        }

        throw error
      }

      return await response.json() as T
    } catch (error: any) {
      lastError = error

      if (isExternalAbort(error, externalSignal)) {
        throw externalSignal!.reason instanceof Error
          ? externalSignal!.reason
          : new DeadlineExceededError(0)
      }

      if (attempt >= retries) {
        break
      }

      const shouldRetry = error?.name === 'AbortError' || /fetch failed/i.test(error?.message || '')
      if (!shouldRetry) {
        break
      }

      await wait(computeBackoffMs(retryDelayMs, attempt, maxRetryDelayMs), externalSignal)
    } finally {
      clearTimeout(timeoutId)
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort)
      }
    }
  }

  const safeUrl = redactSecretsFromUrl(url)
  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${safeUrl}`)
}

function computeBackoffMs(baseMs: number, attempt: number, capMs: number): number {
  return Math.min(capMs, baseMs * Math.pow(2, attempt))
}

function wait(ms: number, externalSignal?: AbortSignal | null): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      resolve()
    }, ms)
    const onAbort = () => {
      cleanup()
      reject(externalSignal!.reason instanceof Error ? externalSignal!.reason : new DeadlineExceededError(0))
    }
    const cleanup = () => {
      clearTimeout(timer)
      externalSignal?.removeEventListener('abort', onAbort)
    }
    if (externalSignal?.aborted) {
      onAbort()
      return
    }
    externalSignal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Race a promise against a deadline signal. Resolves with the promise value if
 * it settles first; rejects with the deadline error otherwise.
 *
 * Use this for clients that don't accept an `AbortSignal` natively (e.g.
 * @solana/web3.js `Connection`).
 */
export async function withDeadline<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new DeadlineExceededError(0)
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener('abort', onAbort)
      reject(signal.reason instanceof Error ? signal.reason : new DeadlineExceededError(0))
    }
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      value => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      err => {
        signal.removeEventListener('abort', onAbort)
        reject(err)
      },
    )
  })
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
