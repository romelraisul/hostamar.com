'use client';

import { useEffect, useState } from 'react';
import { Key, Plus, Copy, Check, Trash2, Shield, Loader2 } from 'lucide-react';

type ApiKey = {
  id: string;
  name: string;
  canGenerateImage: boolean;
  canGenerateVideo: boolean;
  canUseChat: boolean;
  rateLimitPerMinute: number;
  totalRequests: number;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = async () => {
    try {
      const res = await fetch('/api/keys', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load keys');
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create key');
      setNewKey(data.key);
      setNewKeyName('');
      await loadKeys();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (id: string) => {
    if (!confirm('Delete this API key? This cannot be undone.')) return;
    try {
      await fetch(`/api/keys/${id}`, { method: 'DELETE', credentials: 'include' });
      await loadKeys();
    } catch {
      /* ignore */
    }
  };

  const copyKey = () => {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Key className="w-7 h-7 text-emerald-400" /> API Keys
          </h1>
          <p className="text-zinc-400 mt-1">
            Use API keys to call Hostamar APIs programmatically. Pass as{' '}
            <code className="text-emerald-300 bg-zinc-900 px-1.5 py-0.5 rounded text-sm">Authorization: Bearer &lt;key&gt;</code>
          </p>
        </div>

        {/* Create key */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. my-app)"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && createKey()}
            />
            <button
              onClick={createKey}
              disabled={creating || !newKeyName.trim()}
              className="shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Key
            </button>
          </div>

          {newKey && (
            <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-xs text-emerald-300 mb-2 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Copy this key now — it won't be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm text-white bg-zinc-900 rounded px-3 py-2 break-all">{newKey}</code>
                <button onClick={copyKey} className="shrink-0 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
        )}

        {/* Keys list */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="font-semibold">Your Keys ({keys.length}/5)</h2>
          </div>
          {loading ? (
            <div className="px-6 py-10 text-center text-zinc-500">Loading...</div>
          ) : keys.length === 0 ? (
            <div className="px-6 py-10 text-center text-zinc-500 text-sm">No API keys yet. Create one above.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-6 py-3 text-xs text-zinc-500 font-medium">Name</th>
                    <th className="text-left px-6 py-3 text-xs text-zinc-500 font-medium">Permissions</th>
                    <th className="text-left px-6 py-3 text-xs text-zinc-500 font-medium">Requests</th>
                    <th className="text-left px-6 py-3 text-xs text-zinc-500 font-medium">Last Used</th>
                    <th className="text-left px-6 py-3 text-xs text-zinc-500 font-medium">Status</th>
                    <th className="text-right px-6 py-3 text-xs text-zinc-500 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-6 py-3 text-sm font-medium text-white">{k.name}</td>
                      <td className="px-6 py-3 text-xs text-zinc-400">
                        {[
                          k.canGenerateVideo && 'video',
                          k.canGenerateImage && 'image',
                          k.canUseChat && 'chat',
                        ]
                          .filter(Boolean)
                          .join(', ') || 'none'}
                      </td>
                      <td className="px-6 py-3 text-sm text-zinc-300">{k.totalRequests}</td>
                      <td className="px-6 py-3 text-sm text-zinc-400">
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'never'}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={
                            'text-xs px-2 py-1 rounded-full ' +
                            (k.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300')
                          }
                        >
                          {k.isActive ? 'active' : 'disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => deleteKey(k.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition"
                          title="Delete key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
