import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { GetOrderHandler } from '@tiny-store/modules-orders';
import { handleError } from '@/lib/error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const dataSource = await getDatabase();
    const handler = new GetOrderHandler(dataSource);
    
    const result = await handler.handle(params.orderId);
    
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

