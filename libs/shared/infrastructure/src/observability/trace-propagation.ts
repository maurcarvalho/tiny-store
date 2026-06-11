import { context, propagation } from '@opentelemetry/api';

export function injectTraceContext(
  headers: Record<string, string>
): Record<string, string> {
  propagation.inject(context.active(), headers);
  return headers;
}

export function extractTraceContext(headers: Record<string, string>): void {
  propagation.extract(context.active(), headers);
}
