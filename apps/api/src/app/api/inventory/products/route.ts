import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { CreateProductHandler } from '@tiny-store/modules-inventory';
import { handleError } from '@/lib/error-handler';

export async function POST(request: NextRequest) {
  try {
    const dataSource = await getDatabase();
    const body = await request.json();
    
    const handler = new CreateProductHandler(dataSource);
    const result = await handler.handle(body);
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

