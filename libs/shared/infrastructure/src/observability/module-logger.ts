import { trace, context } from '@opentelemetry/api';

export interface ModuleLogger {
  info(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
}

export function getModuleLogger(moduleName: string): ModuleLogger {
  return {
    info: (message, data?) => log('info', moduleName, message, data),
    error: (message, data?) => log('error', moduleName, message, data),
    warn: (message, data?) => log('warn', moduleName, message, data),
    debug: (message, data?) => log('debug', moduleName, message, data),
  };
}

function log(
  level: string,
  module: string,
  message: string,
  data?: Record<string, unknown>
): void {
  const entry = {
    level,
    module,
    message,
    timestamp: new Date().toISOString(),
    trace_id: getActiveTraceId(),
    ...data,
  };
  const sink = level === 'error' ? console.error : console.log;
  sink(JSON.stringify(entry));
}

function getActiveTraceId(): string | undefined {
  try {
    const span = trace.getSpan(context.active());
    return span?.spanContext().traceId;
  } catch {
    return undefined;
  }
}
