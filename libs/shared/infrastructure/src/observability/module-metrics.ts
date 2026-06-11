import { metrics } from '@opentelemetry/api';

export interface ModuleMetrics {
  requestCounter: { add(value: number, attributes?: Record<string, string>): void };
  errorCounter: { add(value: number, attributes?: Record<string, string>): void };
  latencyHistogram: { record(value: number, attributes?: Record<string, string>): void };
}

export function getModuleMeter(moduleName: string): ModuleMetrics {
  const meter = metrics.getMeter(`tiny-store.${moduleName}`);
  return {
    requestCounter: meter.createCounter(`${moduleName}.requests`),
    errorCounter: meter.createCounter(`${moduleName}.errors`),
    latencyHistogram: meter.createHistogram(`${moduleName}.latency`),
  };
}
