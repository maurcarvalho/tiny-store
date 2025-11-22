import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { registerListeners } from '@/lib/register-listeners';
import { PlaceOrderHandler } from '@tiny-store/modules-orders';
import { handleError } from '@/lib/error-handler';

// Initialize listeners on first request
let listenersInitialized = false;

export async function POST(request: NextRequest) {
  try {
    const dataSource = await getDatabase();
    
    if (!listenersInitialized) {
      registerListeners(dataSource);
      listenersInitialized = true;
    }

    const body = await request.json();
    const handler = new PlaceOrderHandler(dataSource);
    
    const result = await handler.handle(body);
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const dataSource = await getDatabase();
    const { searchParams } = new URL(request.url);
    
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');

    const { ListOrdersHandler } = await import('@tiny-store/modules-orders');
    const handler = new ListOrdersHandler(dataSource);
    
    const result = await handler.handle({ customerId: customerId || undefined, status: status || undefined });
    
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

