'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  User,
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCw,
  Search,
  MessageSquare,
  Square,
  Sparkles,
  Edit2,
  PanelLeftClose,
  PanelLeftOpen,
  Terminal,
  Code2,
  ExternalLink,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';

interface ConversationListItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string | Date;
}

const PROMPT_SUGGESTIONS = [
  {
    title: 'Explain Docker in simple terms',
    category: 'DevOps & Containers',
    prompt: 'Explain Docker in simple terms with analogies and why developers use it.',
  },
  {
    title: 'Help me troubleshoot an Nginx error',
    category: 'Web Servers',
    prompt: 'Help me troubleshoot an Nginx 502 Bad Gateway error. What are the common causes and step-by-step diagnostic commands?',
  },
  {
    title: 'Write a Python script',
    category: 'Programming',
    prompt: 'Write a Python script to monitor website uptime, measure response latency, and log alerts to a JSON file.',
  },
  {
    title: 'Explain Kubernetes pods',
    category: 'Cloud Architecture',
    prompt: 'Explain what a Kubernetes Pod is, how multi-container pods work, and the pod lifecycle states.',
  },
  {
    title: 'Prepare for a DevOps interview',
    category: 'Career & Prep',
    prompt: 'Give me 5 challenging DevOps interview questions on CI/CD, container orchestration, and incident response with ideal answers.',
  },
];

