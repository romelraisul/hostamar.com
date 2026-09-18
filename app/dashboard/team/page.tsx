'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, UserPlus, Copy, Check, Loader2, Building2 } from 'lucide-react';

type Member = { id: string; name: string | null; email: string | null; role: string };
type PendingInvite = { id: string; email: string; role: string; createdAt: string };
type Workspace = {
  id: string;
  name: string;
  slug: string;
  role: string;
  members: Member[];
  pendingInvites: PendingInvite[];
};

export default function TeamPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteOrg, setInviteOrg] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/team', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load workspaces');
      const data = await res.json();
      setWorkspaces(data.workspaces || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createWorkspace = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create workspace');
      setNewName('');
      setNotice(`Workspace "${data.workspace.name}" created.`);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !inviteOrg) return;
    setInviting(true);
    setError(null);
    setInviteLink(null);
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: inviteOrg, email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to invite');
      setInviteLink(data.invite?.inviteLink || null);
      setInviteEmail('');
      setNotice(`Invite sent to ${data.invite?.email}`);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setInviting(false);
    }
  };

  const copyInvite = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="w-7 h-7 text-emerald-400" /> Team Workspaces
          </h1>
          <p className="text-zinc-400 mt-1">Collaborate with your team. Invite members by email.</p>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
        {notice && <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</div>}

        {/* Create workspace */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 mb-6">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" /> Create Workspace
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Workspace name (e.g. My Agency)"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && createWorkspace()}
            />
            <button
              onClick={createWorkspace}
              disabled={creating || !newName.trim()}
              className="shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create
            </button>
          </div>
        </div>

        {/* Invite member */}
        {workspaces.length > 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 mb-6">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-400" /> Invite Member
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={inviteOrg}
                onChange={(e) => setInviteOrg(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Select workspace</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="member@example.com"
                type="email"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
              />
              <button
                onClick={sendInvite}
                disabled={inviting || !inviteEmail.trim() || !inviteOrg}
                className="shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition"
              >
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Invite
              </button>
            </div>
            {inviteLink && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                <code className="flex-1 text-xs text-emerald-300 font-mono break-all">{inviteLink}</code>
                <button onClick={copyInvite} className="shrink-0 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Workspaces */}
        {loading ? (
          <div className="text-center text-zinc-500 py-10">Loading...</div>
        ) : workspaces.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-10 text-center text-zinc-500 text-sm">
            No workspaces yet. Create one above to start collaborating.
          </div>
        ) : (
          <div className="space-y-4">
            {workspaces.map((w) => (
              <div key={w.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" /> {w.name}
                  </h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">{w.role}</span>
                </div>
                <div className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3">
                    <Users className="w-4 h-4" /> {w.members.length} member{w.members.length !== 1 ? 's' : ''}
                  </div>
                  <div className="space-y-2">
                    {w.members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-2.5">
                        <div>
                          <div className="text-sm text-white">{m.name || m.email || m.id}</div>
                          {m.email && <div className="text-xs text-zinc-500">{m.email}</div>}
                        </div>
                        <span
                          className={
                            'text-xs px-2 py-1 rounded-full ' +
                            (m.role === 'owner'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : m.role === 'admin'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-zinc-700 text-zinc-300')
                          }
                        >
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                  {w.pendingInvites.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs text-zinc-500 mb-2">Pending invites</div>
                      {w.pendingInvites.map((i) => (
                        <div key={i.id} className="flex items-center justify-between rounded-lg bg-amber-500/5 border border-amber-500/20 px-4 py-2 mb-1">
                          <span className="text-sm text-amber-200">{i.email}</span>
                          <span className="text-xs text-amber-400">pending</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
