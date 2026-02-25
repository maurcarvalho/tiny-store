/**
 * L3 Extraction Middleware
 *
 * When EXTRACTED_MODULES is set (e.g., "orders"), the monolith
 * rejects requests to extracted module routes with 410 Gone.
 * A reverse proxy (nginx, API gateway) forwards these to the
 * extracted service; this middleware is the safety net.
 *
 * This demonstrates that extraction is a configuration change,
 * not a code change.
 */
import { NextRequest, NextResponse } from 'next/server';

const EXTRACTED_MODULES = (process.env['EXTRACTED_MODULES'] || '')
  .split(',')
  .map((m) => m.trim().toLowerCase())
  .filter(Boolean);

const MODULE_ROUTE_PREFIXES: Record<string, string> = {
  orders: '/api/orders',
  inventory: '/api/inventory',
  // Future: payments, shipments, etc.
};

export function middleware(request: NextRequest) {
  for (const mod of EXTRACTED_MODULES) {
    const prefix = MODULE_ROUTE_PREFIXES[mod];
    if (prefix && request.nextUrl.pathname.startsWith(prefix)) {
      return NextResponse.json(
        {
          error: 'Gone',
          message: `The ${mod} module has been extracted to a dedicated service.`,
          service: `${mod}-service`,
        },
        { status: 410 }
      );
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
