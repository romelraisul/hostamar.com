'use client';

import { useState } from 'react';

export default function BetaPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setStatus('error');
      setMessage('Name and email are required.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/beta/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Something went wrong.');
      }

      setStatus('success');
      setMessage(`Beta access requested! Your invite code: ${data.invite.code}`);
      setForm({ name: '', email: '', phone: '' });
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Request failed. Please try again.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Join the Hostamar Beta</h1>
        <p className="text-gray-600 mb-6">
          Get early access to AI video marketing, cloud hosting, and gaming tools. Limited spots available.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border rounded px-3 py-2 w-full"
              placeholder="Your name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border rounded px-3 py-2 w-full"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="phone">Phone <span className="text-gray-400">(optional)</span></label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="border rounded px-3 py-2 w-full"
              placeholder="+880..."
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="bg-blue-600 text-white px-4 py-2 rounded w-full disabled:opacity-50"
          >
            {status === 'loading' ? 'Submitting...' : 'Request Beta Access'}
          </button>

          {message && (
            <p
              className={
                status === 'error'
                  ? 'text-sm text-red-600'
                  : 'text-sm text-green-700'
              }
            >
              {message}
            </p>
          )}
        </form>

        <p className="text-xs text-gray-500 mt-4 text-center">
          By joining, you agree to receive beta updates and usage insights.
        </p>
      </div>
    </div>
  );
}
