'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/types';
import { sendChatMessage } from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  sidebar?: boolean;
}

export default function ChatPanel({ open, onClose, sidebar = false }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      actions: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(text);

      const actionsText: string[] = [];
      if (res.trades && res.trades.length > 0) {
        actionsText.push(`Executed ${res.trades.length} trade(s):`);
        res.trades.forEach((t) => {
          actionsText.push(`  ${t.side.toUpperCase()} ${t.quantity} ${t.ticker}`);
        });
      }
      if (res.watchlist_changes && res.watchlist_changes.length > 0) {
        actionsText.push(`Watchlist changes:`);
        res.watchlist_changes.forEach((w) => {
          actionsText.push(`  ${w.action === 'add' ? 'Added' : 'Removed'} ${w.ticker}`);
        });
      }

      const content = actionsText.length > 0
        ? `${res.message}\n\n${actionsText.join('\n')}`
        : res.message;

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content,
        actions: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
        actions: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const header = (
    <div className="panel-header flex shrink-0 items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4 shrink-0 text-blue-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <div>
          <div className="text-data font-semibold uppercase tracking-widest text-text-muted">Assistant</div>
          <div className="text-sm font-semibold text-text-primary">AI Chat</div>
        </div>
      </div>
      <button
        onClick={onClose}
        className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-elevated hover:text-text-primary"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );

  const messagesArea = (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
      {messages.length === 0 && !loading && (
        <div className="rounded-lg border border-border-muted bg-surface-elevated/55 px-4 py-5 text-center text-xs leading-relaxed text-text-muted">
          Ask about your portfolio, request a trade, or manage your watchlist.
        </div>
      )}
      {messages.map((msg, i) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div
            className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'border border-blue-primary/25 bg-blue-primary/15 text-text-primary'
                : 'border border-border-muted bg-surface-elevated text-text-secondary'
            }`}
          >
            {msg.content.split('\n').map((line, li) => (
              <div key={li} className={line.startsWith('  ') ? 'text-text-muted pl-3' : ''}>
                {line}
              </div>
            ))}
          </div>
        </div>
      ))}
      {loading && (
        <div className="flex justify-start">
          <div className="bg-surface-elevated border border-border-muted rounded-xl px-3.5 py-2.5">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 bg-blue-primary rounded-full animate-bounce-dot" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-blue-primary rounded-full animate-bounce-dot" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-blue-primary rounded-full animate-bounce-dot" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );

  const inputArea = (
    <div className="shrink-0 border-t border-border-muted p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={loading}
          className="min-w-0 flex-1 rounded-md border border-border-muted bg-surface-elevated px-3 py-2 text-xs text-text-primary transition-all placeholder:text-text-muted focus:border-blue-primary/50 focus:outline-none focus:ring-2 focus:ring-blue-primary/10 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="rounded-md bg-blue-primary px-3.5 py-2 text-xs font-bold text-white transition-all duration-150 hover:bg-blue-glow disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );

  if (sidebar) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border-muted bg-surface/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
        {header}
        {messagesArea}
        {inputArea}
      </div>
    );
  }

  return (
    <>
      {open && (
        <div
          className="absolute inset-0 z-20 animate-fade-in bg-black/50 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}
      <div
        className={`absolute bottom-3 right-3 top-3 z-30 flex w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg border border-border-muted bg-surface/95 shadow-2xl shadow-black/40 backdrop-blur-xl transition-all duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {header}
        {messagesArea}
        {inputArea}
      </div>
    </>
  );
}
