/**
 * Netlify Edge Function: add baseline security headers.
 *
 * Notes:
 * - CSP is intentionally permissive enough for Next.js (allows inline/eval).
 * - Tighten once you audit all scripts/connect/img/font needs.
 */

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' https: wss:",
  "upgrade-insecure-requests",
].join('; ');

export default async (request: Request, context: any) => {
  const response = await context.next();

  // Clone headers so we can safely modify them.
  const headers = new Headers(response.headers);

  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Only set CSP if the origin didn't already set it.
  // (If you later move CSP to Next/Netlify config, this avoids double headers.)
  if (!headers.has('Content-Security-Policy')) {
    headers.set('Content-Security-Policy', CSP);
  }

  // COOP/COEP can break things; skipping for now.
  // headers.set('Cross-Origin-Opener-Policy', 'same-origin');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const config = {
  path: '/*',
};
