'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Copy,
  Check,
  AlertTriangle,
  Server,
  Cloud,
  Layers,
  Terminal,
  ShieldAlert,
  Cpu,
  Activity,
  Bot,
  User,
  ExternalLink,
  ChevronRight,
  Flame,
  Play,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useMonitoring } from '@/context/MonitoringContext';

export interface ActionProposalData {
  title: string;
  tool: string;
  problem: string;
  root_cause: string;
  fix_command: string;
  verify_command: string;
  rollback_command: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  model?: string;
  isError?: boolean;
  actionProposal?: ActionProposalData | null;
  logId?: string | null;
  actionStatus?: 'pending' | 'executing' | 'success' | 'failed' | 'rolled_back' | 'rejected';
  actionOutput?: string;
  verifyOutput?: string;
  rollbackOutput?: string;
}

export interface GeminiDevOpsDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  targetServer?: { id?: string; name?: string; host?: string; provider?: string } | null;
}

const QUICK_PROMPT_CHIPS = [
  { label: 'Diagnose Selected Server', prompt: 'Run a complete health diagnosis on this server. Inspect CPU, memory pressure, running Docker containers, failed systemd units, and Nginx reverse proxy.' },
  { label: 'Analyze Active Alerts', prompt: 'Analyze all active infrastructure alerts on my platform. Detail root causes, safe remediation commands, and verification steps.' },
  { label: 'Check Nginx & SSL Status', prompt: 'Check Nginx configuration syntax, active HTTP/HTTPS connections, and SSL certificate validity on this host.' },
  { label: 'Docker Container Recovery', prompt: 'Inspect all stopped or crashlooping Docker containers, review recent stderr logs, and propose a safe restart plan.' },
  { label: 'Kubernetes Pod Diagnostics', prompt: 'Check kubectl get pods and cluster events. Identify pending pods, OOMKilled containers, or CrashLoopBackOff states.' },
  { label: 'AWS vs Azure Fleet Health', prompt: 'Review my multi-cloud fleet across AWS and Azure. Provide architectural optimization recommendations for high availability.' },
];

