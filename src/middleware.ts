import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const role = request.cookies.get('riverside_role')?.value;
  const path = request.nextUrl.pathname;

  // 1. Allow public paths
  if (path === '/login' || path.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // 2. Redirect to login if not authenticated (no role cookie)
  if (!role) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Protected paths and their required roles
  const protections: { [key: string]: string[] } = {
    '/patron': ['patron'],
    '/cm': ['patron', 'comptable'],
    '/comptabilite': ['patron', 'comptable'],
    '/admin/stocks': ['patron', 'major'],
    '/administration': ['patron', 'major'],
    '/medical': ['personnel', 'patron', 'major'],
    '/planning': ['personnel', 'accueil', 'patron', 'major'],
    '/pharmacie': ['personnel', 'comptable', 'patron', 'major'],
    '/doulia-love': ['patron', 'communication', 'cm']
  };

  // Check if current path starts with any protected prefix
  for (const [prefix, allowedRoles] of Object.entries(protections)) {
    if (path.startsWith(prefix)) {
      if (!allowedRoles.includes(role)) {
        // Redirect to dashboard if unauthorized
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
