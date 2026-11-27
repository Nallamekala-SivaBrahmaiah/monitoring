'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  RotateCcw,
  Copy,
  Check,
  Server,
  Terminal,
  ShieldAlert,
  Bot,
  User,
  Flame,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  Brain,
  Clock,
  ChevronDown,
  Layers,
  Save,
  Download,
  FileDown,
  Mic,
  MicOff,
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

export interface SavedSession {
  id: string;
  title: string;
  model: string;
  serverName?: string;
  messageCount: number;
  messages: Message[];
  updatedAt: string;
}

export interface GeminiDevOpsDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  targetServer?: { id?: string; name?: string; host?: string; provider?: string } | null;
}

const AVAILABLE_MODELS = [
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    shortName: 'Flash 3.5',
    badge: 'Ultra Fast',
    icon: Zap,
    desc: 'Real-time telemetry & lowest latency',
    color: 'from-amber-400 to-yellow-500',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    shortName: 'Flash-Lite',
    badge: 'Instant',
    icon: Sparkles,
    desc: 'Lightweight & instant DevOps replies',
    color: 'from-cyan-400 to-blue-500',
  },
  {
    id: 'gemini-4-hydrogen',
    name: 'Gemini Deep Engine',
    shortName: 'Deep Engine',
    badge: 'Deep RCA',
    icon: Brain,
    desc: 'Deep multi-cloud root cause analysis',
    color: 'from-purple-400 to-indigo-500',
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    shortName: 'Flash 3.8',
    badge: 'Next-Gen',
    icon: Zap,
    desc: 'Latest high-performance generation',
    color: 'from-emerald-400 to-teal-500',
  },
];

const QUICK_PROMPT_CHIPS = [
  { label: 'Diagnose Selected Server', prompt: 'Run a complete health diagnosis on this server. Inspect CPU, memory pressure, running Docker containers, failed systemd units, and Nginx reverse proxy.' },
  { label: 'Analyze Active Alerts', prompt: 'Analyze all active infrastructure alerts on my platform. Detail root causes, safe remediation commands, and verification steps.' },
  { label: 'Check Nginx & SSL Status', prompt: 'Check Nginx configuration syntax, active HTTP/HTTPS connections, and SSL certificate validity on this host.' },
  { label: 'Docker Container Recovery', prompt: 'Inspect all stopped or crashlooping Docker containers, review recent stderr logs, and propose a safe restart plan.' },
  { label: 'Kubernetes Pod Diagnostics', prompt: 'Check kubectl get pods and cluster events. Identify pending pods, OOMKilled containers, or CrashLoopBackOff states.' },
  { label: 'AWS vs Azure Fleet Health', prompt: 'Review my multi-cloud fleet across AWS and Azure. Provide architectural optimization recommendations for high availability.' },
];

const INITIAL_WELCOME_MESSAGE: Message = {
  id: 'welcome-msg',
  role: 'assistant',
  text: `Hello! I am your **Gemini AI DevOps Copilot & Auto-Remediation Engine** powered by Google's official Gemini API.\n\n⚡ **Gemini Flash** is active for ultra-fast, real-time telemetry diagnostics.\n\nI can inspect live servers over SSH, diagnose Docker/Kubernetes/Nginx/CI-CD failures, propose safe fixes, and execute verified remediations with automatic rollback.\n\nHow can I help optimize or troubleshoot your infrastructure today?`,
  timestamp: 'Just now',
};

