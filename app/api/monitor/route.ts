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
    luckyStar,
    aiBrowser,
    duckAI,
    devIDE,
    aiBrowserAPI,
  ] = await Promise.all([
    checkService('Homepage', 'http://localhost:3001'),
    checkService('LuckyStar Game', 'http://localhost:8081'),
    checkService('AI Browser', 'http://localhost:8080', '/browser/'),
    checkService('DuckAI Chat', 'http://localhost:3004', '/api/health'),
    checkService('Dev IDE', 'http://localhost:8082'),
    checkService('AI Browser API', 'http://localhost:3003', '/api/health'),
  ]);

  const docker = getDockerContainers();
  const cloudflared = getCloudflaredStatus();

  const services = [
    homepage,
    luckyStar,
    aiBrowser,
    duckAI,
    devIDE,
    aiBrowserAPI,
  ];

  const onlineCount = services.filter((s) => s.status === 'online').length;
  const overallStatus =
    onlineCount === services.length
      ? 'healthy'
      : onlineCount > 0
        ? 'degraded'
        : 'down';

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
  });
}
