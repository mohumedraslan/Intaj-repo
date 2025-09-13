/**
 * Extract the client IP address from a Next.js request
 * Handles various headers that might contain the real IP address
 * when behind proxies or load balancers
 */
export function getClientIp(request: Request): string {
  // Try to get IP from headers that might be set by proxies
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, the first one is the client
    return forwardedFor.split(',')[0].trim();
  }

  // Try other common headers
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to a placeholder if we can't determine the IP
  // In production, this should be rare
  return '127.0.0.1';
}