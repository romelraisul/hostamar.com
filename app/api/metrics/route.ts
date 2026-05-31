import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getUptimeSeconds,
  getAllRequestMetrics,
} from '@/lib/metrics-store';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Prometheus metrics endpoint — pure Node.js, no external dependencies.
 * Returns metrics in the Prometheus Exposition Format (text/plain).
 */
export async function GET(_request: NextRequest) {
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
  // Always emit at least one sample so Prometheus knows the metric exists
  if (requestMetrics.length === 0) {
    lines.push('hostamar_http_requests_total{method="GET",path="/"} 0');
  } else {
    for (const { method, path, count } of requestMetrics) {
      lines.push(
        `hostamar_http_requests_total{method="${method}",path="${path}"} ${count}`,
      );
    }
  }

  // ── hostamar_db_connections_active (gauge) ───────────────────────────
  lines.push(
    '# HELP hostamar_db_connections_active Active database connections (1=connected, 0=disconnected)',
  );
  lines.push('# TYPE hostamar_db_connections_active gauge');
  let dbActive = 0;
  try {
    await prisma.$connect();
    // Quick query to verify the connection is truly alive
    await prisma.$queryRaw`SELECT 1`;
    dbActive = 1;
  } catch {
    dbActive = 0;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
  lines.push(`hostamar_db_connections_active ${dbActive}`);

  // ── hostamar_build_info (gauge with version label) ──────────────────
  lines.push('# HELP hostamar_build_info Build metadata');
  lines.push('# TYPE hostamar_build_info gauge');
  let version = 'unknown';
  try {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf-8'),
    );
    version = pkg.version || 'unknown';
  } catch {
    // If we can't read package.json, use 'unknown'
  }
  lines.push(`hostamar_build_info{version="${version}"} 1`);

  // ── hostamar_monitor_status (gauge, 1=healthy 0=down) ───────────────
  lines.push(
    '# HELP hostamar_monitor_status Service health status (1=healthy, 0=down)',
  );
  lines.push('# TYPE hostamar_monitor_status gauge');

  const services = [
    { name: 'local_docker', url: 'http://localhost:3000' },
    { name: 'production_vercel', url: 'https://hostamar.com' },
    { name: 'health_api', url: 'https://hostamar.com/api/health' },
    { name: 'ollama_ai', url: 'http://192.168.1.2:11434' },
  ];

  for (const svc of services) {
    let healthy = 0;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(svc.url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'Hostamar-Metrics/1.0' },
      });
      clearTimeout(timer);
      healthy = resp.ok ? 1 : 0;
    } catch {
      healthy = 0;
    }
    lines.push(
      `hostamar_monitor_status{service="${svc.name}"} ${healthy}`,
    );
  }

  // Trailing newline required by Prometheus exposition format
  lines.push('');

  return new NextResponse(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
