import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('auth_session')?.value;

  const isLoginPage = pathname === '/login';
  const isAuthApi = pathname.startsWith('/api/auth');
  const isPublicStatic =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.');

  // Allow static files and auth APIs
  if (isPublicStatic || isAuthApi) {
    return NextResponse.next();
  }

  // If already authenticated and trying to access /login, redirect to dashboard /
  if (isLoginPage && sessionCookie) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If unauthenticated and trying to access protected dashboard routes, redirect to /login
  if (!sessionCookie && !isLoginPage && !pathname.startsWith('/api')) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

