'use client';

import { useEffect, useState } from 'react';

interface ServiceHealth {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'error';
  responseTime: number | null;
  statusCode: number | null;
  message: string;
}

interface DockerContainer {
  name: string;
  status: string;
  ports: string;
  isRunning: boolean;
}

interface DockerStatus {
  status: string;
  containers: DockerContainer[];
  message: string;
}

interface CloudflaredStatus {
  name: string;
  status: string;
  message: string;
}

interface MonitorData {
  timestamp: string;
  overallStatus: string;
  summary: {
    total: number;
    online: number;
    offline: number;
  };
  services: ServiceHealth[];
  infrastructure: {
    docker: DockerStatus;
    cloudflared: CloudflaredStatus;
  };
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    online: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    healthy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    offline: 'bg-red-500/20 text-red-400 border-red-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    degraded: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    down: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const dots = {
    online: 'bg-emerald-400',
    healthy: 'bg-emerald-400',
    offline: 'bg-red-400',
    error: 'bg-red-400',
    degraded: 'bg-yellow-400',
    warning: 'bg-yellow-400',
    down: 'bg-red-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors[status as keyof typeof colors] || colors.error}`}
    >
      <span className={`w-2 h-2 rounded-full ${dots[status as keyof typeof dots] || dots.error} animate-pulse`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ServiceCard({ service }: { service: ServiceHealth }) {
  const isOnline = service.status === 'online';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-white font-semibold text-base">{service.name}</h3>
        <StatusBadge status={service.status} />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">URL</span>
          <span className="text-gray-400 font-mono text-xs truncate ml-4 max-w-[200px]">
            {service.url}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Response Time</span>
          <span
            className={`font-mono ${
              service.responseTime !== null
                ? service.responseTime < 500
                  ? 'text-emerald-400'
                  : service.responseTime < 1000
                    ? 'text-yellow-400'
                    : 'text-red-400'
                : 'text-gray-600'
            }`}
          >
            {service.responseTime !== null ? `${service.responseTime}ms` : 'N/A'}
          </span>
        </div>

        {service.statusCode && (
          <div className="flex justify-between">
            <span className="text-gray-500">Status Code</span>
            <span className="text-gray-400 font-mono">{service.statusCode}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-gray-500">Status</span>
          <span className={isOnline ? 'text-emerald-400' : 'text-red-400'}>
            {service.message}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-800">
        <div className="w-full bg-gray-800 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${
              isOnline
                ? service.responseTime !== null && service.responseTime < 500
                  ? 'bg-emerald-500'
                  : 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{
              width: isOnline
                ? service.responseTime !== null
                  ? `${Math.min(100, Math.max(20, 100 - service.responseTime / 20))}%`
                  : '50%'
                : '5%',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function DockerCard({ docker }: { docker: DockerStatus }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-base">Docker Containers</h3>
          <p className="text-gray-500 text-sm mt-0.5">{docker.message}</p>
        </div>
        <StatusBadge status={docker.status} />
      </div>

      {docker.containers.length > 0 ? (
        <div className="space-y-2">
          {docker.containers.map((container, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-gray-950 rounded-lg px-4 py-3 border border-gray-800"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    container.isRunning ? 'bg-emerald-400' : 'bg-red-400'
                  }`}
                />
                <span className="text-gray-300 font-mono text-sm">
                  {container.name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-500 text-xs block">
                  {container.ports || 'No ports'}
                </span>
                <span className="text-gray-600 text-xs">{container.status}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 text-sm text-center py-4">
          {docker.message}
        </p>
      )}
    </div>
  );
}

function CloudflaredCard({ cloudflared }: { cloudflared: CloudflaredStatus }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-base">{cloudflared.name}</h3>
          <p className="text-gray-500 text-sm mt-0.5">Tunnel Service</p>
        </div>
        <StatusBadge status={cloudflared.status} />
      </div>

      <div className="bg-gray-950 rounded-lg px-4 py-3 border border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">Process Status</span>
          <span
            className={`font-mono text-sm ${
              cloudflared.status === 'online' ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {cloudflared.message}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MonitorPage() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(10);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/monitor');
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
      setCountdown(10);
    } catch (err) {
      console.error('Failed to fetch monitor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 10000);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 10;
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading monitor data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-2">Failed to load monitor data</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Hostamar Monitor</h1>
            <p className="text-gray-500 mt-1">
              Service health dashboard &middot; Auto-refreshes every 10s
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-gray-400 text-sm">
                Refresh in <span className="text-emerald-400 font-mono">{countdown}s</span>
              </span>
            </div>

            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg text-gray-400 hover:text-white transition-all"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Overall Status */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <StatusBadge status={data.overallStatus} />
              <div>
                <p className="text-white font-medium">
                  {data.summary.online} / {data.summary.total} services online
                </p>
                <p className="text-gray-500 text-sm">
                  Last checked:{' '}
                  {lastRefresh?.toLocaleTimeString() || 'Unknown'}
                </p>
              </div>
            </div>

            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <p className="text-emerald-400 text-2xl font-bold">
                  {data.summary.online}
                </p>
                <p className="text-gray-500">Online</p>
              </div>
              <div className="text-center">
                <p className="text-red-400 text-2xl font-bold">
                  {data.summary.offline}
                </p>
                <p className="text-gray-500">Offline</p>
              </div>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <h2 className="text-xl font-semibold text-white mb-4">Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {data.services.map((service) => (
            <ServiceCard key={service.name} service={service} />
          ))}
        </div>

        {/* Infrastructure */}
        <h2 className="text-xl font-semibold text-white mb-4">Infrastructure</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DockerCard docker={data.infrastructure.docker} />
          <CloudflaredCard cloudflared={data.infrastructure.cloudflared} />
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-800 text-center">
          <p className="text-gray-600 text-sm">
            Hostamar Platform Monitor &middot; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
