import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { GetOrderHandler } from '@tiny-store/modules-orders';
import { handleError } from '@/lib/error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const db = await getDatabase();
    const handler = new GetOrderHandler(db);

    const result = await handler.handle(orderId);

    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
