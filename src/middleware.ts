import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/about-us',
  '/features',
  '/pricing',
  '/services',
  '/contact-us',
  '/policy',
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  // Check if the route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => req.nextUrl.pathname === route);

  // If not public and no session, redirect to auth
  if (!isPublicRoute && !session) {
    const redirectUrl = new URL('/auth', req.url);
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If auth page and session exists, redirect to dashboard
  if (req.nextUrl.pathname === '/auth' && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};