export function GeminiDevOpsDrawer({ isOpen, onClose, targetServer }: GeminiDevOpsDrawerProps) {
  const {
    cloudProvider,
    filteredEC2Instances,
    filteredAzureVMs,
    filteredAlerts,
    overviewMetrics,
    isGeminiDrawerOpen,
    closeGeminiDrawer,
    geminiTargetServer,
  } = useMonitoring();

  // Support both explicit props and global context triggers
  const effectiveIsOpen = isOpen !== undefined ? isOpen : isGeminiDrawerOpen;
  const effectiveOnClose = onClose || closeGeminiDrawer;
  const effectiveServer = targetServer || geminiTargetServer;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      text: `Hello! I am your **Gemini AI DevOps Copilot & Auto-Remediation Engine** powered by Google's official Gemini Gen AI engine.\n\nI can inspect live servers over SSH, diagnose Docker/Kubernetes/Nginx/CI-CD failures, propose safe fixes, and execute verified remediations with automatic rollback.\n\nHow can I help optimize or troubleshoot your infrastructure today?`,
      timestamp: 'Just now',
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [activeAlertsCount, setActiveAlertsCount] = useState<number>(0);
  const [mounted, setMounted] = useState<boolean>(false);

  // Dedicated server selection for targeted diagnosis
  const [selectedServer, setSelectedServer] = useState<{ id?: string; name?: string; host?: string; provider?: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync selectedServer when effectiveServer changes
  useEffect(() => {
    if (effectiveServer) {
      setSelectedServer(effectiveServer);
    }
  }, [effectiveServer]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Compute live active alert count
  useEffect(() => {
    const count = filteredAlerts.filter((a) => a.status === 'active').length;
    setActiveAlertsCount(count);
  }, [filteredAlerts]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (effectiveIsOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, effectiveIsOpen]);

  // Focus input on open
  useEffect(() => {
    if (effectiveIsOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [effectiveIsOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && effectiveIsOpen) {
        effectiveOnClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveIsOpen, effectiveOnClose]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isLoading) return;

    setInputPrompt('');

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: prompt,
      timestamp: 'Just now',
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const runningEC2 = filteredEC2Instances.filter((i) => (i.status || '').toLowerCase() === 'running').length;
      const runningAzure = filteredAzureVMs.filter((v) => (v.powerState || '').toLowerCase().includes('running')).length;

      const topRecentAlerts = filteredAlerts.slice(0, 5).map((a) => ({
        title: a.title || a.message || 'Alert',
        severity: a.severity || 'high',
        status: a.status || 'active',
        source: a.resourceType || a.provider || 'cloud',
      }));

      const contextPayload = {
        cloudFilter: cloudProvider,
        activeAlertsCount,
        recentAlerts: topRecentAlerts,
        ec2Summary: {
          total: filteredEC2Instances.length,
          running: runningEC2,
          stopped: filteredEC2Instances.length - runningEC2,
        },
        azureVMSummary: {
          total: filteredAzureVMs.length,
          running: runningAzure,
          stopped: filteredAzureVMs.length - runningAzure,
        },
        timestamp: new Date().toISOString(),
      };

      const historyPayload = newMessages
        .filter((m) => m.id !== 'welcome-msg' && !m.isError)
        .slice(-8)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      // Call conversational endpoint with live SSH probe
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          server: selectedServer || undefined,
          history: historyPayload,
          context: contextPayload,
        }),
      });

      const data = await res.json();

      if (data.success && data.text) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            text: data.text,
            model: data.model || 'gemini-4-hydrogen',
            timestamp: 'Just now',
            actionProposal: data.actionProposal || null,
            logId: data.logId || null,
            actionStatus: data.actionProposal ? 'pending' : undefined,
          },
        ]);
      } else {
        const errorDetail = data.error || 'Failed to get response from Gemini API.';
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            text: `⚠️ **Gemini API Notice**:\n\n${errorDetail}\n\n*If you are running the platform, please ensure \`GEMINI_API_KEY\` is set in \`.env.local\` on the server.*`,
            timestamp: 'Just now',
            isError: true,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: `⚠️ **Connection Error**: Unable to reach server-side Gemini Copilot route: ${err?.message || 'Network error'}.`,
          timestamp: 'Just now',
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles user decision on Action Approval Card: Approve, Reject, or Rollback
   */
  const handleExecuteAction = async (
    messageId: string,
    logId: string,
    action: 'approve' | 'rollback' | 'reject',
    customCmd?: string
  ) => {
    // Set executing state in UI
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, actionStatus: action === 'approve' ? 'executing' : m.actionStatus }
          : m
      )
    );

    try {
      const res = await fetch('/api/gemini/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId,
          action,
          customCommand: customCmd,
        }),
      });

      const data = await res.json();

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;

          if (action === 'reject') {
            return {
              ...m,
              actionStatus: 'rejected',
              actionOutput: 'User rejected the proposed remediation. No commands were executed.',
            };
          }

          if (action === 'rollback') {
            return {
              ...m,
              actionStatus: 'rolled_back',
              rollbackOutput: data.output || 'Manual rollback executed.',
            };
          }

          // Approve outcome
          if (data.executionStatus === 'success') {
            return {
              ...m,
              actionStatus: 'success',
              actionOutput: data.fixOutput,
              verifyOutput: data.verifyOutput,
            };
          } else if (data.rollbackTriggered) {
            return {
              ...m,
              actionStatus: 'rolled_back',
              actionOutput: data.fixOutput,
              verifyOutput: data.verifyOutput,
              rollbackOutput: data.rollbackOutput,
            };
          } else {
            return {
              ...m,
              actionStatus: 'failed',
              actionOutput: data.fixOutput || data.error,
            };
          }
        })
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, actionStatus: 'failed', actionOutput: `Execution failed: ${err.message}` }
            : m
        )
      );
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: `Chat history cleared. Live infrastructure telemetry is active. How can I assist you with AWS, Azure, Kubernetes, or server troubleshooting?`,
        timestamp: 'Just now',
      },
    ]);
  };

  if (!mounted || !effectiveIsOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={effectiveOnClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer */}
      <div
        ref={drawerRef}
        className="relative w-full max-w-2xl bg-[#080E1C] border-l-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/30 text-slate-100 flex flex-col h-full z-10 animate-in slide-in-from-right duration-300 ease-out"
      >
        {/* Holographic Glowing Header Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-cyan-400 to-indigo-500 animate-pulse pointer-events-none" />

        {/* Drawer Header */}
        <div className="px-5 py-4 bg-[#0B1224] border-b border-[#1E293B] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600/30 via-indigo-600/20 to-cyan-500/30 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base tracking-tight flex items-center gap-1.5">
                  <span>Gemini AI DevOps Copilot</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/40 tracking-wider">
                  Auto-Remediation Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                <span>Safe SSH Execution • Automatic Rollback</span>
                <span className="inline-block w-1 h-1 rounded-full bg-emerald-400"></span>
                <span className="text-emerald-400 font-semibold">Active</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearChat}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition border border-slate-700/60 cursor-pointer"
              title="Clear Conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={effectiveOnClose}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition border border-slate-700/60 cursor-pointer"
              title="Close Drawer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selected Server Diagnostic Banner */}
        {selectedServer ? (
          <div className="px-5 py-2.5 bg-gradient-to-r from-[#0C152B] via-[#091122] to-[#0C152B] border-b border-cyan-500/30 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-slate-400 font-medium">Diagnosing Server:</span>
                <span className="font-extrabold text-cyan-300 font-mono">
                  {selectedServer.name || selectedServer.host}
                </span>
                {selectedServer.host && (
                  <span className="text-slate-500 font-mono text-[11px]">
                    ({selectedServer.host})
                  </span>
                )}
                {selectedServer.provider && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                    {selectedServer.provider}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedServer(null)}
              className="text-[10px] text-slate-400 hover:text-cyan-300 underline font-semibold shrink-0 cursor-pointer"
            >
              Clear Server
            </button>
          </div>
        ) : (
          <div className="px-5 py-2 bg-[#070D1B] border-b border-[#1E293B]/60 flex items-center justify-between text-xs shrink-0">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Server className="w-3 h-3 text-cyan-400" />
              General Multi-Cloud Scope (Tip: Click any server node in heatmap to focus SSH diagnostics)
            </span>
            <span className="text-[10px] text-slate-400">
              Alerts: <strong className="text-white">{activeAlertsCount}</strong>
            </span>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600/30 via-indigo-600/20 to-cyan-500/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5 shadow-sm">
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                </div>
              )}

              <div
                className={`max-w-[90%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-blue-600/20'
                    : msg.isError
                    ? 'bg-red-950/40 border border-red-500/40 text-red-200 rounded-tl-none'
                    : 'bg-[#0E162B] border border-cyan-500/30 text-slate-200 rounded-tl-none shadow-lg shadow-black/40'
                }`}
              >
                {/* Markdown content */}
                <FormattedMarkdownContent
                  content={msg.text}
                  onCopyCode={(code) => copyToClipboard(code, msg.id)}
                  copiedCodeId={copiedCodeId}
                  messageId={msg.id}
                />

                {/* Interactive Action Approval Card if Gemini proposed a remediation */}
                {msg.actionProposal && msg.logId && (
                  <ActionApprovalCard
                    proposal={msg.actionProposal}
                    logId={msg.logId}
                    messageId={msg.id}
                    status={msg.actionStatus || 'pending'}
                    actionOutput={msg.actionOutput}
                    verifyOutput={msg.verifyOutput}
                    rollbackOutput={msg.rollbackOutput}
                    onExecute={(action, cmd) => handleExecuteAction(msg.id, msg.logId!, action, cmd)}
                    onModifyPrompt={(promptToEdit) => {
                      setInputPrompt(promptToEdit);
                      inputRef.current?.focus();
                    }}
                  />
                )}

                <div
                  className={`mt-2.5 pt-2 border-t text-[10px] flex items-center justify-between ${
                    msg.role === 'user'
                      ? 'border-blue-400/30 text-blue-200'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  <span>{msg.role === 'user' ? 'You' : msg.model || 'Gemini AI'}</span>
                  <span>{msg.timestamp}</span>
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-blue-600/40 border border-blue-400/40 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Loading Animation */}
          {isLoading && (
            <div className="flex items-start gap-3 justify-start animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600/30 to-cyan-500/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
                <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
              </div>
              <div className="bg-[#0E162B] border border-cyan-500/30 text-slate-300 rounded-2xl rounded-tl-none p-4 text-xs shadow-lg max-w-[85%]">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold mb-1">
                  <span>Gemini Copilot is inspecting live server telemetry...</span>
                </div>
                <div className="flex items-center gap-1.5 py-1">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse delay-100"></div>
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse delay-200"></div>
                  <span className="text-[11px] text-slate-400 ml-2">Running non-destructive SSH probes on Docker, K8s, Nginx, and system services...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompt Chips */}
        <div className="px-5 py-2.5 bg-[#070D1B] border-t border-[#1E293B]/70 shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
            <Flame className="w-3 h-3 text-cyan-400" />
            Quick Copilot Prompts:
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_PROMPT_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleSendMessage(chip.prompt)}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-[#0E172E] hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-200 border border-slate-700/60 hover:border-cyan-500/50 text-[11px] font-medium transition cursor-pointer shrink-0 disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Box Area */}
        <div className="p-4 bg-[#0B1224] border-t border-[#1E293B] shrink-0">
          <div className="relative rounded-xl bg-[#070B16] border border-cyan-500/40 focus-within:border-cyan-400 focus-within:shadow-lg focus-within:shadow-cyan-500/20 transition-all">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                selectedServer
                  ? `Ask Gemini to diagnose "${selectedServer.name || selectedServer.host}" (e.g. check failing pods, restart nginx)...`
                  : 'Ask Gemini about AWS, Azure, Docker logs, K8s pods, active alerts...'
              }
              className="w-full bg-transparent px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 resize-none focus:outline-none"
            />

            <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-800/80 bg-[#060912]">
              <span className="text-[10px] text-slate-400 font-mono">
                Press <strong>Enter</strong> to send • <strong>Shift+Enter</strong> for newline
              </span>

              <button
                type="button"
                disabled={!inputPrompt.trim() || isLoading}
                onClick={() => handleSendMessage()}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-xs transition shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Interactive Action Approval Card Component
 */
function ActionApprovalCard({
  proposal,
  logId,
  messageId,
  status,
  actionOutput,
  verifyOutput,
  rollbackOutput,
  onExecute,
  onModifyPrompt,
}: {
  proposal: ActionProposalData;
  logId: string;
  messageId: string;
  status: 'pending' | 'executing' | 'success' | 'failed' | 'rolled_back' | 'rejected';
  actionOutput?: string;
  verifyOutput?: string;
  rollbackOutput?: string;
  onExecute: (action: 'approve' | 'rollback' | 'reject', customCmd?: string) => void;
  onModifyPrompt: (promptToEdit: string) => void;
}) {
  const [showTerminalLogs, setShowTerminalLogs] = useState(false);

  // Badge styling according to tool
  const getToolBadgeColor = (tool: string) => {
    const t = tool.toLowerCase();
    if (t.includes('docker')) return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    if (t.includes('k8s') || t.includes('kube')) return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
    if (t.includes('nginx')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    if (t.includes('jenkins') || t.includes('maven')) return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
  };

  return (
    <div className="mt-3 rounded-xl bg-[#060A16] border-2 border-cyan-500/40 overflow-hidden shadow-2xl">
      {/* Card Header */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-purple-950/40 via-cyan-950/40 to-blue-950/40 border-b border-cyan-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span className="font-extrabold text-white text-xs tracking-tight">
            Remediation Action Proposal
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getToolBadgeColor(proposal.tool)}`}>
          {proposal.tool}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-3.5 space-y-2.5 text-xs">
        <div>
          <h4 className="font-bold text-cyan-300 text-xs">{proposal.title}</h4>
          <p className="text-slate-400 text-[11px] mt-0.5">{proposal.problem}</p>
        </div>

        {proposal.root_cause && (
          <div className="p-2 rounded bg-[#091024] border border-slate-800 text-[11px] text-slate-300">
            <span className="text-cyan-400 font-bold block text-[10px] uppercase tracking-wider mb-0.5">
              Root Cause:
            </span>
            <span>{proposal.root_cause}</span>
          </div>
        )}

        {/* Proposed Fix Command */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="text-emerald-400 font-bold uppercase">Proposed Fix Command:</span>
            <span>Requires Permission</span>
          </div>
          <div className="p-2.5 rounded bg-[#03060E] border border-emerald-500/40 font-mono text-emerald-300 text-[11px] overflow-x-auto">
            <code>{proposal.fix_command}</code>
          </div>
        </div>

        {/* Proposed Verify & Rollback Commands */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="p-2 rounded bg-[#080D1C] border border-slate-800">
            <span className="text-cyan-400 block font-bold mb-1">Verify Command:</span>
            <code className="text-slate-300 text-[10px] block truncate">{proposal.verify_command}</code>
          </div>
          <div className="p-2 rounded bg-[#080D1C] border border-slate-800">
            <span className="text-amber-400 block font-bold mb-1">Auto-Rollback Command:</span>
            <code className="text-slate-300 text-[10px] block truncate">{proposal.rollback_command}</code>
          </div>
        </div>

        {/* Status Indicators */}
        {status === 'executing' && (
          <div className="p-2 rounded-lg bg-blue-950/40 border border-blue-500/40 text-blue-300 flex items-center gap-2 text-[11px]">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Connecting via SSH, executing fix command, and verifying...</span>
          </div>
        )}

        {status === 'success' && (
          <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">Fix executed & verified successfully!</span>
            </div>
            <button
              type="button"
              onClick={() => onExecute('rollback')}
              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-semibold cursor-pointer"
            >
              Rollback Now
            </button>
          </div>
        )}

        {status === 'rolled_back' && (
          <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 space-y-1 text-[11px]">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span className="font-bold">Verification failed or rollback invoked. Server safely restored!</span>
            </div>
          </div>
        )}

        {status === 'rejected' && (
          <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-400 flex items-center gap-2 text-[11px]">
            <XCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Action rejected by user. Server state left unmodified.</span>
          </div>
        )}

        {/* Action Buttons (Visible when pending) */}
        {status === 'pending' && (
          <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
            {/* Approve & Run Fix */}
            <button
              type="button"
              onClick={() => onExecute('approve')}
              className="flex-1 py-1.5 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Approve & Run Fix</span>
            </button>

            {/* Modify / Ask Follow-up */}
            <button
              type="button"
              onClick={() =>
                onModifyPrompt(
                  `Regarding the proposed fix for "${proposal.title}": can we adjust the command "${proposal.fix_command}" to...`
                )
              }
              className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition border border-slate-700 cursor-pointer"
              title="Ask Gemini to adjust or explain the command"
            >
              Modify
            </button>

            {/* Reject */}
            <button
              type="button"
              onClick={() => onExecute('reject')}
              className="py-1.5 px-2.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-500/40 font-semibold text-xs transition cursor-pointer"
              title="Reject this remediation"
            >
              Reject
            </button>
          </div>
        )}

        {/* Terminal Logs Toggle */}
        {(actionOutput || verifyOutput || rollbackOutput) && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowTerminalLogs(!showTerminalLogs)}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
            >
              <Terminal className="w-3 h-3" />
              <span>{showTerminalLogs ? 'Hide SSH Terminal Output' : 'View Live SSH Terminal Output'}</span>
            </button>

            {showTerminalLogs && (
              <div className="mt-2 p-2.5 rounded-lg bg-black border border-slate-800 font-mono text-[10px] text-slate-300 max-h-48 overflow-y-auto space-y-2 leading-relaxed">
                {actionOutput && (
                  <div>
                    <span className="text-emerald-400 block font-bold">--- Fix Execution Output ---</span>
                    <pre className="whitespace-pre-wrap">{actionOutput}</pre>
                  </div>
                )}
                {verifyOutput && (
                  <div>
                    <span className="text-cyan-400 block font-bold">--- Verify Output ---</span>
                    <pre className="whitespace-pre-wrap">{verifyOutput}</pre>
                  </div>
                )}
                {rollbackOutput && (
                  <div>
                    <span className="text-amber-400 block font-bold">--- Rollback Output ---</span>
                    <pre className="whitespace-pre-wrap">{rollbackOutput}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Custom High-Performance Markdown Formatter for Code Blocks & Bullet Lists
 */
function FormattedMarkdownContent({
  content,
  onCopyCode,
  copiedCodeId,
  messageId,
}: {
  content: string;
  onCopyCode: (code: string) => void;
  copiedCodeId: string | null;
  messageId: string;
}) {
  // Strip action proposal JSON block from display text so user sees clean conversational response
  const cleanedContent = content.replace(/```(?:json:action_proposal|json)\s*[\s\S]*?```/g, '').trim();

  // Split message by code block fences (```)
  const parts = cleanedContent.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-xs leading-relaxed">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineBreak = part.indexOf('\n');
          let lang = 'bash';
          let code = '';

          if (firstLineBreak !== -1) {
            lang = part.substring(3, firstLineBreak).trim() || 'bash';
            code = part.substring(firstLineBreak + 1, part.length - 3).trim();
          } else {
            code = part.substring(3, part.length - 3).trim();
          }

          const blockId = `${messageId}-code-${index}`;
          const isCopied = copiedCodeId === blockId;

          return (
            <div
              key={index}
              className="my-2 rounded-xl bg-[#050811] border border-cyan-500/30 overflow-hidden shadow-md"
            >
              <div className="px-3 py-1.5 bg-[#090E1F] border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono text-cyan-400 uppercase font-bold tracking-wider text-[10px]">
                  {lang}
                </span>
                <button
                  type="button"
                  onClick={() => onCopyCode(code)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-[10px]"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 font-mono text-[11px] text-cyan-200 overflow-x-auto leading-normal scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Standard text
        return (
          <div key={index} className="space-y-1">
            {part.split('\n').map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lIdx} className="h-1" />;

              if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
                const bulletText = trimmed.replace(/^[-•*]\s*/, '');
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-1">
                    <span className="text-cyan-400 font-bold leading-tight mt-0.5">•</span>
                    <span className="flex-1">
                      <InlineFormat text={bulletText} />
                    </span>
                  </div>
                );
              }

              if (trimmed.startsWith('### ')) {
                return (
                  <h4 key={lIdx} className="font-bold text-white text-xs pt-1 text-cyan-300">
                    <InlineFormat text={trimmed.replace(/^###\s*/, '')} />
                  </h4>
                );
              }
              if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
                return (
                  <h3 key={lIdx} className="font-extrabold text-white text-sm pt-1.5 text-cyan-200">
                    <InlineFormat text={trimmed.replace(/^#+\s*/, '')} />
                  </h3>
                );
              }

              return (
                <p key={lIdx} className="leading-relaxed">
                  <InlineFormat text={line} />
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function InlineFormat({ text }: { text: string }) {
  const tokens = text.split(/(\*\*.*?\*\*|`.*?`)/g);

  return (
    <>
      {tokens.map((token, i) => {
        if (token.startsWith('**') && token.endsWith('**')) {
          return (
            <strong key={i} className="text-white font-semibold">
              {token.slice(2, -2)}
            </strong>
          );
        }
        if (token.startsWith('`') && token.endsWith('`')) {
          return (
            <code
              key={i}
              className="px-1.5 py-0.5 rounded bg-[#070D1B] border border-cyan-500/30 text-cyan-300 font-mono text-[11px]"
            >
              {token.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{token}</span>;
      })}
    </>
  );
}
