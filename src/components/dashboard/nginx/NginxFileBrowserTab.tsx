'use client';

import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileText,
  FileCode,
  ArrowUp,
  RefreshCw,
  Copy,
  Check,
  Shield,
  Clock,
  HardDrive,
  User,
} from 'lucide-react';
import { INginxServerData } from '@/models/NginxServer';

interface NginxFileBrowserTabProps {
  activeServer: INginxServerData | null;
}

export function NginxFileBrowserTab({ activeServer }: NginxFileBrowserTabProps) {
  const [currentPath, setCurrentPath] = useState('/var/www');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileLoading, setFileLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchDir = async (dirPath: string) => {
    if (!activeServer) return;
    setLoading(true);
    setSelectedFile(null);
    try {
      const res = await fetch(
        `/api/nginx/servers/${activeServer._id}/files?path=${encodeURIComponent(dirPath)}`
      );
      const data = await res.json();
      if (res.ok && data.items) {
        setItems(data.items);
        setCurrentPath(data.path);
      }
    } catch (err) {
      console.error('Failed to browse files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFile = async (item: any) => {
    if (!activeServer) return;
    setSelectedFile(item);
    setFileLoading(true);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: item.fullPath }),
      });
      const data = await res.json();
      if (res.ok && data.content !== undefined) {
        setFileContent(data.content);
      } else {
        setFileContent(data.error || 'Failed to read file.');
      }
    } catch (err: any) {
      setFileContent(err.message);
    } finally {
      setFileLoading(false);
    }
  };

  useEffect(() => {
    if (activeServer) {
      fetchDir('/var/www');
    }
  }, [activeServer?._id]);

  const goUp = () => {
    if (currentPath === '/' || !currentPath) return;
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length <= 1) {
      fetchDir('/');
    } else {
      parts.pop();
      fetchDir('/' + parts.join('/'));
    }
  };

  if (!activeServer) {
    return (
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-12 text-center text-slate-400">
        Please select a server to browse application directories and files.
      </div>
    );
  }

  const quickJumpPaths = ['/', '/home', '/var/www', '/opt', '/srv', '/etc/nginx', '/var/log/nginx'];

  return (
    <div className="space-y-4">
      {/* Path Breadcrumbs Bar */}
      <div className="bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto flex-1 text-xs">
          <button
            type="button"
            onClick={goUp}
            disabled={currentPath === '/'}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 border border-slate-700 transition cursor-pointer"
            title="Go up one folder"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          <span className="text-slate-500 font-bold">Path:</span>
          <span className="font-mono text-emerald-400 font-semibold bg-[#0B1120] px-3 py-1 rounded-xl border border-slate-800">
            {currentPath}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Quick Jump Folders */}
          {quickJumpPaths.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => fetchDir(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition cursor-pointer ${
                currentPath === p || (p !== '/' && currentPath.startsWith(p))
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 font-bold'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            onClick={() => fetchDir(currentPath)}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Refresh directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Directory Listing */}
        <div className={`${selectedFile ? 'lg:col-span-5' : 'lg:col-span-12'} bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl shadow-xl shadow-black/20 overflow-hidden`}>
          <div className="p-3 bg-[#0D1527] border-b border-[#1E293B] text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Files &amp; Directories ({items.length})</span>
            <span className="text-slate-500 font-normal">Safe Directory Discovery via SSH</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[580px] overflow-y-auto">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>Loading directory from {activeServer.name}...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">Directory is empty.</div>
            ) : (
              items.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => (item.isDir ? fetchDir(item.fullPath) : handleOpenFile(item))}
                  className={`px-4 py-2.5 flex items-center justify-between cursor-pointer text-xs hover:bg-[#142038]/70 transition ${
                    selectedFile?.fullPath === item.fullPath ? 'bg-blue-600/15 border-l-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate max-w-xs sm:max-w-md">
                    {item.isDir ? (
                      <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
                    )}
                    <span className={`font-mono truncate ${item.isDir ? 'font-bold text-white' : 'text-slate-300'}`}>
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
                    {item.owner && (
                      <span className="text-[10px] hidden md:inline text-slate-500">{item.owner}</span>
                    )}
                    {!item.isDir && (
                      <span className="text-slate-300">{(item.sizeBytes / 1024).toFixed(1)} KB</span>
                    )}
                    <span className="text-[10px] hidden sm:inline text-slate-500">{item.permissions}</span>
                    {item.modTime && (
                      <span className="text-[10px] hidden lg:inline text-slate-500">{item.modTime}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* File Viewer Panel */}
        {selectedFile && (
          <div className="lg:col-span-7 bg-[#111A2E]/90 border border-[#1E293B] rounded-2xl shadow-xl shadow-black/20 p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="font-mono text-xs font-bold text-white truncate max-w-md">
                  {selectedFile.fullPath}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(fileContent);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="bg-[#070B14] border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 leading-relaxed max-h-[500px] overflow-y-auto whitespace-pre-wrap select-text">
              {fileLoading ? (
                <div className="py-8 text-center text-slate-500">Reading file content via SSH...</div>
              ) : (
                fileContent
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
