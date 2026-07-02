'use client';

import React, { FormEvent, useEffect, useMemo, useState } from 'react';

export type ServerStatus = 'running' | 'stopped' | 'error';

export interface HostingServer {
  id: string;
  name: string;
  image: string;
  status: ServerStatus;
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

interface BillingPoint {
  date: string;
  cpu: number;
  memory: number;
  storage: number;
}

const NETWORK = 'hostamar-network';
const IP_POOL_START = 200;
const IP_POOL_END = 250;
const SUBNET = '172.19.0';

export default function HostingPage() {
  const [servers, setServers] = useState<HostingServer[]>([]);
  const [visibleServers, setVisibleServers] = useState<HostingServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  const [tab, setTab] = useState<'servers' | 'domains' | 'billing'>('servers');

  const [form, setForm] = useState({
    name: '',
    image: 'nginx:alpine',
    cpu: '2 vCPU',
    ram: '4 GB',
    storage: '40 GB SSD',
    os: 'Alpine Linux 3.19',
    ports: '80',
    domain: '',
    autoSsl: true,
  });

  const [domainForm, setDomainForm] = useState({ serverId: '', domain: '', autoSsl: true });

  // Billing state
  const [billing, setBilling] = useState<{ total: number | null; history: BillingPoint[] }>({ total: null, history: [] });

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/hosting/servers');
      const data = (await res.json().catch(() => [])) as HostingServer[];
      let list: HostingServer[] = Array.isArray(data) ? data : [];
      // If no servers returned from API, keep our state if any.
      if (!list.length && servers.length) list = servers;
      setServers(list);
      setVisibleServers(list);

      // Fake history if empty
      if (!billing.history.length) {
        const days = 14;
        const now = Date.now();
        const history = Array.from({ length: days }).map((_, idx) => {
          const d = new Date(now - (days - idx) * 86400000).toISOString().slice(0, 10);
          return {
            date: d,
            cpu: 10 + Math.random() * 40,
            memory: 30 + Math.random() * 30,
            storage: 45 + Math.random() * 10,
          };
        });
        setBilling({ total: 42.5, history });
      } else {
        const total = servers.reduce((acc, s) => acc + 1.5, 0);
        setBilling({ total: Number(total.toFixed(2)), history: billing.history });
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (tab === 'billing') {
      setBilling((prev) => ({
        ...prev,
        total: servers.reduce((acc, s) => acc + 1.5, 0),
      }));
    }
  }, [tab, servers]);

