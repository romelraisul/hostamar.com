export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

interface ServiceHealth {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'error';
  responseTime: number | null;
  statusCode: number | null;
  message: string;
}

async function checkService(
  name: string,
  url: string,
  path: string = '/'
): Promise<ServiceHealth> {
  const fullUrl = `${url}${path}`;
  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'Hostamar-Monitor/1.0' },
    });
    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    return {
      name,
      url: fullUrl,
      status: response.ok ? 'online' : 'offline',
      responseTime,
      statusCode: response.status,
      message: response.ok ? 'Healthy' : `HTTP ${response.status}`,
    };
  } catch (error: any) {
    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    return {
      name,
      url: fullUrl,
      status: 'error',
      responseTime,
      statusCode: null,
      message: error.name === 'AbortError' ? 'Timeout (>5s)' : error.message,
    };
  }
}

function getDockerContainers() {
  try {
    const output = execSync(
      'docker ps --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"',
      { encoding: 'utf-8', timeout: 10000 }
    );

    if (!output.trim()) {
      return { status: 'warning', containers: [], message: 'No running containers' };
    }

    const containers = output
      .trim()
      .split('\n')
      .map((line) => {
        const [name, status, ports] = line.split('\t');
        return {
          name: name || 'unknown',
          status: status || 'unknown',
          ports: ports || '',
          isRunning: status?.toLowerCase().includes('up') ?? false,
        };
      });

    return {
      status: 'healthy',
      containers,
      message: `${containers.length} container(s) running`,
    };
  } catch (error: any) {
    return {
      status: 'error',
      containers: [],
      message: error.message || 'Failed to check Docker',
    };
  }
}

function getCloudflaredStatus() {
  try {
    const output = execSync('tasklist /FI "IMAGENAME eq cloudflared.exe" /NH', {
      encoding: 'utf-8',
      timeout: 5000,
    });

    const isRunning = output.includes('cloudflared.exe');

    return {
      name: 'Cloudflared',
      status: isRunning ? 'online' : 'offline',
      message: isRunning ? 'Running' : 'Not running',
    };
  } catch {
    return {
      name: 'Cloudflared',
      status: 'offline',
      message: 'Process not found',
    };
  }
}

export async function GET() {
  const [
    homepage,
    production,
    healthApi,
    ollamaBridge,
  ] = await Promise.all([
    checkService('Local (Docker)', 'http://localhost:3000'),
    checkService('Production (Vercel)', 'https://hostamar.com'),
    checkService('Health API', 'https://hostamar.com', '/api/health'),
    checkService('Ollama AI', 'http://192.168.1.2:11434'),
  ]);

  const docker = getDockerContainers();
  const cloudflared = getCloudflaredStatus();

  const services = [
    homepage,
    production,
    healthApi,
    ollamaBridge,
  ];

  const onlineCount = services.filter((s) => s.status === 'online').length;
  const overallStatus =
    onlineCount === services.length
      ? 'healthy'
      : onlineCount > 0
        ? 'degraded'
        : 'down';

  // Metrics-compatible view for Prometheus scraping
  const metrics: Record<string, number> = {};
  for (const s of services) {
    metrics[`service_${s.name.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`] =
      s.status === 'online' ? 1 : 0;
  }
  metrics.docker_running =
    docker.status === 'healthy' || docker.status === 'warning' ? 1 : 0;
  metrics.cloudflared_running =
    cloudflared.status === 'online' ? 1 : 0;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    overallStatus,
    summary: {
      total: services.length,
      online: onlineCount,
      offline: services.length - onlineCount,
    },
    services,
    infrastructure: {
      docker,
      cloudflared,
    },
    // Prometheus-compatible numeric status values
    metrics,
  });
}