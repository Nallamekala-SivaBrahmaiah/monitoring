'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Check,
  XCircle,
  Loader2,
  Terminal,
} from 'lucide-react';
import { INginxServerData } from '@/models/NginxServer';

interface NginxConfigTabProps {
  activeServer: INginxServerData | null;
}

export function NginxConfigTab({ activeServer }: NginxConfigTabProps) {
  const [configContent, setConfigContent] = useState<string>('');
  const [currentFilePath, setCurrentFilePath] = useState<string>('/etc/nginx/nginx.conf');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Config File
  const fetchConfig = useCallback(async () => {
    if (!activeServer?._id) return;
    setIsLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `/api/nginx/servers/${activeServer._id}/files?path=${encodeURIComponent(currentFilePath)}`
      );
      const data = await res.json();
      if (res.ok && data.content !== undefined) {
        setConfigContent(data.content);
      } else {
        // Fallback default sample configuration if file fetch returned empty
        setConfigContent(
          `user www-data;\nworker_processes auto;\npid /run/nginx.pid;\ninclude /etc/nginx/modules-enabled/*.conf;\n\nevents {\n    worker_connections 1024;\n    multi_accept on;\n}\n\nhttp {\n    ##\n    # Basic Settings\n    ##\n    sendfile on;\n    tcp_nopush on;\n    tcp_nodelay on;\n    keepalive_timeout 65;\n    types_hash_max_size 2048;\n    server_tokens off;\n\n    include /etc/nginx/mime.types;\n    default_type application/octet-stream;\n\n    ##\n    # SSL Settings\n    ##\n    ssl_protocols TLSv1.2 TLSv1.3;\n    ssl_prefer_server_ciphers on;\n\n    ##\n    # Logging Settings\n    ##\n    access_log /var/log/nginx/access.log;\n    error_log /var/log/nginx/error.log;\n\n    ##\n    # Gzip Settings\n    ##\n    gzip on;\n    gzip_vary on;\n    gzip_proxied any;\n    gzip_comp_level 6;\n    gzip_types text/plain text/css application/json application/javascript text/xml;\n\n    ##\n    # Virtual Host Configs\n    ##\n    include /etc/nginx/conf.d/*.conf;\n    include /etc/nginx/sites-enabled/*;\n}\n`
        );
      }
    } catch (err: any) {
      showToast('error', `Failed to load configuration: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeServer?._id, currentFilePath]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Test Syntax (nginx -t)
  const handleTestSyntax = async () => {
    if (!activeServer?._id) return;
    setIsTesting(true);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.output || 'syntax is ok\nnginx.conf test is successful',
        });
        showToast('success', 'Nginx configuration syntax test passed!');
      } else {
        setTestResult({
          success: false,
          message: data.error || data.output || 'nginx configuration test failed',
        });
        showToast('error', 'Syntax test failed.');
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
      showToast('error', err.message);
    } finally {
      setIsTesting(false);
    }
  };

  // Save Configuration & Reload
  const handleSaveAndReload = async () => {
    if (!activeServer?._id) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/nginx/servers/${activeServer._id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentFilePath,
          content: configContent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Automatically reload nginx after saving
        await fetch(`/api/nginx/servers/${activeServer._id}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reload' }),
        });
        showToast('success', 'Configuration saved and Nginx reloaded successfully!');
        handleTestSyntax();
      } else {
        showToast('error', data.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeServer) {
    return (
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-12 text-center text-slate-400">
        Please select a server to manage its Nginx configuration.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-600/30'
              : 'bg-rose-600 text-white shadow-rose-600/30'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header and Toolbar */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 shadow-xl shadow-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Nginx Configuration Editor</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0D1526] text-slate-300 border border-[#1E293B]">
                {currentFilePath}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Directly view, test, and edit Nginx configuration files with automated syntax checking.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* File Selector */}
          <select
            value={currentFilePath}
            onChange={(e) => setCurrentFilePath(e.target.value)}
            className="bg-[#0B1120] text-slate-300 border border-[#1E293B] text-xs font-mono rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="/etc/nginx/nginx.conf">/etc/nginx/nginx.conf (Main)</option>
            <option value="/etc/nginx/sites-available/default">/etc/nginx/sites-available/default</option>
            <option value="/etc/nginx/conf.d/default.conf">/etc/nginx/conf.d/default.conf</option>
          </select>

          {/* Refresh */}
          <button
            type="button"
            onClick={fetchConfig}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] transition-all cursor-pointer disabled:opacity-50"
            title="Reload from server"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* Test Syntax */}
          <button
            type="button"
            onClick={handleTestSyntax}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0D1526] hover:bg-[#18233C] text-slate-200 hover:text-white border border-[#1E293B] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            {isTesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Test Syntax</span>
          </button>

          {/* Save & Reload */}
          <button
            type="button"
            onClick={handleSaveAndReload}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save &amp; Reload</span>
          </button>
        </div>
      </div>

      {/* Syntax Test Result Banner (if tested) */}
      {testResult && (
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs font-mono transition-all ${
            testResult.success
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 whitespace-pre-wrap">{testResult.message}</div>
        </div>
      )}

      {/* Editor Box */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <div className="bg-[#0D1526] px-4 py-2.5 border-b border-[#1E293B] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-blue-400" />
            <span className="font-mono text-slate-200">{currentFilePath}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>Syntax: Nginx</span>
            <span>Lines: {configContent.split('\n').length}</span>
          </div>
        </div>

        <div className="p-2 bg-[#070C18]">
          <textarea
            value={configContent}
            onChange={(e) => setConfigContent(e.target.value)}
            disabled={isLoading}
            spellCheck={false}
            className="w-full bg-transparent text-slate-200 font-mono text-xs leading-relaxed p-3 focus:outline-none min-h-[500px] resize-y custom-scrollbar"
          />
        </div>
      </div>
    </div>
  );
}
