import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { GetProductHandler, ProductRepository } from '@tiny-store/modules-inventory';
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
    
    const repository = new ProductRepository(dataSource);
    const product = await repository.findBySku(params.sku);
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Update stock quantity if provided
    if (typeof body.stockQuantity === 'number') {
      product.adjustStock(body.stockQuantity);
      await repository.save(product);
    }

    return NextResponse.json({
      productId: product.id,
      sku: product.sku.value,
      name: product.name,
      stockQuantity: product.stockQuantity,
      availableStock: product.availableStock,
      reservedQuantity: product.reservedQuantity,
      status: product.status,
    });
  } catch (error) {
    return handleError(error);
  }
}

