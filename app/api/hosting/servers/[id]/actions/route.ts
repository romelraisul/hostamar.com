import { NextRequest, NextResponse } from 'next/server';

const DOCKER_SOCK = 'http://localhost';

async function dockerCall(path: string, method = 'GET', body?: any): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${DOCKER_SOCK}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (e: any) {
    throw new Error(e.message || 'Docker request failed');
  } finally {
    clearTimeout(timeout);
  }
}

async function findContainerName(id: string): Promise<string | null> {
  // Try direct id, then search containers for a name containing id
  try {
    const data = await dockerCall(`/containers/${id}/json`);
    if (data && data.Names) return data.Names[0];
    return null;
  } catch {
    return null;
  }
}

function mapStatus(state: string) {
  if (state === 'running') return 'running';
  if (state === 'exited' || state === 'created' || state === 'dead' || state === 'paused') return 'stopped';
  return 'error';
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const name = await findContainerName(id);
    if (!name) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }
    const data = await dockerCall(`/containers/${encodeURIComponent(name)}/json`);
    const logs = await dockerCall(`/containers/${encodeURIComponent(name)}/logs?stdout=true&stderr=true&tail=200`);
    const logsText = typeof logs === 'string' ? logs : '';

    const networks = data.NetworkSettings?.Networks || {};
    const ip = networks['hostamar-network']?.IPAddress || networks['hostamar_network']?.IPAddress || 'unknown';

    const server = {
      id,
      name: data.Name?.replace(/^\//, '') || name,
      state: data.State?.toLowerCase() || 'unknown',
      status: mapStatus(data.State || 'unknown'),
      ip,
      image: data.Config?.Image,
      restart: data.HostConfig?.RestartPolicy,
      created: data.Created,
      ports: (data.NetworkSettings?.Ports || {}) || {},
      mounts: (data.Mounts || []).map((m: any) => ({
        type: m.Type,
        source: m.Source,
        destination: m.Destination,
      })),
      resourceUsage: {
        memory: data.HostConfig?.Memory,
        cpuShares: data.HostConfig?.CpuShares,
      },
      labels: data.Config?.Labels || {},
      logs: logsText,
    };

    return NextResponse.json(server);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();
    const action = String(body.action || '').toLowerCase();

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json({ error: 'Unsupported action. Use start, stop, or restart.' }, { status: 400 });
    }

    const name = await findContainerName(id);
    if (!name) {
      // Fall back to assuming provided id is a container name/ID
    }

    const target = encodeURIComponent(name || id);

    if (action === 'start') {
      await dockerCall(`/containers/${target}/start`, 'POST');
    } else if (action === 'stop') {
      await dockerCall(`/containers/${target}/stop`, 'POST');
    } else {
      await dockerCall(`/containers/${target}/restart`, 'POST');
    }

    const updated = await dockerCall(`/containers/${target}/json`);
    const status = mapStatus(updated.State || 'unknown');

    return NextResponse.json({
      id,
      status,
      action,
      message: `Server successfully ${action}ed.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Action failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const name = await findContainerName(id);
    const target = encodeURIComponent(name || id);

    await dockerCall(`/containers/${target}?force=true`, 'DELETE');
    return NextResponse.json({ success: true, message: 'Server deleted.' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Delete failed' }, { status: 500 });
  }
}
