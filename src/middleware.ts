import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const role = request.cookies.get('riverside_role')?.value || 'personnel';
  const path = request.nextUrl.pathname;

  // Protected paths and their required roles
  const protections: { [key: string]: string[] } = {
    '/patron': ['patron'],
    '/cm': ['patron', 'comptable'],
    '/comptable': ['patron', 'comptable'],
    '/admin/stocks': ['patron', 'major'],
    '/administration': ['patron', 'major']
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
    '/patron/:path*',
    '/cm/:path*',
    '/comptable/:path*',
    '/admin/stocks/:path*',
    '/administration/:path*',
  ],
};
