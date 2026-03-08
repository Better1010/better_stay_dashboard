import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rolePaths: Record<string, string[]> = {
  super_admin: ['/super-admin'],
  hostel_admin: ['/admin'],
  resident: ['/resident'],
  staff: ['/staff'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/' ||
    pathname.startsWith('/auth/')
  ) {
    return NextResponse.next();
  }

  // Check if accessing a dashboard route
  const isDashboardRoute = pathname.startsWith('/super-admin') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/resident') ||
    pathname.startsWith('/staff');

  if (isDashboardRoute) {
    // The actual role check will be done in the page components
    // since we need to access localStorage which is only available client-side
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
