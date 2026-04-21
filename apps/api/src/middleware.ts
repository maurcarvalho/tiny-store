import { NextRequest, NextResponse } from 'next/server';

const EXTRACTED_MODULES = (process.env['EXTRACTED_MODULES'] || '')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  for (const mod of EXTRACTED_MODULES) {
    if (pathname.startsWith(`/api/${mod}`)) {
      return NextResponse.json(
        { error: `Module "${mod}" has been extracted to a standalone service.` },
        { status: 410 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
