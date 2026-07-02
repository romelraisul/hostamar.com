import React from 'react';
import DevIdeClient from './components/DevIdeClient';

export default function IdePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
              {'</>'}
            </div>
            <div>
              <h1 className="text-lg font-semibold">Hostamar Dev IDE</h1>
              <p className="text-xs text-gray-400">
                Browser-based coding workspace with Docker + VS Code backend
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-gray-400 hover:text-white"
            >
              Docs
            </a>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
              Ready
            </span>
          </div>
        </div>

        <DevIdeClient />
      </div>
    </div>
  );
}
