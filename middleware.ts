import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCSPHeaders } from '@/lib/security'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Add security headers
  const securityHeaders = getCSPHeaders()
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