export default function StandaloneChatGPTPage() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState('');
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(true);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating, scrollToBottom]);

  // Auto-adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  // Load conversation list from DB
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/conversations');
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          setConversations(list);
        }
      }
    } catch (err) {
      console.warn('Failed to load conversations:', err);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load specific conversation messages
  const loadConversationMessages = async (id: string) => {
    try {
      setActiveConversationId(id);
      const res = await fetch(`/api/ai/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.warn(`Failed to load conversation ${id}:`, err);
    }
  };

  // Start a new chat
  const handleNewChat = () => {
    if (isGenerating && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
    setActiveConversationId(null);
    setMessages([]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Rename a conversation
  const handleStartRename = (e: React.MouseEvent, c: ConversationListItem) => {
    e.stopPropagation();
    setEditingTitleId(c.id);
    setEditingTitleText(c.title);
  };

  const handleSaveRename = async (id: string) => {
    if (!editingTitleText.trim()) {
      setEditingTitleId(null);
      return;
    }
    try {
      const res = await fetch(`/api/ai/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitleText.trim() }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: editingTitleText.trim() } : c))
        );
      }
    } catch (err) {
      console.warn('Failed to rename conversation:', err);
    } finally {
      setEditingTitleId(null);
    }
  };

  // Delete a conversation
  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/ai/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          handleNewChat();
        }
      }
    } catch (err) {
      console.warn('Failed to delete conversation:', err);
    }
  };

  // Stop generating
  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  // Send message
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isGenerating) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Placeholder assistant message for streaming
    const assistantMessageId = `ast-${Date.now()}`;
    const initialAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };

    setMessages([...updatedMessages, initialAssistantMessage]);
    setIsGenerating(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversationId,
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      // Check if response is streaming SSE or JSON
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        let streamBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          streamBuffer += decoder.decode(value, { stream: true });
          const lines = streamBuffer.split('\n');
          streamBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            if (trimmed === 'data: [DONE]') continue;

            try {
              const data = JSON.parse(trimmed.slice(5).trim());
              if (data.conversationId && !activeConversationId) {
                setActiveConversationId(data.conversationId);
              }
              if (data.token) {
                accumulatedText += data.token;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId ? { ...msg, content: accumulatedText } : msg
                  )
                );
              }
              if (data.error) {
                accumulatedText += `\n\n*Error: ${data.error}*`;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId ? { ...msg, content: accumulatedText } : msg
                  )
                );
              }
            } catch {
              // ignore json parse error
            }
          }
        }
      } else {
        // Normal JSON response
        const data = await res.json();
        const content = data.message?.content || data.content || 'Response generated.';
        if (data.conversationId && !activeConversationId) {
          setActiveConversationId(data.conversationId);
        }
        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content } : msg))
        );
      }

      // Refresh conversations list in background
      loadConversations();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const errorMessage = `⚠️ **Error communicating with AI service:** ${err.message || 'Unknown error'}\n\nPlease check your \`OPENAI_API_KEY\` or \`GEMINI_API_KEY\` in \`.env.local\`.`;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: errorMessage } : msg
          )
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Regenerate last response
  const handleRegenerate = () => {
    if (isGenerating || messages.length === 0) return;
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMessage) {
      // Remove last assistant message
      const trimmed = messages.slice(0, -1);
      setMessages(trimmed);
      handleSendMessage(lastUserMessage.content);
    }
  };

  // Copy code block to clipboard
  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Copy full message
  const handleCopyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Handle textarea keypress
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render markdown with fenced code blocks
  const renderMessageContent = (content: string, messageId: string) => {
    if (!content) {
      return (
        <div className="flex items-center gap-1.5 py-1 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs">Thinking...</span>
        </div>
      );
    }

    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
      <div className="space-y-3 text-[13.5px] leading-relaxed text-slate-100">
        {parts.map((part, index) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const firstLineEnd = part.indexOf('\n');
            const language =
              firstLineEnd !== -1 ? part.slice(3, firstLineEnd).trim() || 'text' : 'text';
            const code =
              firstLineEnd !== -1 ? part.slice(firstLineEnd + 1, -3) : part.slice(3, -3);
            const blockId = `${messageId}-code-${index}`;

            return (
              <div
                key={index}
                className="my-3 rounded-lg overflow-hidden border border-slate-700/80 bg-[#090E1A] shadow-md"
              >
                <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0D1527] border-b border-slate-800 text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{language}</span>
                  </div>
                  <button
                    onClick={() => handleCopyCode(code, blockId)}
                    className="flex items-center gap-1 hover:text-white transition-colors text-[11px] px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60"
                  >
                    {copiedCodeId === blockId ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy code</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-cyan-200 overflow-x-auto leading-relaxed selection:bg-blue-600/30">
                  <code>{code}</code>
                </pre>
              </div>
            );
          }

          // Plain markdown formatting
          const paragraphs = part.split('\n\n');
          return (
            <div key={index} className="space-y-2">
              {paragraphs.map((p, pIdx) => {
                const trimmed = p.trim();
                if (!trimmed) return null;

                // Headers
                if (trimmed.startsWith('### ')) {
                  return (
                    <h3 key={pIdx} className="text-base font-bold text-white pt-2 border-b border-slate-800/60 pb-1">
                      {trimmed.slice(4)}
                    </h3>
                  );
                }
                if (trimmed.startsWith('## ')) {
                  return (
                    <h2 key={pIdx} className="text-lg font-bold text-white pt-2 border-b border-slate-800/60 pb-1">
                      {trimmed.slice(3)}
                    </h2>
                  );
                }
                if (trimmed.startsWith('#### ')) {
                  return (
                    <h4 key={pIdx} className="text-sm font-semibold text-cyan-300 pt-1">
                      {trimmed.slice(5)}
                    </h4>
                  );
                }

                // Bullet lists
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                  const items = trimmed.split('\n');
                  return (
                    <ul key={pIdx} className="space-y-1.5 list-disc pl-5 text-slate-200">
                      {items.map((item, iIdx) => (
                        <li key={iIdx}>
                          {formatInlineMarkdown(item.replace(/^[-*]\s+/, ''))}
                        </li>
                      ))}
                    </ul>
                  );
                }

                // Numbered lists
                if (/^\d+\.\s/.test(trimmed)) {
                  const items = trimmed.split('\n');
                  return (
                    <ol key={pIdx} className="space-y-1.5 list-decimal pl-5 text-slate-200">
                      {items.map((item, iIdx) => (
                        <li key={iIdx}>
                          {formatInlineMarkdown(item.replace(/^\d+\.\s+/, ''))}
                        </li>
                      ))}
                    </ol>
                  );
                }

                return (
                  <p key={pIdx} className="text-slate-200 leading-relaxed">
                    {formatInlineMarkdown(trimmed)}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // Helper for inline bold, code, and links
  const formatInlineMarkdown = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((seg, i) => {
      if (seg.startsWith('`') && seg.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded text-[12px] font-mono bg-[#1E293B] text-cyan-300 border border-slate-700/50"
          >
            {seg.slice(1, -1)}
          </code>
        );
      }
      if (seg.startsWith('**') && seg.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-white">
            {seg.slice(2, -2)}
          </strong>
        );
      }
      return seg;
    });
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchHistory.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <Sidebar />

      <div className="lg:pl-64 flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        <Header />

        <div className="flex flex-1 min-h-0 relative">
          {/* ChatGPT Conversations Sidebar */}
          <aside
            className={`${
              isHistorySidebarOpen ? 'w-64 sm:w-72' : 'w-0'
            } transition-all duration-300 ease-in-out bg-[#0E1526] border-r border-[#1E293B] flex flex-col overflow-hidden z-20 flex-shrink-0`}
          >
            {/* New Chat Button & Search */}
            <div className="p-3 border-b border-[#1E293B] space-y-2">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/20 active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  <span>New Chat</span>
                </div>
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              </button>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchHistory}
                  onChange={(e) => setSearchHistory(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#121B30] border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Conversation History List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Chat History
              </div>

              {filteredConversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const isEditing = editingTitleId === conv.id;

                return (
                  <div
                    key={conv.id}
                    onClick={() => loadConversationMessages(conv.id)}
                    className={`group relative flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#18243E] text-white font-semibold border border-blue-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#131C31]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2 flex-1">
                      <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingTitleText}
                          onChange={(e) => setEditingTitleText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(conv.id);
                            if (e.key === 'Escape') setEditingTitleId(null);
                          }}
                          onBlur={() => handleSaveRename(conv.id)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          className="bg-[#0B1120] text-white px-1.5 py-0.5 rounded border border-blue-500 text-xs w-full focus:outline-none"
                        />
                      ) : (
                        <span className="truncate">{conv.title}</span>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => handleStartRename(e, conv)}
                          title="Rename chat"
                          className="p-1 rounded hover:bg-slate-700/80 text-slate-400 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteConversation(e, conv.id)}
                          title="Delete chat"
                          className="p-1 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredConversations.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500">
                  {searchHistory ? 'No chats match search.' : 'No conversations yet.'}
                </div>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-3 border-t border-[#1E293B] text-[11px] text-slate-500 flex items-center justify-between">
              <span>ChatGPT / Cloud LLM</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                Online
              </span>
            </div>
          </aside>

          {/* Main Chat Workspace */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#0B1120] relative">
            {/* Top Workspace Header Bar */}
            <div className="h-12 border-b border-[#1E293B] px-4 flex items-center justify-between bg-[#0E1628]/80 backdrop-blur-sm z-10 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsHistorySidebarOpen(!isHistorySidebarOpen)}
                  title={isHistorySidebarOpen ? 'Hide History' : 'Show History'}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  {isHistorySidebarOpen ? (
                    <PanelLeftClose className="w-4 h-4" />
                  ) : (
                    <PanelLeftOpen className="w-4 h-4" />
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-md">
                    {activeConversationId
                      ? conversations.find((c) => c.id === activeConversationId)?.title || 'Chat'
                      : 'New Conversation'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={handleNewChat}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#141E34] hover:bg-[#1A2744] text-slate-300 hover:text-white border border-slate-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">New Chat</span>
                </button>
              </div>
            </div>

            {/* Chat Messages Scroll Container */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 space-y-6">
              {/* Welcome Screen when no messages */}
              {messages.length === 0 && (
                <div className="max-w-2xl mx-auto my-auto pt-8 pb-12 text-center space-y-8 animate-fade-in">
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white mx-auto shadow-xl shadow-cyan-500/20">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                      How can I help you today?
                    </h1>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Ask me anything. Coding, Linux commands, DevOps architectures, text drafting, troubleshooting, or general knowledge.
                    </p>
                  </div>

                  {/* Suggested Prompt Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    {PROMPT_SUGGESTIONS.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(item.prompt)}
                        className="p-3.5 rounded-xl bg-[#10182B] hover:bg-[#16223B] border border-[#1E293B] hover:border-blue-500/40 text-left transition-all group shadow-sm hover:shadow-md"
                      >
                        <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider block mb-1">
                          {item.category}
                        </span>
                        <div className="text-xs font-medium text-slate-200 group-hover:text-white">
                          {item.title}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Render Message History */}
              {messages.map((msg) => {
                const isUser = msg.role === 'user';

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-3xl mx-auto ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`relative group rounded-2xl px-4 py-3.5 ${
                        isUser
                          ? 'bg-[#1E293B] text-white border border-slate-700/60 max-w-[85%] sm:max-w-[75%]'
                          : 'bg-[#10182B] text-slate-100 border border-[#1E293B] w-full max-w-3xl'
                      }`}
                    >
                      {/* Message Content */}
                      {isUser ? (
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                      ) : (
                        renderMessageContent(msg.content, msg.id)
                      )}

                      {/* Action buttons on assistant message */}
                      {!isUser && msg.content && (
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                          <button
                            onClick={() => handleCopyMessage(msg.content, msg.id)}
                            className="flex items-center gap-1 hover:text-white px-2 py-1 rounded hover:bg-slate-800/80 transition-colors"
                          >
                            {copiedMessageId === msg.id ? (
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

                          {msg.id === messages[messages.length - 1]?.id && !isGenerating && (
                            <button
                              onClick={handleRegenerate}
                              className="flex items-center gap-1 hover:text-white px-2 py-1 rounded hover:bg-slate-800/80 transition-colors"
                            >
                              <RotateCw className="w-3 h-3" />
                              <span>Regenerate</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-200 flex-shrink-0 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Message Input Composer */}
            <div className="p-4 border-t border-[#1E293B] bg-[#0E1628]/90 backdrop-blur-md flex-shrink-0">
              <div className="max-w-3xl mx-auto space-y-2">
                <div className="relative flex items-end gap-2 bg-[#121B30] border border-slate-700/80 rounded-2xl p-2.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all shadow-inner">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message ChatGPT... (Enter to send, Shift + Enter for new line)"
                    className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none resize-none max-h-44 px-2 py-1 leading-relaxed"
                  />

                  {isGenerating ? (
                    <button
                      onClick={handleStopGenerating}
                      title="Stop generating"
                      className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md flex-shrink-0"
                    >
                      <Square className="w-4 h-4 fill-white" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!input.trim()}
                      title="Send message"
                      className={`p-2 rounded-xl transition-all flex-shrink-0 ${
                        input.trim()
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md shadow-blue-600/30 active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 px-2">
                  <span>Enter to send • Shift + Enter for new line</span>
                  <span>Standalone AI Chatbot</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
