import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define role-based access control
const roleBasedRoutes = {
  '/admin': ['ADMIN'],
  '/reports': ['ADMIN', 'RADIOLOGIST_SENIOR', 'RADIOLOGIST_JUNIOR'],
  '/reports/new': ['ADMIN', 'RADIOLOGIST_SENIOR', 'RADIOLOGIST_JUNIOR'],
  '/reports/[id]': ['ADMIN', 'RADIOLOGIST_SENIOR', 'RADIOLOGIST_JUNIOR'],
};

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Check if user has access to the requested route
    for (const [route, allowedRoles] of Object.entries(roleBasedRoutes)) {
      // Handle dynamic routes
      const routePattern = route.replace(/\[.*?\]/g, '[^/]+');
      const routeRegex = new RegExp(`^${routePattern}/?$`);
      
      if (routeRegex.test(pathname)) {
        if (!token?.role || !allowedRoles.includes(token.role as string)) {
          // Redirect to dashboard with access denied message
          const url = req.nextUrl.clone();
          url.pathname = '/dashboard';
          url.searchParams.set('error', 'access_denied');
          return NextResponse.redirect(url);
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow access to auth pages and API routes without token
        if (pathname.startsWith('/auth') || pathname.startsWith('/api/auth')) {
          return true;
        }
        
        // Require token for all other pages
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
};