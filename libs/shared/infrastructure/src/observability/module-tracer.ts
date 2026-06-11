import { trace, SpanStatusCode } from '@opentelemetry/api';
import type { Tracer, Span } from '@opentelemetry/api';

export function getModuleTracer(moduleName: string): Tracer {
  return trace.getTracer(`tiny-store.${moduleName}`);
}

export async function tracedHandler<T>(
  tracer: Tracer,
  handlerName: string,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(handlerName, async (span) => {
    try {
      const result = await fn(span);
      return result;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      throw err;
    } finally {
      span.end();
    }
  });
}
