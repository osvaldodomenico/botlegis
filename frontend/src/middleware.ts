import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('mv2026_token')?.value;
  const { pathname } = request.nextUrl;

  if (pathname === '/login') return NextResponse.next();

  // Token check is done client-side due to localStorage usage
  return NextResponse.next();
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'] };
