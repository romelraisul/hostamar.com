// File: /app/_error.tsx
'use client';

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-6xl mb-4">🔧</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h1>
        <p className="text-gray-600 mb-4">
          Something went wrong!
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
        >
          Try Again
        </button>
        <a href="/" className="px-4 py-2 border rounded hover:bg-gray-50">
          Home
        </a>
      </div>
    </div>
  );
}