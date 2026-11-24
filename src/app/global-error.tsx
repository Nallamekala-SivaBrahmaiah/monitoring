'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Fatal platform error:', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-[#070B14] text-white flex items-center justify-center min-h-screen p-6 font-sans">
        <div className="bg-[#0D1526] border border-rose-500/30 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
          <h2 className="text-lg font-bold text-white">Application Exception</h2>
          <p className="text-xs text-slate-400">
            {error?.message || 'A critical rendering exception occurred.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-lg shadow-blue-600/30"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
