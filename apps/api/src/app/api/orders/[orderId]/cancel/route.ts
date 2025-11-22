import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { CancelOrderHandler } from '@tiny-store/modules-orders';
import { handleError } from '@/lib/error-handler';

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const dataSource = await getDatabase();
    const body = await request.json();
    
    const handler = new CancelOrderHandler(dataSource);
    
    const result = await handler.handle({
      orderId: params.orderId,
      reason: body.reason || 'Customer requested cancellation',
    });
    
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

