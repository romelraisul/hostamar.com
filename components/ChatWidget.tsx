'use client';
import { useState } from 'react';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{role: string; content: string}[]>([]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="bg-white border rounded shadow-lg p-4 w-80 h-96 flex flex-col">
          <div className="flex-1 overflow-auto">{messages.map((m, i) => <div key={i}>{m.content}</div>)}</div>
          <input className="border rounded mt-2 px-2 py-1" placeholder="Type..." />
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center"
      >
        💬
      </button>
    </div>
  );
}
