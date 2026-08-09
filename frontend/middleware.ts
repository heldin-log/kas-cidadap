import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.get('isLoggedIn')?.value;
  const { pathname } = request.nextUrl;

  // 1. Jika sudah login tapi mencoba membuka halaman /login, lempar langsung ke /dashboard
  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2. Jika belum login dan mencoba membuka halaman selain /login (seperti /dashboard), lempar ke /login
  if (!isLoggedIn && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Pastikan /dashboard dan sub-foldernya terdaftar di matcher
export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/transactions/:path*', 
    '/users/:path*'
  ],
};