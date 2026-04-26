export type RequiredProductionEnvVar =
  | 'MORALIS_API_KEY'
  | 'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID'

export type OptionalEnvVar =
  | 'HELIUS_API_KEY'
  | 'NEXT_PUBLIC_SOLANA_RPC_URL'
  | 'SOLANA_RPC_URL'
  | 'UNSTOPPABLE_API_KEY'
  | 'PAYMENT_RECEIVER_ADDRESS'

export class MissingEnvVarError extends Error {
  public readonly varName: string

  constructor(varName: string) {
    super(`Missing required environment variable: ${varName}`)
    this.name = 'MissingEnvVarError'
    this.varName = varName
  }
}

function normalizeEnvValue(value: unknown): string | undefined {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized.length > 0 ? normalized : undefined
}

/**
 * Server-only env lookup.
 * - Never returns secrets to the client directly (callers should only use the value server-side).
 * - Throws a safe error message that includes only the variable name (no value).
 */
export function requireServerEnv(varName: RequiredProductionEnvVar): string {
  const value = normalizeEnvValue(process.env[varName])
  if (!value) throw new MissingEnvVarError(varName)
  return value
}

export function getOptionalServerEnv(varName: OptionalEnvVar): string | undefined {
  return normalizeEnvValue(process.env[varName])
}

export function validateProductionEnv(): {
  ok: boolean
  missingRequired: RequiredProductionEnvVar[]
  missingOptional: OptionalEnvVar[]
} {
  const required: RequiredProductionEnvVar[] = [
    'MORALIS_API_KEY',
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
  ]

  const optional: OptionalEnvVar[] = [
    'HELIUS_API_KEY',
    'NEXT_PUBLIC_SOLANA_RPC_URL',
    'SOLANA_RPC_URL',
    'UNSTOPPABLE_API_KEY',
    'PAYMENT_RECEIVER_ADDRESS',
  ]

  const missingRequired = required.filter(name => !normalizeEnvValue(process.env[name]))
  const missingOptional = optional.filter(name => !normalizeEnvValue(process.env[name]))

  return {
    ok: missingRequired.length === 0,
    missingRequired,
    missingOptional,
  }
}

