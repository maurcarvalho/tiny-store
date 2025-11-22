import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { EventStoreRepository } from '@tiny-store/shared-infrastructure';
import { handleError } from '@/lib/error-handler';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const dataSource = await getDatabase();
    const eventStore = new EventStoreRepository(dataSource);
    
    const event = await eventStore.findById(params.eventId);
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ event });
  } catch (error) {
    return handleError(error);
  }
}