  async function handleCreateServer(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const body: any = {
        name: form.name,
        image: form.image,
        cpu: form.cpu,
        ram: form.ram,
        storage: form.storage,
        os: form.os,
        ports: form.ports.split(',').map((p) => p.trim()).filter(Boolean),
        domain: form.domain || undefined,
        ssl: form.autoSsl,
      };
      const res = await fetch('/api/hosting/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        setError(err.error || 'Failed to create server');
        setServers((prev) => prev);
        return;
      }
      const created = (await res.json()) as HostingServer;
      setServers((prev) => [...prev, created]);
      setFormOpen(false);
      setForm({
        name: '',
        image: 'nginx:alpine',
        cpu: '2 vCPU',
        ram: '4 GB',
        storage: '40 GB SSD',
        os: 'Alpine Linux 3.19',
        ports: '80',
        domain: '',
        autoSsl: true,
      });
      await refresh();
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    }
  }

  async function handleDeleteServer(server: HostingServer) {
    if (!confirm(`Delete ${server.name}? This cannot be undone.`)) return;
    try {
      // Use the direct API endpoint with the server object's id
      const res = await fetch(`/api/hosting/servers/${encodeURIComponent(server.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        setError(err.error || 'Delete failed');
        return;
      }
      setServers((prev) => prev.filter((s) => s.id !== server.id));
      await refresh();
    } catch (e: any) {
      setError(e.message || 'Delete failed');
    }
  }

  async function handleServerAction(server: HostingServer, action: 'start' | 'stop' | 'restart') {
    setError(null);
    try {
      const res = await fetch(`/api/hosting/servers/${encodeURIComponent(server.id)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        setError(err.error || 'Action failed');
        return;
      }
      await refresh();
    } catch (e: any) {
      setError(e.message || 'Action failed');
    }
  }

  async function handleAttachDomain(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/hosting/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: domainForm.serverId,
          domain: domainForm.domain,
          autoSsl: domainForm.autoSsl,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        setError(err.error || 'Domain attachment failed');
        return;
      }
      setDomainOpen(false);
      setDomainForm({ serverId: '', domain: '', autoSsl: true });
      await refresh();
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    }
  }

  async function fetchLogs(serverId: string) {
    setActiveServerId(serverId);
    setLogs(null);
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/hosting/servers/${encodeURIComponent(serverId)}`);
      const data = (await res.json().catch(() => ({}))) as any;
      setLogs(data?.logs || 'No logs available.');
    } catch {
      setLogs('Failed to load logs.');
    } finally {
      setLogsLoading(false);
    }
  }

  const search = (q: string) => {
    const term = q.toLowerCase().trim();
    setVisibleServers(term ? servers.filter((s) => s.name.toLowerCase().includes(term) || s.ip.includes(term) || (s.domain || '').toLowerCase().includes(term)) : [...servers]);
  };

  const colorBits = useMemo(() => {
    return 'bg-gradient-to-r from-emerald-500/20 via-sky-500/20 to-indigo-500/20';
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 antialiased">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Cloud Hosting</h1>
            <p className="text-sm text-slate-400">Deploy containers, manage DNS, and monitor usage.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Create Server
            </button>
          </div>
        </header>

        <main className="mt-8 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <GlassCard>
              <GhostStat label="Active Servers" value={String(servers.filter((s) => s.status === 'running').length)} />
            </GlassCard>
            <GlassCard>
              <GhostStat label="Total IPs" value={String(servers.length)} />
            </GlassCard>
            <GlassCard>
              <GhostStat label="Estimated Bill" value={`$${billing.total !== null ? billing.total.toFixed(2) : '0.00'}`} />
            </GlassCard>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex items-center gap-1 rounded-full bg-white/5 p-1 backdrop-blur">
              <TabButton active={tab === 'servers'} onClick={() => setTab('servers')}>Servers</TabButton>
              <TabButton active={tab === 'domains'} onClick={() => setTab('domains')}>Domains</TabButton>
              <TabButton active={tab === 'billing'} onClick={() => setTab('billing')}>Billing</TabButton>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={''}
                onChange={(e) => search(e.target.value)}
                placeholder="Search servers, IPs, or domains…"
                className="w-64 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-400 outline-none backdrop-blur transition focus:border-white/20"
              />
            </div>
          </div>

          {error && <ErrorBanner message={error} />}

          {tab === 'servers' && (
            <section className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-300">
                        <th className="px-4 py-3 font-medium">Server</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">IP</th>
                        <th className="px-4 py-3 font-medium">Domain</th>
                        <th className="px-4 py-3 font-medium">SSL</th>
                        <th className="px-4 py-3 font-medium">Uptime</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading servers…</td>
                        </tr>
                      )}
                      {!loading && visibleServers.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No servers found.</td>
                        </tr>
                      )}
                      {visibleServers.map((server) => (
                        <tr key={server.id} className="border-b border-white/5 transition hover:bg-white/5">
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-white">{server.name}</span>
                              <span className="text-xs text-slate-400">{server.image}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={server.status} />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-300">{server.ip}</td>
                          <td className="px-4 py-3 text-xs text-slate-300">{server.domain || '—'}</td>
                          <td className="px-4 py-3">
                            {server.ssl ? <Pill label="SSL" tone="emerald" /> : <Pill label="None" tone="slate" />}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-300">{server.uptime}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <GhostButton onClick={() => handleServerAction(server, 'start')} label="Start" />
                              <GhostButton onClick={() => handleServerAction(server, 'stop')} label="Stop" />
                              <GhostButton onClick={() => handleServerAction(server, 'restart')} label="Restart" />
                              <GhostButton onClick={() => fetchLogs(server.id)} label="Logs" />
                              <GhostButton onClick={() => handleDeleteServer(server)} label="Delete" tone="rose" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {tab === 'domains' && (
            <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="md:col-span-1">
                <form onSubmit={handleAttachDomain} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <h3 className="text-base font-medium text-white">Attach Domain</h3>
                  <div className="space-y-3">
                    <Input label="Server ID" value={domainForm.serverId} onChange={(v) => setDomainForm((p) => ({ ...p, serverId: v }))} placeholder="srv-1001" />
                    <Input label="Domain" value={domainForm.domain} onChange={(v) => setDomainForm((p) => ({ ...p, domain: v }))} placeholder="app.example.com" />
                    <Toggle checked={domainForm.autoSsl} onChange={(checked) => setDomainForm((p) => ({ ...p, autoSsl: checked }))} label="Auto-SSL" />
                  </div>
                  <button type="submit" className="w-full rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20">Attach Domain</button>
                </form>
              </div>
              <div className="md:col-span-2">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
                  <div className="px-5 py-4">
                    <h3 className="text-base font-medium text-white">Attached Domains</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-300">
                          <th className="px-5 py-3 font-medium">Domain</th>
                          <th className="px-5 py-3 font-medium">Server</th>
                          <th className="px-5 py-3 font-medium">SSL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {servers.filter((s) => s.domain).length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-5 py-8 text-center text-slate-400">No domains attached yet.</td>
                          </tr>
                        )}
                        {servers
                          .filter((s) => s.domain)
                          .map((s) => (
                            <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                              <td className="px-5 py-3 text-xs text-slate-200">{s.domain}</td>
                              <td className="px-5 py-3 text-xs text-slate-300">{s.name}</td>
                              <td className="px-5 py-3">{s.ssl ? <Pill label="Active" tone="emerald" /> : <Pill label="Inactive" tone="slate" />}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          )}

          {tab === 'billing' && (
            <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <GlassCard>
                <GhostStat label="Monthly Estimate" value={`$${billing.total !== null ? billing.total.toFixed(2) : '0.00'}`} />
              </GlassCard>
              <GlassCard>
                <p className="text-xs text-slate-400">Compute Rates</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-200">
                  <li>Nginx / Load Balancer: <span className="font-medium">$5.00/mo</span></li>
                  <li>API / Node runtime: <span className="font-medium">$9.00/mo</span></li>
                  <li>Storage add-ons: <span className="font-medium">$1.00/GB/mo</span></li>
                </ul>
              </GlassCard>
              <GlassCard>
                <p className="text-xs text-slate-400">Usage this month</p>
                <div className="mt-4 h-2 w-full rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-sky-400" style={{ width: '38%' }} />
                </div>
                <p className="mt-2 text-xs text-slate-300">38% of estimated budget used</p>
              </GlassCard>
              <div className="md:col-span-3">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-sm text-slate-300">CPU / Memory / Storage trend</p>
                  <div className="mt-4 h-64 w-full rounded-xl border border-dashed border-white/10 bg-white/[0.02]" />
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Create Server Modal */}
      {formOpen && (
        <Modal onClose={() => setFormOpen(false)}>
          <form onSubmit={handleCreateServer} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Create Server</h3>
              <button type="button" onClick={() => setFormOpen(false)} className="text-slate-300 transition hover:text-white">✕</button>
            </div>
            <p className="text-xs text-slate-400">Each server spins up a containerized workload with static IP on <code className="rounded bg-white/10 px-1 py-0.5 text-slate-200">{NETWORK}</code>.</p>
            <Input label="Server Name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="web-prod-01" />
            <Input label="Image" value={form.image} onChange={(v) => setForm((p) => ({ ...p, image: v }))} placeholder="nginx:alpine" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="CPU" value={form.cpu} onChange={(v) => setForm((p) => ({ ...p, cpu: v }))} placeholder="2 vCPU" />
              <Input label="RAM" value={form.ram} onChange={(v) => setForm((p) => ({ ...p, ram: v }))} placeholder="4 GB" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Storage" value={form.storage} onChange={(v) => setForm((p) => ({ ...p, storage: v }))} placeholder="40 GB SSD" />
              <Input label="OS" value={form.os} onChange={(v) => setForm((p) => ({ ...p, os: v }))} placeholder="Alpine Linux 3.19" />
            </div>
            <Input label="Ports" value={form.ports} onChange={(v) => setForm((p) => ({ ...p, ports: v }))} placeholder="80, 443" />
            <Input label="Initial Domain (optional)" value={form.domain} onChange={(v) => setForm((p) => ({ ...p, domain: v }))} placeholder="app.hostamar.com" />
            <Toggle checked={form.autoSsl} onChange={(checked) => setForm((p) => ({ ...p, autoSsl: checked }))} label="Auto-SSL" />
            <button type="submit" className="w-full rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">Provision Server</button>
          </form>
        </Modal>
      )}

      {/* Logs Modal */}
      {activeServerId && (
        <Modal onClose={() => { setActiveServerId(null); setLogs(null); }}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Server Logs</h3>
              <button onClick={() => { setActiveServerId(null); setLogs(null); }} className="text-slate-300 transition hover:text-white">✕</button>
            </div>
            <div className="h-72 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-3">
              <pre className="whitespace-pre-wrap text-xs text-slate-200">
                {logsLoading ? 'Loading logs…' : logs || 'No logs available.'}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      {children}
    </div>
  );
}

function GhostStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm transition ${
        active ? 'bg-white/20 text-white shadow-sm backdrop-blur' : 'text-slate-300 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: ServerStatus }) {
  const map = {
    running: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    stopped: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    error: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  } as const;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function Pill({ label, tone }: { label: string; tone: 'emerald' | 'slate' | 'rose' | 'amber' }) {
  const tones = {
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    slate: 'border-white/10 bg-white/5 text-slate-200',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  } as const;
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${tones[tone]}`}>{label}</span>;
}

function GhostButton({ onClick, label, tone = 'slate' }: { onClick: () => void; label: string; tone?: 'slate' | 'rose' | 'emerald' | 'amber' }) {
  const tones = {
    slate: 'border-white/10 bg-white/10 text-slate-100 hover:bg-white/20',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20',
  } as const;
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2 py-1 text-xs transition backdrop-blur ${tones[tone]}`}
    >
      {label}
    </button>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      <span>{message}</span>
    </div>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0b1220] p-6 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-slate-300">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none backdrop-blur transition focus:border-white/20"
        required
      />
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 backdrop-blur">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? 'bg-white/30' : 'bg-white/10'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </label>
  );
}
