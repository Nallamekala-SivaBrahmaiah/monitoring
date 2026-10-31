'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Copy,
  Check,
  RotateCw,
  Terminal,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { ChatMessage } from '@/types/monitoring';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext?: {
    provider?: string;
    region?: string;
    resourceId?: string;
    resourceName?: string;
    resourceType?: string;
    status?: string;
    publicIp?: string;
    metrics?: Record<string, any>;
  };
}

export function AiAssistantDrawer({
  isOpen,
  onClose,
  initialContext,
}: AiAssistantDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with contextual greeting
  useEffect(() => {
    if (isOpen) {
      const greeting: ChatMessage = {
        id: `msg-init-${Date.now()}`,
        role: 'assistant',
        content: initialContext?.resourceName
          ? `Hello! I have loaded the telemetry and configuration for **${initialContext.resourceName}** (${initialContext.region || 'Active Region'} / ${initialContext.provider?.toUpperCase() || 'Cloud'}).
- **Status**: \`${initialContext.status || 'Running'}\`
- **Public IP**: \`${initialContext.publicIp || 'Available'}\`
- **CPU / RAM**: \`${initialContext.metrics?.cpu || 12.4}% CPU / ${initialContext.metrics?.memory || 38.6}% RAM\`

How can I help you troubleshoot this instance today?`
          : `Hello! I am your **Antigravity Multi-Cloud AI Assistant**. I can help you troubleshoot SSH connectivity, analyze CPU/RAM bottlenecks, inspect Docker containers, and optimize cloud costs across AWS and Azure. What would you like to investigate?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        context: initialContext,
        suggestions: initialContext?.resourceName
          ? [
              `Why is ${initialContext.resourceName} SSH connection failing?`,
              `Analyze CPU and memory health for ${initialContext.resourceName}`,
              `How can I reduce the monthly cost of this resource?`,
            ]
          : [
              'Why is my EC2 or Azure VM not connecting?',
              'Why is my Docker container restarting?',
              'Which cloud region has the highest monthly cost?',
              'How to troubleshoot high CPU usage?',
            ],
      };
      setMessages([greeting]);
    }
  }, [isOpen, initialContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          context: initialContext,
        }),
      });

      if (!res.ok) {
        throw new Error(`AI service returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        content: data.message || 'I have analyzed the provided context.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: data.suggestions || [],
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Diagnostic Notice**: Could not complete the real-time AI query (${err.message || 'Network error'}). You can inspect your Azure NSG rules directly using:
\`\`\`bash
az network nsg rule list --resource-group rg01siva --nsg-name default-nsg --output table
\`\`\``,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-0 right-0 z-50 flex flex-col bg-[#0D1526] border-l border-t border-[#1E293B] shadow-2xl transition-all duration-300 ${
        isExpanded
          ? 'w-full md:w-[700px] h-full md:h-[90vh] md:rounded-tl-2xl'
          : 'w-full md:w-[480px] h-[640px] md:rounded-tl-2xl'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1E293B] bg-[#111A2E]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Cloud AI Assistant</h3>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                LIVE
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {initialContext?.resourceName ? `Targeting: ${initialContext.resourceName}` : 'Multi-Cloud Diagnostic Engine'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#18233C] transition-colors"
            title={isExpanded ? 'Restore' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#18233C] transition-colors"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Context Badge if specific resource targeted */}
      {initialContext?.resourceName && (
        <div className="px-4 py-2 bg-[#162238]/60 border-b border-[#1E293B] flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2 font-mono">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-white">{initialContext.resourceName}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{initialContext.region}</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400">{initialContext.status || 'Running'}</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">{initialContext.publicIp || 'Azure VM'}</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((m) => {
          const isAi = m.role === 'assistant';

          return (
            <div key={m.id} className={`flex gap-3 ${isAi ? 'items-start' : 'items-start flex-row-reverse'}`}>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isAi
                    ? 'bg-gradient-to-tr from-blue-600 to-cyan-500 text-white'
                    : 'bg-[#1E293B] text-slate-200 border border-slate-700'
                }`}
              >
                {isAi ? <Bot className="w-4 h-4" /> : <User className="w-3.5 h-3.5" />}
              </div>

              <div className={`space-y-2 max-w-[85%] ${isAi ? '' : 'text-right'}`}>
                <div
                  className={`p-3.5 rounded-xl leading-relaxed whitespace-pre-wrap break-words ${
                    isAi
                      ? 'bg-[#111A2E] border border-[#1E293B] text-slate-200 shadow-sm'
                      : 'bg-blue-600 text-white ml-auto'
                  }`}
                >
                  {/* Formatted markdown renderer */}
                  {renderFormattedMessage(m.content, handleCopyCode, copiedIndex)}
                </div>

                {/* Suggestions chips */}
                {isAi && m.suggestions && m.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {m.suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(s)}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-[#18233C] hover:bg-blue-600 hover:text-white text-slate-300 border border-[#1E293B] transition-colors text-left"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <span className="text-[10px] text-slate-500 block px-1">{m.timestamp}</span>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 bg-[#111A2E] border border-[#1E293B] rounded-xl flex items-center gap-2 text-xs text-slate-400">
              <RotateCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              <span>Analyzing live telemetry & formulating diagnosis...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-[#1E293B] bg-[#111A2E]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={
              initialContext?.resourceName
                ? `Ask about ${initialContext.resourceName} (e.g. why is SSH failing?)...`
                : 'Ask AI about your cloud resources, SSH, CPU, or costs...'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-3.5 py-2 text-xs bg-[#0D1526] border border-[#1E293B] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-colors flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

// Helper to render markdown and code blocks with copy button
function renderFormattedMessage(
  text: string,
  onCopy: (code: string, id: string) => void,
  copiedId: string | null
) {
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.slice(3, -3).trim().split('\n');
      const lang = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
      const code = lang ? lines.slice(1).join('\n') : lines.join('\n');
      const blockId = `code-${index}`;

      return (
        <div key={index} className="my-2 rounded-lg overflow-hidden border border-[#1E293B] bg-[#0A0F1D] font-mono text-[11px]">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#141E34] text-slate-400 text-[10px] border-b border-[#1E293B]">
            <span>{lang || 'bash'}</span>
            <button
              onClick={() => onCopy(code, blockId)}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              {copiedId === blockId ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 overflow-x-auto text-emerald-400 leading-relaxed font-mono">
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    return <span key={index}>{part}</span>;
  });
}
