'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center p-6">
      <div className="bg-[#0D1526] border border-rose-500/30 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-white tracking-tight">Application Notice</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error?.message || 'A client-side issue occurred while loading this view.'}
          </p>
          {error?.digest && (
            <div className="text-[10px] font-mono text-slate-500 bg-[#080E1C] px-2 py-1 rounded inline-block">
              Code: {error.digest}
            </div>
          )}
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/30"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-[#18233C] hover:bg-[#202E4E] text-slate-200 border border-[#1E293B] text-xs font-semibold rounded-lg flex items-center gap-2 transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Dashboard Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
