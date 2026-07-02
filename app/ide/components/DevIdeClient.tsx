'use client';

import React, { useEffect, useMemo, useState } from 'react';

type IdeStep =
  | 'idle'
  | 'launching'
  | 'waiting'
  | 'ready'
  | 'error';

export default function DevIdeClient() {
  const [step, setStep] = useState<IdeStep>('idle');
  const [serverId, setServerId] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const statusColor = useMemo(() => {
    switch (step) {
      case 'ready':
        return 'text-emerald-400';
      case 'launching':
      case 'waiting':
        return 'text-amber-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-300';
    }
  }, [step]);

  function addLog(line: string) {
    setLogs((prev) => [...prev.slice(-40), `[${new Date().toLocaleTimeString()}] ${line}`]);
  }

  async function createServer() {
    setStep('launching');
    setError(null);
    setLogs([]);
    addLog('Requesting new coding workspace...');

    try {
      const res = await fetch('/api/ide/server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: 'openvscode/openvscode-server', cpu: 2, memory: 2048 }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        const msg =
          typeof data === 'object' && data && 'error' in data
            ? String((data as any).error)
            : `Workspace request failed with ${res.status}`;
        throw new Error(msg);
      }

      const newServerId = (data.serverId || data.id || 'unknown') as string;
      setServerId(newServerId);
      setStep('waiting');
      addLog(`Workspace requested: ${newServerId}`);
      addLog('Allocating container on hostamar-network...');
    } catch (e: any) {
      setStep('error');
      setError(e?.message || 'Failed to launch coding workspace');
      addLog(`Error: ${e?.message || 'unknown error'}`);
    }
  }

  async function pollReady() {
    if (!serverId) return;
    try {
      const res = await fetch(`/api/ide/server/${encodeURIComponent(serverId)}/status`);
      const data = await res.json().catch(() => ({}));
      const ready = !!(data && data.ready);
      if (ready) {
        setStep('ready');
        setUrl(data.url || '/ide/preview');
        addLog('Workspace is ready.');
        addLog(
          `URL: ${data.url || '/ide/preview'} · Status: ${data.status || 'running'}`
        );
      } else {
        addLog(`Status: ${data.status || 'pending'}...`);
      }
    } catch (e: any) {
      addLog(`Status check failed: ${e?.message || 'unknown error'}`);
    }
  }

  useEffect(() => {
    if (!['launching', 'waiting'].includes(step) || !serverId) return;
    const timer = setTimeout(() => pollReady(), 1000);
    return () => clearTimeout(timer);
  }, [step, serverId]);

  return (
    <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Workspace</h2>
              <p className="text-xs text-gray-400">
                Create a browser-based coding environment backed by Docker.
              </p>
            </div>
            <button
              type="button"
              onClick={createServer}
              disabled={!['idle', 'error'].includes(step)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
            >
              {step === 'ready' ? 'New Workspace' : 'Launch Workspace'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm">
            <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4">
              <p className="text-xs text-gray-400">Status</p>
              <p className={`mt-1 font-medium capitalize ${statusColor}`}>
                {step === 'idle' && 'Idle'}
                {step === 'launching' && 'Launching'}
                {step === 'waiting' && 'Provisioning'}
                {step === 'ready' && 'Ready'}
                {step === 'error' && 'Failed'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4">
              <p className="text-xs text-gray-400">Backend</p>
              <p className="mt-1 font-medium">Docker + Open VS Code Server</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4">
              <p className="text-xs text-gray-400">Access</p>
              <p className="mt-1 font-medium break-all">
                {url ? url : 'Pending'}
              </p>
            </div>
          </div>
        </div>

        {url ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
            <iframe
              src={url}
              title="Dev IDE"
              className="h-[520px] w-full rounded-xl border border-gray-800 bg-black"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6 text-sm text-gray-400">
            Launch a workspace to start coding in-browser.
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
          <h3 className="text-sm font-semibold">Event Log</h3>
          <div className="mt-3 h-80 overflow-y-auto rounded-xl bg-black/40 p-3 text-xs font-mono text-gray-300">
            {logs.length === 0 ? (
              <p className="text-gray-500">No events yet.</p>
            ) : (
              logs.map((entry, index) => (
                <div key={index} className="border-b border-gray-800/60 py-1 last:border-none">
                  {entry}
                </div>
              ))
            )}
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-300">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
