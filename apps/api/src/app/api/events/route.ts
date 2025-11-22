import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { EventStoreRepository } from '@tiny-store/shared-infrastructure';
import { handleError } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  try {
    const dataSource = await getDatabase();
    const { searchParams } = new URL(request.url);
    
    const orderId = searchParams.get('orderId');
    const eventType = searchParams.get('eventType');

    const eventStore = new EventStoreRepository(dataSource);
    
    let events;
    
    if (orderId) {
      events = await eventStore.findByAggregateId(orderId);
    } else if (eventType) {
      events = await eventStore.findByEventType(eventType);
    } else {
      events = await eventStore.findAll();
    }
    
    return NextResponse.json({ events });
  } catch (error) {
    return handleError(error);
  }
}

