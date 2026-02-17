import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { GetProductHandler, UpdateProductStockHandler } from '@tiny-store/modules-inventory';
import { handleError } from '@/lib/error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: { sku: string } }
) {
  try {
    const dataSource = await getDatabase();
    const handler = new GetProductHandler(dataSource);
    
    const result = await handler.handle(params.sku);
    
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { sku: string } }
) {
  try {
    const dataSource = await getDatabase();
    const body = await request.json();

    if (typeof body.stockQuantity !== 'number') {
      return NextResponse.json(
        { error: 'stockQuantity is required' },
        { status: 400 }
      );
    }

    const handler = new UpdateProductStockHandler(dataSource);
    const result = await handler.handle({
      sku: params.sku,
      stockQuantity: body.stockQuantity,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
