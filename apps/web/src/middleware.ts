import { NextResponse, type NextRequest } from 'next/server';

// Sin cookie de sesión se envía al inicio de sesión. La API valida el token en cada llamada.
export function middleware(req: NextRequest) {
  if (!req.cookies.has('tz_access')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!login|api|_next|favicon.ico).*)'],
};
