/**
 * Production env-var readiness check.
 *
 * Usage:
 *   npm run check:env
 *   npm run check:env -- --strict   # exit 1 when any optional var is missing
 *
 * Reports which required/optional environment variables are missing.
 * Never prints values, so it is safe to run in CI / build logs.
 */

import { validateProductionEnv } from '../lib/env.server'

const args = new Set(process.argv.slice(2))
const strict = args.has('--strict')

const result = validateProductionEnv()

const lines: string[] = []
lines.push('LastWishCrypto - Production env readiness check')
lines.push('================================================')

if (result.missingRequired.length === 0) {
  lines.push('All required production environment variables are set.')
} else {
  lines.push('Missing REQUIRED environment variables (production will be degraded):')
  for (const name of result.missingRequired) {
    lines.push(`  - ${name}`)
  }
}

if (result.missingOptional.length > 0) {
  lines.push('')
  lines.push('Missing optional environment variables (features may degrade or use fallbacks):')
  for (const name of result.missingOptional) {
    lines.push(`  - ${name}`)
  }
}

console.log(lines.join('\n'))

if (!result.ok) {
  process.exit(1)
}

if (strict && result.missingOptional.length > 0) {
  process.exit(1)
}
