import { NextResponse, type NextRequest } from 'next/server';

// Security headers configuration
export const securityHeaders = {
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',
  // Enable XSS filter
  'X-XSS-Protection': '1; mode=block',
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Control cross-origin resource sharing
  'Cross-Origin-Resource-Policy': 'same-origin',
  // Restrict browser features
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  // Enable strict CSP
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.intaj.io; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' https://api.intaj.io https://api.openai.com; " +
    "frame-ancestors 'none'; " +
    "form-action 'self'; " +
    "base-uri 'self';",
  // Set strict transport security
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// CORS configuration
const corsConfig = {
  allowedOrigins: [
    'https://intaj.io',
    'https://app.intaj.io',
    'https://api.intaj.io',
    // Add other trusted domains here
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Api-Key'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
  credentials: true,
};

export function applyCors(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');
  const response = new NextResponse();

  if (origin && corsConfig.allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', corsConfig.allowedMethods.join(', '));
    response.headers.set('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
    response.headers.set('Access-Control-Expose-Headers', corsConfig.exposedHeaders.join(', '));
    response.headers.set('Access-Control-Max-Age', corsConfig.maxAge.toString());

    if (corsConfig.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }

  return response;
}

// Apply security headers to all responses
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
