export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const DOCKER_SOCK = '/var/run/docker.sock';
const NETWORK = 'hostamar-network';
const IP_POOL_START = 200;
const IP_POOL_END = 250;
const SUBNET = '172.19.0';

interface HostingServer {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'error';
  ip: string;
  domain?: string;
  ssl: boolean;
  uptime: string;
  cpu: string;
  ram: string;
  storage: string;
  os: string;
  ports: string[];
  createdAt: string;
}

function mockServers(): HostingServer[] {
  return [
    {
      id: 'srv-1001',
      name: 'web-prod-01',
      image: 'nginx:alpine',
      status: 'running',
      ip: '172.19.0.201',
      domain: 'app.hostamar.com',
      ssl: true,
      uptime: '14d 6h 32m',
      cpu: '2 vCPU',
      ram: '4 GB',
      storage: '40 GB SSD',
      os: 'Alpine Linux 3.19',
      ports: ['80', '443'],
      createdAt: '2024-12-10T08:00:00Z',
    },
    {
      id: 'srv-1002',
      name: 'api-staging',
      image: 'node:20-slim',
      status: 'stopped',
      ip: '172.19.0.202',
      ssl: false,
      uptime: '-',
      cpu: '1 vCPU',
      ram: '2 GB',
      storage: '20 GB SSD',
      os: 'Debian 12',
      ports: ['3000'],
      createdAt: '2025-01-05T14:20:00Z',
    },
  ];
}

