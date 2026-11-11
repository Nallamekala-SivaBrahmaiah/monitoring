'use client';

import React, { useState } from 'react';
import {
  GitBranch,
  GitCommit,
  GitFork,
  RefreshCw,
  Folder,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Layers,
  ArrowRightLeft,
  Download,
  Info,
  FileText,
  X,
} from 'lucide-react';
import { INginxServerData } from '@/models/NginxServer';
import { GitRepoInfo } from '@/lib/nginx/nginxEngine';

interface NginxGitTabProps {
  activeServer: INginxServerData | null;
  repos: GitRepoInfo[];
  onRefresh: () => void;
  loading?: boolean;
}

export function NginxGitTab({
  activeServer,
  repos,
  onRefresh,
  loading,
}: NginxGitTabProps) {
  // Action Modals State
  const [activeActionModal, setActiveActionModal] = useState<{
    type: 'checkout' | 'status' | 'log';
    repo: GitRepoInfo;
  } | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionOutput, setActionOutput] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleExecuteGit = async (
    repo: GitRepoInfo,
    action: 'checkout' | 'fetch' | 'status' | 'log',
    param?: string
  ) => {
    if (!activeServer) return;
    setActionLoading(true);
    setActionOutput(null);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/git`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoPath: repo.path,
          action,
          param,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionOutput(data.output || 'Operation completed successfully.');
        if (action === 'fetch' || action === 'checkout') {
          showToast(`Git ${action} executed successfully on ${repo.name}`);
          onRefresh();
        }
      } else {
        setActionOutput(data.output || data.error || `Git ${action} failed.`);
      }
    } catch (err: any) {
      setActionOutput(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (!activeServer) {
    return (
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-12 text-center text-slate-400">
        Please select a server to discover Git repositories.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-purple-950 border border-purple-700 text-purple-200 text-xs font-semibold shadow-xl animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-xl shadow-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">GitHub &amp; Git Repositories</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Discovered Git repositories in <code className="text-purple-300">/var/www</code>, <code className="text-purple-300">/opt</code>, <code className="text-purple-300">/home</code>, and <code className="text-purple-300">/srv</code> on <strong className="text-slate-200">{activeServer.name}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          <span>Scan Git Repos</span>
        </button>
      </div>

      {/* Repositories List */}
      {repos.length === 0 ? (
        <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-16 text-center text-slate-400 space-y-2">
          <GitBranch className="w-12 h-12 mx-auto text-slate-600 opacity-60" />
          <h4 className="text-base font-bold text-white">No Git Repositories Discovered</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No <code className="text-slate-300">.git</code> repositories found in application directories on this server. Cloned repositories will automatically be detected and listed here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {repos.map((repo, i) => {
            const providerName = repo.provider || 'GitHub';
            return (
              <div
                key={i}
                className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-5 shadow-lg shadow-black/20 space-y-4 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white">{repo.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        {providerName}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 truncate block max-w-md mt-0.5">
                      {repo.path}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      repo.isClean
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {repo.isClean ? 'CLEAN TREE' : 'MODIFIED'}
                  </span>
                </div>

                {/* Remote URL & Current Branch */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#0B1120] p-3 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Current Branch</span>
                    <div className="flex items-center gap-1.5 font-mono text-purple-400 font-bold pt-0.5">
                      <GitBranch className="w-3.5 h-3.5" />
                      <span>{repo.currentBranch}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Git Remote URL</span>
                    <span className="font-mono text-slate-300 text-[11px] truncate block pt-0.5" title={repo.remoteUrl}>
                      {repo.remoteUrl || 'No remote configured'}
                    </span>
                  </div>
                </div>

                {/* Latest Commit */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Latest Commit</span>
                  <div className="p-3 rounded-xl bg-[#090E1A] border border-slate-800/80 font-mono space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-blue-400 font-bold">{repo.latestCommit?.hash || 'HEAD'}</span>
                      <span className="text-slate-500">{repo.latestCommit?.relativeDate}</span>
                    </div>
                    <p className="text-slate-300 text-xs truncate">
                      {repo.latestCommit?.message || 'No commits recorded'}
                    </p>
                    <span className="text-[10px] text-slate-500 block">
                      Author: {repo.latestCommit?.author || 'Git'}
                    </span>
                  </div>
                </div>

                {/* Local Branches List */}
                {repo.localBranches && repo.localBranches.length > 0 && (
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Local Branches</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {repo.localBranches.map((br, bIdx) => (
                        <button
                          key={bIdx}
                          type="button"
                          onClick={() => {
                            setSelectedBranch(br);
                            setActiveActionModal({ type: 'checkout', repo });
                          }}
                          className={`font-mono text-[10px] px-2 py-0.5 rounded border transition cursor-pointer ${
                            br === repo.currentBranch
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
                          }`}
                          title={`Switch to branch ${br}`}
                        >
                          {br}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Repository Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#1E293B] flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBranch(repo.localBranches?.[0] || 'main');
                      setActiveActionModal({ type: 'checkout', repo });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition cursor-pointer shadow-sm"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Switch Branch</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExecuteGit(repo, 'fetch')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0B1120] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] transition cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-blue-400" />
                    <span>Fetch Remotes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionModal({ type: 'status', repo });
                      handleExecuteGit(repo, 'status');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0B1120] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] transition cursor-pointer"
                  >
                    <Info className="w-3 h-3 text-emerald-400" />
                    <span>Working Tree</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionModal({ type: 'log', repo });
                      handleExecuteGit(repo, 'log');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0B1120] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] transition cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-amber-400" />
                    <span>Recent Commits</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action / Detail Modal */}
      {activeActionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white capitalize">
                  Git {activeActionModal.type}: {activeActionModal.repo.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveActionModal(null);
                  setActionOutput(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Checkout Confirmation Form */}
            {activeActionModal.type === 'checkout' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-300">
                  Select a branch to switch to on server <strong className="text-white">{activeServer.name}</strong> ({activeActionModal.repo.path}):
                </p>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase">Target Branch</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B1120] border border-[#1E293B] rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  >
                    {(activeActionModal.repo.localBranches || []).map((br, idx) => (
                      <option key={idx} value={br}>
                        {br} {br === activeActionModal.repo.currentBranch ? '(current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveActionModal(null)}
                    className="px-3.5 py-1.5 text-xs rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading || !selectedBranch}
                    onClick={() => handleExecuteGit(activeActionModal.repo, 'checkout', selectedBranch)}
                    className="px-4 py-1.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md disabled:opacity-50"
                  >
                    {actionLoading ? 'Switching...' : `Confirm Checkout "${selectedBranch}"`}
                  </button>
                </div>
              </div>
            )}

            {/* Output Display */}
            {actionLoading ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto" />
                <span>Executing Git command on {activeServer.name}...</span>
              </div>
            ) : actionOutput ? (
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500">Command Output</span>
                <pre className="p-4 bg-[#090E1A] border border-[#1E293B] rounded-xl text-xs font-mono text-slate-200 overflow-x-auto max-h-80 whitespace-pre-wrap">
                  {actionOutput}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
