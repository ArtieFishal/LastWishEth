/**
 * DEPRECATED: This Netlify Edge Function is no longer the source of truth for
 * security headers.
 *
 * Security headers (CSP, X-Frame-Options, X-Content-Type-Options,
 * Referrer-Policy, Permissions-Policy) are now defined in ONE place:
 *
 *   next.config.ts -> `headers()`
 *
 * They are propagated to the production response by `@netlify/plugin-nextjs`.
 *
 * This file is kept (rather than deleted) so that the rationale survives in
 * the codebase and so that an accidental re-registration in `netlify.toml`
 * is a no-op rather than a duplicate-header source.
 *
 * The registration block was removed from `netlify.toml`. To re-introduce
 * edge-level security headers in the future, first remove the corresponding
 * `headers()` entry from `next.config.ts` to keep a single source of truth.
 */

export default async (_request: Request, context: any) => {
  return context.next();
};

// Intentionally NOT exporting `config = { path: '/*' }` so this function
// stays inert even if it accidentally gets included in a build.
