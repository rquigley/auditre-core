import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
export const config = {
  matcher: [
    '/login',
    '/((?!api|_next/static|_next/image|_next/chunks|_next/image|favicon.ico|logo.svg).*)',
  ],
};

export default async function middleware(req: NextRequest) {
  const session = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const path = req.nextUrl.pathname;
  if (!session && path !== '/login' && path !== '/register') {
    return NextResponse.redirect(new URL('/login', req.url));
  } else if (session && (path === '/login' || path === '/register')) {
    //return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.next();
}
