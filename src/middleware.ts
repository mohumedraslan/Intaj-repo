import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/signup',
  '/about-us',
  '/features',
  '/pricing',
  '/services',
  '/contact-us',
  '/policy',
];

// Admin routes that require admin role
const ADMIN_ROUTES = [
  '/admin',
  '/admin/dashboard',
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session }, error } = await supabase.auth.getSession();

  // Check if the route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => req.nextUrl.pathname === route);
  
  // Check if the route is an admin route
  const isAdminRoute = ADMIN_ROUTES.some(route => req.nextUrl.pathname.startsWith(route));

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
  
  // Check admin access for admin routes
  if (isAdminRoute && session) {
    // Check if user has admin role in profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      // User doesn't have admin role, redirect to unauthorized page
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
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
    '/admin/:path*',
  ],
};
