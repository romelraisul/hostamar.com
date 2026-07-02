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

/** Generate all metrics in Prometheus exposition format */
export function getAllMetrics(): string {
  const lines: string[] = [];

  // ── hostamar_uptime_seconds (gauge) ──────────────────────────────────
  lines.push('# HELP hostamar_uptime_seconds Server uptime in seconds');
  lines.push('# TYPE hostamar_uptime_seconds gauge');
  lines.push(`hostamar_uptime_seconds ${getUptimeSeconds()}`);

  // ── hostamar_http_requests_total (counter, method + path labels) ────
  lines.push(
    '# HELP hostamar_http_requests_total Total HTTP requests by method and path',
  );
  lines.push('# TYPE hostamar_http_requests_total counter');
  const requestMetrics = getAllRequestMetrics();
  if (requestMetrics.length === 0) {
    lines.push('hostamar_http_requests_total{method="GET",path="/"} 0');
  } else {
    for (const { method, path, count } of requestMetrics) {
      lines.push(
        `hostamar_http_requests_total{method="${method}",path="${path}"} ${count}`,
      );
    }
  }

  // ── Gauges ───────────────────────────────────────────────────────────
  for (const [name, value] of gaugeValues.entries()) {
    lines.push(`# HELP ${name} Custom gauge metric`);
    lines.push(`# TYPE ${name} gauge`);
    lines.push(`${name} ${value}`);
  }

  // Trailing newline required by Prometheus exposition format
  lines.push('');

  return lines.join('\n');
}