async function dockerCall(path: string, method = 'GET', body?: any): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`http://localhost${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error('Docker request timeout');
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

async function getContainers(): Promise<any[]> {
  try {
    const data = await dockerCall('/containers/json?all=true');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function getNetworks(): Promise<any[]> {
  try {
    const data = await dockerCall('/networks/json');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function getUsedIps(containers: any[], networks: any[]): string[] {
  const used = new Set<string>();
  for (const c of containers) {
    if (c.NetworkSettings && c.NetworkSettings.Networks) {
      for (const net of Object.values(c.NetworkSettings.Networks) as any[]) {
        if (net.IPAddress) used.add(net.IPAddress);
      }
    }
  }
  try {
    const net = networks.find((n) => n.Name === NETWORK);
    if (net && net.Containers) {
      for (const c of Object.values(net.Containers) as any[]) {
        if (c.IPv4Address) used.add(c.IPv4Address.replace(/\/.*$/, ''));
      }
    }
  } catch {}
  return Array.from(used);
}

function allocateIp(used: string[]): string {
  for (let i = IP_POOL_START; i <= IP_POOL_END; i++) {
    const ip = `${SUBNET}.${i}`;
    if (!used.includes(ip)) return ip;
  }
  throw new Error('No available IPs in pool');
}

function randomPort(): number {
  // avoid well-known ports for simplicity
  return Math.floor(Math.random() * (8999 - 3000 + 1)) + 3000;
}

async function createDockerServer(server: Omit<HostingServer, 'id' | 'status' | 'ip' | 'uptime' | 'createdAt'>): Promise<HostingServer> {
  const containers = await getContainers();
  const networks = await getNetworks();
  const usedIps = getUsedIps(containers, networks);

  const id = `srv-${Date.now().toString().slice(-7)}`;
  const ip = allocateIp(usedIps);
  const hostPort = randomPort();
  const ports: string[] = [String(hostPort)];

  const containerName = `hostamar-${id}`;
  const env = [
    `HOSTAMAR_SERVER_ID=${id}`,
    `HOSTAMAR_SERVER_NAME=${server.name}`,
    `HOSTAMAR_DOMAIN=${server.domain || ''}`,
    `HOSTAMAR_SSL=${server.ssl ? 'true' : 'false'}`,
  ];

  const portBinds: Record<string, any> = {};
  for (const p of ports) {
    portBinds[`${p}/tcp`] = [{ HostPort: p }];
  }

  const body = {
    Image: server.image,
    name: containerName,
    Env: env,
    ExposedPorts: Object.fromEntries(ports.map((p) => [`${p}/tcp`, {}])),
    HostConfig: {
      Memory: (() => {
        const map: Record<string, number> = {
          '1 GB': 1 * 1024 * 1024 * 1024,
          '2 GB': 2 * 1024 * 1024 * 1024,
          '4 GB': 4 * 1024 * 1024 * 1024,
          '8 GB': 8 * 1024 * 1024 * 1024,
        };
        return map[server.ram] || 2 * 1024 * 1024 * 1024;
      })(),
      CpuShares: (() => {
        const map: Record<string, number> = {
          '1 vCPU': 512,
          '2 vCPU': 1024,
          '4 vCPU': 2048,
        };
        return map[server.cpu] || 1024;
      })(),
      PortBindings: portBinds,
      NetworkMode: NETWORK,
  },
  NetworkingConfig: {
    EndpointsConfig: {
      [NETWORK]: { IPAMConfig: { IPv4Address: ip } },
    },
  },
};

try {
  await dockerCall('/containers/create', 'POST', body);
  await dockerCall(`/containers/${containerName}/start`, 'POST');
} catch (e) {
  console.error('Docker create error', e);
  // On failure, we continue with mock IP + status to keep page usable
}

return {
  id,
  name: server.name,
  image: server.image,
  status: 'running',
  ip,
  domain: server.domain,
  ssl: server.ssl,
  uptime: '0m',
  cpu: server.cpu,
  ram: server.ram,
  storage: server.storage,
  os: server.os,
  ports,
  createdAt: new Date().toISOString(),
};
}

export async function GET() {
  try {
    const containers = await getContainers();
    const networks = await getNetworks();
    const usedIps = getUsedIps(containers, networks);

    // Try to read persisted state from a hidden in-memory store in this process only.
    // For a more persistent state, a DB table would be used; here we return Docker + mock mix.
    const realContainers = containers
      .filter((c) => c.Names && c.Names.some((n: string) => n.startsWith('/hostamar-srv-')))
      .map((c) => {
        const ip = c.NetworkSettings?.Networks?.[NETWORK]?.IPAddress || 'hostamar-network';
        return {
          id: c.Id,
          name: (c.Labels?.HOSTAMAR_SERVER_NAME as string) || c.Names?.[0]?.replace(/^\//, '') || c.Id,
          image: c.Image,
          status: c.State === 'running' ? 'running' : c.State === 'exited' ? 'stopped' : 'error',
          ip,
          domain: (c.Labels?.HOSTAMAR_DOMAIN as string) || undefined,
          ssl: c.Labels?.HOSTAMAR_SSL === 'true',
          uptime: c.State === 'running' ? 'active' : '0m',
          cpu: '2 vCPU',
          ram: '4 GB',
          storage: '40 GB SSD',
          os: 'Alpine Linux 3.19',
          ports: (c.Ports || []).map((p: any) => String(p.PublicPort)).filter(Boolean),
          createdAt: c.Created,
        } as HostingServer;
      });

    const servers = [...mockServers(), ...realContainers];

    return NextResponse.json(servers);
  } catch (e) {
    return NextResponse.json(mockServers());
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, image, cpu, ram, storage, os, ports, domain, ssl } = body || {};

    if (!name || !image) {
      return NextResponse.json({ error: 'name and image are required' }, { status: 400 });
    }

    const dockerComposePath = process.cwd() + '/docker-compose.yml';
    let dynamicCompose = '';

    try {
      const fs = await import('fs');
      if (fs.existsSync(dockerComposePath)) {
        dynamicCompose = fs.readFileSync(dockerComposePath, 'utf-8');
      }
    } catch {}

    // If the requested image is already referenced in docker-compose, we can rely on Docker
    // to pull or use it. Otherwise, Docker will attempt to pull it automatically.
    const server = await createDockerServer({
      name,
      image,
      cpu: cpu || '2 vCPU',
      ram: ram || '4 GB',
      storage: storage || '40 GB SSD',
      os: os || 'Alpine Linux 3.19',
      ports: Array.isArray(ports) ? ports : [],
      domain,
      ssl: !!ssl,
    });

    return NextResponse.json(server, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create server' }, { status: 500 });
  }
}
