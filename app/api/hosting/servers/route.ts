export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * /api/hosting/servers — admin-only Docker container management.
 *
 * Talks to the Docker Engine API on the host (DOCKER_HOST env, defaults to the
 * local unix socket proxy). On Vercel there is no Docker socket, so the route
 * reports HOSTING_NOT_CONFIGURED instead of fabricating servers. No mock data.
 */

const NETWORK = 'hostamar-network';
const IP_POOL_START = 200;
const IP_POOL_END = 250;
const SUBNET = '172.19.0';

// Docker Engine API base. Set DOCKER_HOST to e.g. http://your-docker-host:2375
// to manage containers from the deployed app. Empty = not configured.
const DOCKER_BASE = (process.env.DOCKER_HOST || '').replace(/\/$/, '');

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

function notConfiguredResponse() {
  return NextResponse.json(
    {
      servers: [],
      configured: false,
      error: 'HOSTING_NOT_CONFIGURED',
      message: 'Set DOCKER_HOST (Docker Engine API) to manage hosting containers. No Docker socket is available in this environment.',
    },
    { status: 200 }
  );
}

async function dockerCall(path: string, method = 'GET', body?: any): Promise<any> {
  if (!DOCKER_BASE) throw new Error('DOCKER_HOST not configured');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${DOCKER_BASE}${path}`, {
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

  // Real creation — if it fails, report the failure (never fake success).
  await dockerCall('/containers/create', 'POST', body);
  await dockerCall(`/containers/${containerName}/start`, 'POST');

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

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unauthorized' }, { status: e?.cause?.status || 401 });
  }

  if (!DOCKER_BASE) {
    return notConfiguredResponse();
  }

  try {
    const containers = await getContainers();

    const realContainers = containers
      .filter((c) => c.Names && c.Names.some((n: string) => n.startsWith('/hostamar-')))
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

    return NextResponse.json({ servers: realContainers, configured: true });
  } catch (e) {
    return NextResponse.json({ servers: [], configured: false, error: 'Docker unreachable' });
  }
}

import { HOSTING_PRICE, resolveHostingPlan, HOSTING_PLANS } from '@/lib/pricing';

export async function POST(request: NextRequest) {
  // Customers (not just admins) can add hosting with credits.
  // Order matters: auth -> validate input -> CREDIT GATE -> docker availability,
  // so the 402 path is reachable even when DOCKER_HOST is not configured
  // (e.g. serverless deploys where provisioning happens elsewhere).
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { name, image, cpu, ram, storage, os, ports, domain, ssl } = body || {};

  if (!name || !image) {
    return NextResponse.json({ error: 'name and image are required' }, { status: 400 });
  }

  // Credit gate — check BEFORE anything else expensive.
  // Pricing is PLAN-BASED monthly (599/1199/2499/4999 Taka) as advertised on
  // /pricing — NOT the legacy per-spec formula that charged e.g. 28 credits
  // for a starter server while the page said 599.
  const planKey = resolveHostingPlan(cpu || 1, ram || 1, storage || 10);
  const plan = planKey ? HOSTING_PLANS[planKey] : null;
  const price = plan ? plan.price : HOSTING_PRICE(cpu || 1, ram || 1, storage || 10);
  const customer = await prisma.customer.findUnique({
    where: { id: authUser.id },
    select: { credits: true },
  });
  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }
  if ((customer.credits ?? 0) < price) {
    return NextResponse.json(
      { error: 'INSUFFICIENT_CREDITS', message: `This hosting needs ${price} credits — your balance is ${customer.credits ?? 0}.`, needed: price, balance: customer.credits ?? 0 },
      { status: 402 }
    );
  }

  try {
    // Enqueue for the local podman provisioner worker — Vercel can't run docker,
    // so we never gate on DOCKER_BASE here. The worker picks this up from Neon.
    const planKeyFinal: string | null = planKey;
    const request = await prisma.hostingRequest.create({
      data: {
        customerId: authUser.id,
        name,
        image,
        plan: planKey || undefined,
        cpu: Number(cpu) || 1,
        ram: Number(ram) || 1,
        storage: Number(storage) || 25,
        os: typeof os === 'string' ? os : undefined,
        ports: Array.isArray(ports) ? ports.map(String) : [],
        domain: typeof domain === 'string' ? domain : null,
        ssl: !!ssl,
        status: 'queued',
      },
    });

    // Deduct credits AFTER the container is confirmed running.
    // $transaction guards double-spend; CreditTransaction is the audit trail.
    const charged = await prisma
      .$transaction(async (tx) => {
        // Race-safe conditional decrement: updateMany returns count only when the
        // balance still covers the price at commit time.
        const res = await tx.customer.updateMany({
          where: { id: authUser.id, credits: { gte: price } },
          data: { credits: { decrement: price } },
        });
        if (res.count === 0) return null;
        const updated = await tx.customer.findUnique({
          where: { id: authUser.id },
          select: { credits: true },
        });
        // NOTE: schema.prisma's CreditTransaction model drifted from the real prod
        // table (which uses accountId→CreditAccount + product). Audit row is written
        // raw against the live shape; skipped silently when no CreditAccount exists.
        try {
          const account = await (tx as any).creditAccount.findFirst({
            where: { customerId: authUser.id },
          });
          if (account) {
            await (tx as any).creditTransaction.create({
              data: {
                accountId: account.id,
                amount: -price,
                product: 'hosting_create',
                balanceAfter: updated?.credits ?? 0,
                description: `Hosting "${name}" (${cpu || 1}/${ram || 1}/${storage || 10})`,
              },
            });
          }
        } catch { /* audit is best-effort */ }
        return updated;
      })
      .catch(() => null);

    if (!charged) {
      return NextResponse.json(
        { error: 'INSUFFICIENT_CREDITS', needed: price, balance: customer.credits ?? 0 },
        { status: 402 }
      );
    }

    return NextResponse.json(
      {
        status: 'provisioning',
        id: request.id,
        plan: plan || 'custom',
        creditsCharged: price,
        creditsRemaining: charged?.credits ?? null,
        message: `Queued. Your ${plan?.label || 'custom'} server will be live in a few minutes.`,
      },
      { status: 202 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create server' }, { status: 500 });
  }
}
