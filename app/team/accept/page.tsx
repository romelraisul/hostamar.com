'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, Building2 } from 'lucide-react';

function AcceptContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') || '';
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('No invite token provided.');
      return;
    }
    fetch('/api/team/accept', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setState('success');
          setWorkspaceName(data.workspace?.name || 'the workspace');
          setMessage(data.message || 'You joined the workspace!');
        } else {
          setState('error');
          setMessage(data.message || data.error || 'Failed to accept invite.');
        }
      })
      .catch(() => {
        setState('error');
        setMessage('Network error. Please try again.');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        {state === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Accepting invite...</h1>
            <p className="text-zinc-400 text-sm">Joining the workspace.</p>
          </>
        )}
        {state === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Welcome aboard!</h1>
            <p className="text-zinc-400 text-sm mb-6">{message}</p>
            <button
              onClick={() => router.push('/dashboard/team')}
              className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4" /> Go to Team Workspace
            </button>
          </>
        )}
        {state === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Invite Problem</h1>
            <p className="text-zinc-400 text-sm mb-6">{message}</p>
            <p className="text-zinc-500 text-xs">
              Make sure you're logged in with the invited email, and that the invite hasn't expired.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function TeamAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      }
    >
      <AcceptContent />
    </Suspense>
  );
}
