'use client';

import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useMonitoring } from '@/context/MonitoringContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  model?: string;
  isError?: boolean;
}

interface GeminiDevOpsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_PROMPT_CHIPS = [
  { label: 'Analyze Active Alerts', prompt: 'Analyze all active infrastructure alerts on my platform. Detail the root causes, immediate safe remediation commands, and verification steps.' },
  { label: 'Check Nginx & SSL Status', prompt: 'Provide a complete health check guide and safe bash commands to verify Nginx status, active connections, and SSL/TLS certificate validity.' },
  { label: 'Troubleshoot Unhealthy Nodes', prompt: 'What are the systematic troubleshooting steps and diagnostic commands when an EC2 instance or Azure VM is degraded or not responding to SSH?' },
  { label: 'AWS vs Azure Fleet Health', prompt: 'Review my current multi-cloud fleet across AWS and Azure. Provide architectural optimization recommendations for high availability and cost control.' },
  { label: 'Kubernetes Cluster Diagnostic', prompt: 'Generate standard kubectl commands to diagnose crashlooping pods, node pressure conditions, and pending PVC issues in production.' },
  { label: 'Docker Container Recovery', prompt: 'What commands should I run to inspect exit codes, memory pressure, and restart failed Docker containers without data loss?' },
];

export function GeminiDevOpsDrawer({ isOpen, onClose }: GeminiDevOpsDrawerProps) {
  const {
    cloudProvider,
    filteredEC2Instances,
    filteredAzureVMs,
    filteredAlerts,
    overviewMetrics,
  } = useMonitoring();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      text: `Hello! I am your **Gemini AI DevOps & Multi-Cloud Assistant** powered by Google's official Gemini Gen AI engine.\n\nI have real-time visibility into your multi-cloud environment across **AWS EC2**, **Azure Virtual Machines**, **Active Alerts**, and container infrastructure.\n\nHow can I help optimize, troubleshoot, or audit your infrastructure today? You can select a quick prompt below or type your question.`,
      timestamp: 'Just now',
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [activeAlertsCount, setActiveAlertsCount] = useState<number>(0);

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
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      // Build real live dashboard context to pass to Gemini
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

      // Prepare conversation history
      const historyPayload = newMessages
        .filter((m) => m.id !== 'welcome-msg' && !m.isError)
        .slice(-8)
        .map((m) => ({
          role: m.role,
          text: m.text,
        }));

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
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
          text: `⚠️ **Connection Error**: Unable to reach server-side Gemini API route: ${err?.message || 'Network error'}.`,
          timestamp: 'Just now',
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer */}
      <div
        ref={drawerRef}
        className="relative w-full max-w-2xl bg-[#090F1E] border-l-2 border-cyan-500/40 shadow-2xl shadow-cyan-500/20 text-slate-100 flex flex-col h-full z-10 animate-in slide-in-from-right duration-300 ease-out"
      >
        {/* Holographic glowing line at the top */}
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
                  <span>Gemini AI DevOps Assistant</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/40 tracking-wider">
                  gemini-4-hydrogen
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                <span>Multi-Cloud Telemetry Grounded</span>
                <span className="inline-block w-1 h-1 rounded-full bg-emerald-400"></span>
                <span className="text-emerald-400 font-semibold">Live</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearChat}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition border border-slate-700/60"
              title="Clear Conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition border border-slate-700/60"
              title="Close Drawer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Multi-Cloud Context Ribbon */}
        <div className="px-5 py-2.5 bg-[#070D1B] border-b border-[#1E293B]/60 flex items-center justify-between text-xs overflow-x-auto gap-4 shrink-0 scrollbar-none">
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              Live Context:
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="px-2 py-0.5 rounded bg-[#10192E] border border-cyan-500/30 text-cyan-300">
                AWS EC2: <strong>{filteredEC2Instances.length}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-[#10192E] border border-blue-500/30 text-blue-300">
                Azure VMs: <strong>{filteredAzureVMs.length}</strong>
              </span>
              <span className={`px-2 py-0.5 rounded border ${activeAlertsCount > 0 ? 'bg-red-500/10 border-red-500/40 text-red-300' : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'}`}>
                Alerts: <strong>{activeAlertsCount}</strong>
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 shrink-0">
            Cloud Filter: <strong className="text-white capitalize">{cloudProvider}</strong>
          </span>
        </div>

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
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-blue-600/20'
                    : msg.isError
                    ? 'bg-red-950/40 border border-red-500/40 text-red-200 rounded-tl-none'
                    : 'bg-[#0E162B] border border-cyan-500/30 text-slate-200 rounded-tl-none shadow-lg shadow-black/40'
                }`}
              >
                {/* Render formatted message content */}
                <FormattedMarkdownContent
                  content={msg.text}
                  onCopyCode={(code) => copyToClipboard(code, msg.id)}
                  copiedCodeId={copiedCodeId}
                  messageId={msg.id}
                />

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
                  <span>Gemini AI is analyzing multi-cloud infrastructure...</span>
                </div>
                <div className="flex items-center gap-1.5 py-1">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse delay-100"></div>
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse delay-200"></div>
                  <span className="text-[11px] text-slate-400 ml-2">Grounding response with active server metrics & logs...</span>
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
            Quick DevOps Prompts:
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
              placeholder="Ask Gemini about AWS, Azure, Nginx configs, Docker logs, active alerts..."
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
  // Split message by code block fences (```)
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-xs leading-relaxed">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract language and code
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

        // Standard text with bold, bullet lines, and inline code formatting
        return (
          <div key={index} className="space-y-1">
            {part.split('\n').map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lIdx} className="h-1" />;

              // Bullet points
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

              // Headings
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

/**
 * Formats inline bold (**text**) and inline code (`code`)
 */
function InlineFormat({ text }: { text: string }) {
  // Regex splitting by bold (**...**) and inline code (`...`)
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
