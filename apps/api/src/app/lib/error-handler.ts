import { NextResponse } from 'next/server';

export function handleError(error: unknown) {
  console.error('API Error:', error);

  if (error instanceof Error) {
    const statusCode = getStatusCode(error);
    
    return NextResponse.json(
      {
        error: error.message,
        type: error.name,
      },
      { status: statusCode }
    );
  }

  return NextResponse.json(
    {
      error: 'An unknown error occurred',
    },
    { status: 500 }
  );
}

function getStatusCode(error: Error): number {
  switch (error.name) {
    case 'NotFoundError':
      return 404;
    case 'ValidationError':
      return 400;
    case 'BusinessRuleViolationError':
      return 422;
    default:
      return 500;
  }
}

