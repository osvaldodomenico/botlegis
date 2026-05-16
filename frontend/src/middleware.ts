import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0]?.toLowerCase() || '';

  if (hostname === 'lideranca.shiftworks.app.br') {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.hostname = 'mobile.lideranca.shiftworks.app.br';
    return NextResponse.redirect(url, 308);
  }

  const { pathname } = request.nextUrl;

  if (pathname === '/login') return NextResponse.next();

  // Token check is done client-side due to localStorage usage
  return NextResponse.next();
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'] };
