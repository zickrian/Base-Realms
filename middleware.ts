import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security Middleware
 * 
 * Adds security headers to all responses.
 * Runs on Edge Runtime for performance.
 */
export function middleware(request: NextRequest) {
  // Get the response
  const response = NextResponse.next();

  // Add security headers
  const headers = response.headers;

  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY');

  // XSS Protection (legacy but still useful for older browsers)
  headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer Policy - don't leak referrer to external sites
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy - disable unnecessary features
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // DNS Prefetch Control
  headers.set('X-DNS-Prefetch-Control', 'on');

  // Download Options - prevent IE from executing downloads
  headers.set('X-Download-Options', 'noopen');

  // Permitted Cross-Domain Policies
  headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  return response;
}

// Configure which routes the middleware applies to
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
