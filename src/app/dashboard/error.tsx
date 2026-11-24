'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Module Error]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />
        <main className="p-4 lg:p-8 flex items-center justify-center min-h-[70vh]">
          <div className="bg-[#0D1526] border border-rose-500/30 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-white tracking-tight">Module Encountered an Error</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {error?.message || 'An error occurred while loading this module.'}
              </p>
              {error?.digest && (
                <div className="text-[10px] font-mono text-slate-500 bg-[#080E1C] px-2 py-1 rounded inline-block">
                  Digest: {error.digest}
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => reset()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-blue-600/30"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Module</span>
              </button>
              <Link
                href="/"
                className="px-4 py-2 bg-[#18233C] hover:bg-[#202E4E] text-slate-200 border border-[#1E293B] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
