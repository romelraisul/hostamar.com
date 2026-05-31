/**
 * In-memory metrics store for Prometheus-compatible metrics.
 * Stateless across restarts — counters reset on process restart.
 */
const APP_START_TIME = Date.now();

/** Request counter keyed by "METHOD:/path" */
const requestCounts = new Map<string, number>();

/** Track a completed HTTP request */
export function incrementRequestCount(method: string, path: string): void {
  const key = `${method}:${path}`;
  requestCounts.set(key, (requestCounts.get(key) ?? 0) + 1);
}

/** Get all recorded request metrics as structured objects */
export function getAllRequestMetrics(): Array<{
  method: string;
  path: string;
  count: number;
}> {
  const result: Array<{ method: string; path: string; count: number }> = [];
  for (const [key, count] of requestCounts.entries()) {
    const sep = key.indexOf(':');
    const method = key.slice(0, sep);
    const path = key.slice(sep + 1);
    result.push({ method, path, count });
  }
  return result;
}

/** Server uptime in seconds */
export function getUptimeSeconds(): number {
  return (Date.now() - APP_START_TIME) / 1000;
}

/** A simple gauge store for arbitrary named values */
const gaugeValues = new Map<string, number>();

export function setGauge(name: string, value: number): void {
  gaugeValues.set(name, value);
}

export function getGauge(name: string): number {
  return gaugeValues.get(name) ?? 0;
}

export function getAllGauges(): Map<string, number> {
  return gaugeValues;
}