export function GeminiDevOpsDrawer({ isOpen, onClose, targetServer }: GeminiDevOpsDrawerProps) {
  const {
    cloudProvider,
    filteredEC2Instances,
    filteredAzureVMs,
    filteredAlerts,
    isGeminiDrawerOpen,
    closeGeminiDrawer,
    geminiTargetServer,
  } = useMonitoring();

  // Support both explicit props and global context triggers
  const effectiveIsOpen = isOpen !== undefined ? isOpen : isGeminiDrawerOpen;
  const effectiveOnClose = onClose || closeGeminiDrawer;
  const effectiveServer = targetServer || geminiTargetServer;

  const [messages, setMessages] = useState<Message[]>([INITIAL_WELCOME_MESSAGE]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [activeAlertsCount, setActiveAlertsCount] = useState<number>(0);
  const [mounted, setMounted] = useState<boolean>(false);

  // Layout expansion states
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [showHistorySidebar, setShowHistorySidebar] = useState<boolean>(true);

  // Model selection state
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);

  // Chat Sessions state
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false);

  // Dedicated server selection for targeted diagnosis
  const [selectedServer, setSelectedServer] = useState<{ id?: string; name?: string; host?: string; provider?: string } | null>(null);

  // Speech-to-text voice recognition state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
      }
    }
    // Load saved model preference if available and valid
    try {
      const savedModel = localStorage.getItem('gemini_preferred_model');
      if (savedModel && AVAILABLE_MODELS.some((m) => m.id === savedModel)) {
        setSelectedModel(savedModel);
      } else {
        setSelectedModel('gemini-3.5-flash');
        localStorage.setItem('gemini_preferred_model', 'gemini-3.5-flash');
      }
    } catch {
      setSelectedModel('gemini-3.5-flash');
    }
  }, []);

  // Sync selectedServer when effectiveServer changes
  useEffect(() => {
    if (effectiveServer) {
      setSelectedServer(effectiveServer);
    }
  }, [effectiveServer]);

  // Compute live active alert count
  useEffect(() => {
    const count = filteredAlerts.filter((a) => a.status === 'active').length;
    setActiveAlertsCount(count);
  }, [filteredAlerts]);

  // Fetch saved sessions on mount or drawer open
  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      // First try localStorage cache for instant UI rendering
      const localCached = localStorage.getItem('gemini_chat_sessions');
      if (localCached) {
        try {
          const parsed = JSON.parse(localCached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSessions(parsed);
          }
        } catch {}
      }

      // Then fetch from database API
      const res = await fetch('/api/gemini/sessions');
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        try {
          localStorage.setItem('gemini_chat_sessions', JSON.stringify(data.sessions));
        } catch {}
      }
    } catch (err) {
      console.warn('[Gemini Sessions Fetch]:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (effectiveIsOpen) {
      fetchSessions();
    }
  }, [effectiveIsOpen]);

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

  // Close on Escape key & close dropdown on outside click
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && effectiveIsOpen) {
        if (isModelDropdownOpen) {
          setIsModelDropdownOpen(false);
        } else {
          effectiveOnClose();
        }
      }
    }
    function handleClickOutside(e: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [effectiveIsOpen, isModelDropdownOpen, effectiveOnClose]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    setIsModelDropdownOpen(false);
    try {
      localStorage.setItem('gemini_preferred_model', modelId);
    } catch {}
  };

  /**
   * Save or update conversation session in MongoDB + localStorage
   */
  const persistSession = async (updatedMessages: Message[], activeModel: string) => {
    const userMsgs = updatedMessages.filter((m) => m.role === 'user');
    if (userMsgs.length === 0) return;

    const firstUserText = userMsgs[0]?.text || 'DevOps Troubleshooting';
    const title = firstUserText.length > 36 ? firstUserText.slice(0, 36) + '...' : firstUserText;

    try {
      const res = await fetch('/api/gemini/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId || 'new',
          title,
          model: activeModel,
          serverName: selectedServer?.name || selectedServer?.host || undefined,
          messages: updatedMessages,
        }),
      });

      const data = await res.json();
      if (data.success && data.sessionId) {
        if (!currentSessionId) {
          setCurrentSessionId(data.sessionId);
        }
        // Update local session list
        setSessions((prev) => {
          const exists = prev.find((s) => s.id === data.sessionId);
          let nextSessions: SavedSession[];
          if (exists) {
            nextSessions = prev.map((s) =>
              s.id === data.sessionId
                ? {
                    ...s,
                    title,
                    model: activeModel,
                    messageCount: updatedMessages.length,
                    messages: updatedMessages,
                    updatedAt: new Date().toISOString(),
                  }
                : s
            );
          } else {
            nextSessions = [
              {
                id: data.sessionId,
                title,
                model: activeModel,
                serverName: selectedServer?.name || selectedServer?.host,
                messageCount: updatedMessages.length,
                messages: updatedMessages,
                updatedAt: new Date().toISOString(),
              },
              ...prev,
            ];
          }
          try {
            localStorage.setItem('gemini_chat_sessions', JSON.stringify(nextSessions));
          } catch {}
          return nextSessions;
        });
      }
    } catch (err) {
      console.warn('[Gemini Auto-Save Failed]:', err);
    }
  };

  /**
   * Create New Chat
   */
  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: `New conversation started! ⚡ **${
          AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name || 'Gemini Flash'
        }** is ready.\n\nAsk any question about AWS, Azure, Docker, Kubernetes, Nginx, CI/CD, or click a quick prompt below.`,
        timestamp: 'Just now',
      },
    ]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  /**
   * Load Saved Session
   */
  const handleLoadSession = (session: SavedSession) => {
    setCurrentSessionId(session.id);
    if (session.messages && Array.isArray(session.messages) && session.messages.length > 0) {
      setMessages(session.messages);
    } else {
      setMessages([INITIAL_WELCOME_MESSAGE]);
    }
    if (session.model && AVAILABLE_MODELS.some((m) => m.id === session.model)) {
      setSelectedModel(session.model);
    }
  };

  /**
   * Delete Saved Session
   */
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/gemini/sessions?id=${sessionId}`, { method: 'DELETE' });
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== sessionId);
        try {
          localStorage.setItem('gemini_chat_sessions', JSON.stringify(next));
        } catch {}
        return next;
      });
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
    } catch (err) {
      console.error('[Delete Session Error]:', err);
    }
  };

  /**
   * Clear All Sessions
   */
  const handleClearAllSessions = async () => {
    if (!window.confirm('Clear all saved chat history? This cannot be undone.')) return;
    try {
      await fetch('/api/gemini/sessions?id=all', { method: 'DELETE' });
      setSessions([]);
      try {
        localStorage.removeItem('gemini_chat_sessions');
      } catch {}
      handleNewChat();
    } catch (err) {
      console.error('[Clear All Sessions Error]:', err);
    }
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

      // Call conversational endpoint with model selection & live SSH probe
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          server: selectedServer || undefined,
          history: historyPayload,
          context: contextPayload,
          model: selectedModel,
        }),
      });

      const data = await res.json();

      if (data.success && data.text) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: data.text,
          model: data.model || selectedModel,
          timestamp: 'Just now',
          actionProposal: data.actionProposal || null,
          logId: data.logId || null,
          actionStatus: data.actionProposal ? 'pending' : undefined,
        };

        const updatedHistory = [...newMessages, assistantMessage];
        setMessages(updatedHistory);
        // Persist session to MongoDB & localStorage automatically
        persistSession(updatedHistory, data.model || selectedModel);
      } else {
        const errorDetail = data.error || 'Failed to get response from Gemini API.';
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            text: `⚠️ **Gemini API Notice**:\n\n${errorDetail}\n\n*If you are running the platform, please ensure \`GEMINI_API_KEY\` is configured in \`.env.local\` on the server.*`,
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

      setMessages((prev) => {
        const updated = prev.map((m) => {
          if (m.id !== messageId) return m;

          if (action === 'reject') {
            return {
              ...m,
              actionStatus: 'rejected' as const,
              actionOutput: 'User rejected the proposed remediation. No commands were executed.',
            };
          }

          if (action === 'rollback') {
            return {
              ...m,
              actionStatus: 'rolled_back' as const,
              rollbackOutput: data.output || 'Manual rollback executed.',
            };
          }

          // Approve outcome
          if (data.executionStatus === 'success') {
            return {
              ...m,
              actionStatus: 'success' as const,
              actionOutput: data.fixOutput,
              verifyOutput: data.verifyOutput,
            };
          } else if (data.rollbackTriggered) {
            return {
              ...m,
              actionStatus: 'rolled_back' as const,
              actionOutput: data.fixOutput,
              verifyOutput: data.verifyOutput,
              rollbackOutput: data.rollbackOutput,
            };
          } else {
            return {
              ...m,
              actionStatus: 'failed' as const,
              actionOutput: data.fixOutput || data.error,
            };
          }
        });

        // Sync with persisted session
        persistSession(updated, selectedModel);
        return updated;
      });
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

  const handleClearCurrentChat = () => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
  };

  /**
   * Toggle Speech-to-Text Voice Dictation
   */
  const toggleListening = () => {
    if (!speechSupported) {
      alert('Speech Recognition is not supported by your browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN'; // Clean recognition for English & Telugu accents

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInputPrompt((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[Speech Recognition Error]:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('[Speech Recognition Start Error]:', err);
      setIsListening(false);
    }
  };

  /**
   * Export Full Chat Session as formatted Markdown (.md)
   */
  const handleExportChatSession = () => {
    const activeModelObj = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];
    const serverIdentifier = selectedServer?.name || selectedServer?.host || 'Multi-Cloud Infrastructure Fleet';
    const timestampStr = new Date().toLocaleString();

    let md = `# Gemini AI DevOps Copilot - Incident & Troubleshooting Session\n\n`;
    md += `> **Generated At:** ${timestampStr}\n`;
    md += `> **Active AI Model Engine:** ${activeModelObj.name} (\`${activeModelObj.id}\`)\n`;
    md += `> **Target Scope:** ${serverIdentifier}\n`;
    md += `> **Total Messages:** ${messages.length}\n\n`;
    md += `---\n\n`;

    messages.forEach((msg) => {
      const isUser = msg.role === 'user';
      const roleTitle = isUser ? '👤 DevOps Engineer (User)' : `🤖 Gemini DevOps Copilot (${msg.model || activeModelObj.name})`;
      md += `### ${roleTitle} - *${msg.timestamp}*\n\n`;

      // Clean message content of action proposal blocks for clear reading
      const cleaned = msg.text.replace(/```(?:json:action_proposal|json)\s*[\s\S]*?```/g, '').trim();
      md += `${cleaned}\n\n`;

      if (msg.actionProposal) {
        md += `#### 🛡️ Remediation Action Proposal\n`;
        md += `- **Title:** ${msg.actionProposal.title}\n`;
        md += `- **Tool Affected:** ${msg.actionProposal.tool}\n`;
        md += `- **Problem:** ${msg.actionProposal.problem}\n`;
        if (msg.actionProposal.root_cause) {
          md += `- **Root Cause:** ${msg.actionProposal.root_cause}\n`;
        }
        md += `- **Fix Command:**\n\`\`\`bash\n${msg.actionProposal.fix_command}\n\`\`\`\n`;
        md += `- **Verify Command:**\n\`\`\`bash\n${msg.actionProposal.verify_command}\n\`\`\`\n`;
        md += `- **Auto-Rollback Command:**\n\`\`\`bash\n${msg.actionProposal.rollback_command}\n\`\`\`\n`;
        md += `- **Execution Status:** \`${(msg.actionStatus || 'pending').toUpperCase()}\`\n\n`;

        if (msg.actionOutput) {
          md += `**Fix Execution Output:**\n\`\`\`text\n${msg.actionOutput}\n\`\`\`\n\n`;
        }
        if (msg.verifyOutput) {
          md += `**Verify Output:**\n\`\`\`text\n${msg.verifyOutput}\n\`\`\`\n\n`;
        }
        if (msg.rollbackOutput) {
          md += `**Rollback Output:**\n\`\`\`text\n${msg.rollbackOutput}\n\`\`\`\n\n`;
        }
      }

      md += `---\n\n`;
    });

    md += `*Exported by Gemini AI DevOps Copilot • MultiCloud Monitoring Platform*\n`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeDate = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    link.href = url;
    link.download = `Gemini-DevOps-Session-${safeDate}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!mounted || !effectiveIsOpen) return null;

  const currentModelObj = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];
  const ModelIcon = currentModelObj.icon;

  return createPortal(
    <div className="fixed inset-0 z-[999999] overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={effectiveOnClose}
        aria-hidden="true"
      />

      {/* Main Container: Wide/Maximized Layout with Left History Sidebar */}
      <div
        ref={drawerRef}
        className={`relative bg-[#080E1C] border-l-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/30 text-slate-100 flex h-full z-10 transition-all duration-300 ease-out animate-in slide-in-from-right ${
          isMaximized
            ? 'w-full max-w-full'
            : 'w-full max-w-5xl xl:max-w-6xl'
        }`}
      >
        {/* Holographic Glowing Header Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-cyan-400 to-amber-400 animate-pulse pointer-events-none z-30" />

        {/* ============================================================== */}
        {/* LEFT SIDEBAR: SAVED CHAT HISTORY & NEW CHAT                    */}
        {/* ============================================================== */}
        {showHistorySidebar && (
          <aside className="w-64 sm:w-72 md:w-80 bg-[#060A16] border-r border-[#1E293B] flex flex-col h-full shrink-0 z-20">
            {/* Sidebar Top: New Chat Button */}
            <div className="p-3.5 border-b border-[#1E293B] bg-[#090E1F]/80">
              <button
                type="button"
                onClick={handleNewChat}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600/30 via-indigo-600/30 to-cyan-600/30 hover:from-purple-600/50 hover:to-cyan-600/50 border border-cyan-500/40 hover:border-cyan-400 text-white font-semibold text-xs transition shadow-md shadow-cyan-500/10 cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-cyan-500/20 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <span className="tracking-wide">New Chat</span>
                </div>
                <span className="text-[10px] text-cyan-400/80 font-mono uppercase bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                  Ctrl+N
                </span>
              </button>
            </div>

            {/* Sidebar Middle: Saved Conversations List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  Chat History ({sessions.length})
                </span>
                {sessions.length > 0 && (
                  <button
                    type="button"
                    onClick={fetchSessions}
                    disabled={isLoadingSessions}
                    className="text-slate-500 hover:text-cyan-300 transition"
                    title="Refresh History"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingSessions ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>

              {sessions.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs rounded-xl bg-[#080D1A] border border-slate-800/60 mt-2">
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                  <p className="font-medium text-slate-400">No saved chats yet</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Your conversations and remediation plans are automatically saved here.
                  </p>
                </div>
              ) : (
                sessions.map((sess) => {
                  const isActive = currentSessionId === sess.id;
                  const isFlash = (sess.model || '').toLowerCase().includes('flash');

                  return (
                    <div
                      key={sess.id}
                      onClick={() => handleLoadSession(sess)}
                      className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition cursor-pointer border ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-950/70 to-indigo-950/70 border-cyan-500/60 text-white shadow-md shadow-cyan-500/10'
                          : 'bg-[#090F20]/50 hover:bg-[#0E162B] border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 pr-2">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isActive
                              ? 'bg-cyan-500/30 text-cyan-300'
                              : 'bg-slate-800/80 text-slate-400 group-hover:text-cyan-300'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate text-[11px] text-slate-200 group-hover:text-white">
                            {sess.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                            <span
                              className={`px-1 rounded text-[9px] font-mono uppercase ${
                                isFlash
                                  ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                                  : 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                              }`}
                            >
                              {isFlash ? '⚡ Flash' : '🧠 Deep'}
                            </span>
                            <span>•</span>
                            <span>{sess.messageCount} msgs</span>
                          </div>
                        </div>
                      </div>

                      {/* Delete session button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(e, sess.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition shrink-0"
                        title="Delete Chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Bottom: Storage & Clear */}
            <div className="p-3 border-t border-[#1E293B] bg-[#070B18] flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                MongoDB Auto-Save
              </span>
              {sessions.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllSessions}
                  className="text-slate-500 hover:text-rose-400 text-[10px] font-medium transition cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
          </aside>
        )}

        {/* ============================================================== */}
        {/* RIGHT MAIN CHAT AREA                                           */}
        {/* ============================================================== */}
        <main className="flex-1 flex flex-col h-full min-w-0 bg-[#080E1C] overflow-hidden">
          {/* Main Top Header Bar */}
          <header className="px-4 py-3 bg-[#0B1224] border-b border-[#1E293B] flex items-center justify-between shrink-0 gap-3">
            {/* Left: Sidebar Toggle + Title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setShowHistorySidebar(!showHistorySidebar)}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition border border-slate-700/60 cursor-pointer shrink-0"
                title={showHistorySidebar ? 'Hide Chat History' : 'Show Chat History'}
              >
                {showHistorySidebar ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4" />
                )}
              </button>

              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600/30 via-indigo-600/20 to-cyan-500/30 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/20 shrink-0">
                <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
              </div>

              <div className="min-w-0 truncate">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-white text-sm sm:text-base tracking-tight truncate">
                    Gemini AI DevOps Copilot
                  </h3>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/40 tracking-wider">
                    Auto-Remediation Engine
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                  <span>Safe SSH Execution • Automatic Rollback</span>
                  <span className="inline-block w-1 h-1 rounded-full bg-emerald-400"></span>
                  <span className="text-emerald-400 font-semibold">Live Telemetry</span>
                </p>
              </div>
            </div>

            {/* Right: Model Selector + Maximize + Clear + Close */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Model Selector Dropdown */}
              <div className="relative" ref={modelDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0C152B] to-[#0A1020] hover:from-[#111C38] hover:to-[#0D152A] border border-cyan-500/40 hover:border-cyan-400 text-xs font-semibold text-slate-200 shadow-md shadow-cyan-500/10 transition cursor-pointer"
                >
                  <ModelIcon className="w-3.5 h-3.5 text-cyan-300" />
                  <span className="hidden md:inline font-mono text-cyan-300 font-bold">
                    {currentModelObj.name}
                  </span>
                  <span className="md:hidden font-mono text-cyan-300 font-bold">
                    {currentModelObj.shortName}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {currentModelObj.badge}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isModelDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#090F22] border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/30 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      Select Gemini Model Engine:
                    </div>
                    <div className="space-y-1 mt-1">
                      {AVAILABLE_MODELS.map((m) => {
                        const Icon = m.icon;
                        const isSelected = selectedModel === m.id;

                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleSelectModel(m.id)}
                            className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition cursor-pointer ${
                              isSelected
                                ? 'bg-cyan-500/20 border border-cyan-500/50 text-white'
                                : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
                              <Icon className="w-4 h-4 text-cyan-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-white">{m.name}</span>
                                <span className="text-[9px] font-extrabold uppercase px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  {m.badge}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">{m.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Export Full Chat Session as Markdown */}
              <button
                type="button"
                onClick={handleExportChatSession}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-300 transition border border-slate-700/60 hover:border-cyan-500/50 cursor-pointer text-xs font-semibold shadow-sm"
                title="Download Entire Chat Session as Markdown (.md)"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline text-[11px] font-bold text-cyan-300">Export Chat</span>
              </button>

              {/* Maximize / Restore Toggle */}
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition border border-slate-700/60 cursor-pointer"
                title={isMaximized ? 'Restore View' : 'Maximize Full Screen'}
              >
                {isMaximized ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>

              {/* Clear Current Chat */}
              <button
                type="button"
                onClick={handleClearCurrentChat}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition border border-slate-700/60 cursor-pointer"
                title="Clear Current Screen"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Close Drawer */}
              <button
                type="button"
                onClick={effectiveOnClose}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition border border-slate-700/60 cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Selected Server Diagnostic Banner */}
          {selectedServer ? (
            <div className="px-5 py-2.5 bg-gradient-to-r from-[#0C152B] via-[#091122] to-[#0C152B] border-b border-cyan-500/30 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
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
              <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                <Server className="w-3 h-3 text-cyan-400 shrink-0" />
                Multi-Cloud Fleet Scope (AWS EC2 & Azure VMs • Click any server in heatmap for dedicated SSH probe)
              </span>
              <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                Active Alerts: <strong className="text-white">{activeAlertsCount}</strong>
              </span>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
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
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
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
                      targetServerName={selectedServer?.name || selectedServer?.host}
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
                    <span className="flex items-center gap-1.5">
                      <span>{msg.role === 'user' ? 'You' : msg.model || selectedModel}</span>
                      {msg.role === 'assistant' && (
                        <span className="px-1 rounded text-[8px] font-mono uppercase bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                          Verified
                        </span>
                      )}
                    </span>
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
                    <span>Gemini AI ({currentModelObj.name}) is inspecting infrastructure telemetry...</span>
                  </div>
                  <div className="flex items-center gap-1.5 py-1">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse delay-100"></div>
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse delay-200"></div>
                    <span className="text-[11px] text-slate-400 ml-2">Running live SSH probes on Docker, K8s, Nginx, and system services...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-4 py-2.5 bg-[#070D1B] border-t border-[#1E293B]/70 shrink-0">
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
                  className="whitespace-nowrap px-3 py-1 rounded-lg bg-[#0E172E] hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-200 border border-slate-700/60 hover:border-cyan-500/50 text-[11px] font-medium transition cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box Area */}
          <div className="p-3.5 sm:p-4 bg-[#0B1224] border-t border-[#1E293B] shrink-0">
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
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    Press <strong>Enter</strong> to send • <strong>Shift+Enter</strong> for newline
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                    ⚡ {currentModelObj.shortName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Voice Mic Input */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer shadow-sm ${
                      isListening
                        ? 'bg-rose-500/30 text-rose-300 border-rose-500 animate-pulse shadow-rose-500/30'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border-slate-700/60'
                    }`}
                    title={
                      isListening
                        ? 'Listening to voice... Click to stop'
                        : speechSupported
                        ? 'Voice Input (Mic) - Speak in English or Telugu'
                        : 'Speech recognition requires Chrome or Edge'
                    }
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                        <span className="text-[11px] font-bold text-rose-300">Listening...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-slate-300 group-hover:text-cyan-300" />
                        <span className="hidden sm:inline text-[11px]">Voice</span>
                      </>
                    )}
                  </button>

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
        </main>
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
  targetServerName,
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
  targetServerName?: string;
  onExecute: (action: 'approve' | 'rollback' | 'reject', customCmd?: string) => void;
  onModifyPrompt: (promptToEdit: string) => void;
}) {
  const [showTerminalLogs, setShowTerminalLogs] = useState(false);

  // Export professional Markdown Root Cause Analysis (RCA) Incident Report
  const handleExportRCA = () => {
    const timestampStr = new Date().toLocaleString();
    const serverName = targetServerName || 'Multi-Cloud Infrastructure Host';

    let rca = `# DevOps Incident Root Cause Analysis (RCA) & Remediation Report\n\n`;
    rca += `| Parameter | Value |\n`;
    rca += `| :--- | :--- |\n`;
    rca += `| **Incident Title** | ${proposal.title} |\n`;
    rca += `| **Target Infrastructure Host** | ${serverName} |\n`;
    rca += `| **Affected Component / Service** | ${proposal.tool.toUpperCase()} |\n`;
    rca += `| **Remediation Status** | ${status.toUpperCase()} |\n`;
    rca += `| **Audit Log Reference ID** | \`${logId}\` |\n`;
    rca += `| **Report Timestamp** | ${timestampStr} |\n\n`;
    rca += `---\n\n`;

    rca += `## 1. Problem Statement\n`;
    rca += `${proposal.problem}\n\n`;

    if (proposal.root_cause) {
      rca += `## 2. Technical Root Cause\n`;
      rca += `${proposal.root_cause}\n\n`;
    }

    rca += `## 3. Remediation & Verification Plan\n`;
    rca += `### Proposed Fix Command\n\`\`\`bash\n${proposal.fix_command}\n\`\`\`\n\n`;
    rca += `### Health Verification Command\n\`\`\`bash\n${proposal.verify_command}\n\`\`\`\n\n`;
    rca += `### Auto-Rollback Command\n\`\`\`bash\n${proposal.rollback_command}\n\`\`\`\n\n`;

    rca += `## 4. Live Terminal Execution & Verification Logs\n`;
    if (actionOutput) {
      rca += `### Fix Execution Output\n\`\`\`text\n${actionOutput}\n\`\`\`\n\n`;
    } else {
      rca += `*No fix execution logs recorded yet (Current status: ${status}).*\n\n`;
    }

    if (verifyOutput) {
      rca += `### Verification Output\n\`\`\`text\n${verifyOutput}\n\`\`\`\n\n`;
    }

    if (rollbackOutput) {
      rca += `### Rollback Output\n\`\`\`text\n${rollbackOutput}\n\`\`\`\n\n`;
    }

    rca += `## 5. Security & Safety Compliance\n`;
    rca += `- **Human-in-the-Loop Approval:** Mandated before modifying system state.\n`;
    rca += `- **Verification Check:** Automatically executed post-remediation.\n`;
    rca += `- **Rollback Readiness:** Verified rollback command cached for instant reversion.\n\n`;
    rca += `---\n`;
    rca += `*Generated by Gemini AI DevOps Auto-Remediation Engine • MultiCloud Monitoring Platform*\n`;

    const blob = new Blob([rca], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTool = proposal.tool.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeDate = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `RCA-${safeTool}-${safeDate}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-purple-950/40 via-cyan-950/40 to-blue-950/40 border-b border-cyan-500/30 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-extrabold text-white text-xs tracking-tight">
            Remediation Action Proposal
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Export RCA Report Button */}
          <button
            type="button"
            onClick={handleExportRCA}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 hover:text-white border border-cyan-500/40 text-[10px] font-bold transition cursor-pointer shadow-sm shadow-cyan-500/10"
            title="Download Incident RCA Report (Markdown)"
          >
            <FileDown className="w-3 h-3 text-cyan-300" />
            <span>Export RCA</span>
          </button>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getToolBadgeColor(proposal.tool)}`}>
            {proposal.tool}
          </span>
        </div>
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
            <span>Requires Explicit Approval</span>
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
