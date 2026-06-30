'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/types';
import { sendChatMessage } from '@/lib/api';
import { formatCurrency, formatSignedPercent } from '@/lib/utils';

interface Props {
  open: boolean;
}

export default function ChatPanel({ open }: Props) {
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

  return (
    <div
      className={`flex flex-col bg-surface border-l border-border-muted transition-all duration-300 overflow-hidden ${
        open ? 'w-80' : 'w-0 border-l-0'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-muted shrink-0">
        <span className="text-data text-gray-400 uppercase tracking-wider">AI Chat</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="text-gray-500 text-xs text-center py-4">
            Ask me about your portfolio, request a trade, or manage your watchlist.
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-primary/20 text-gray-200'
                  : 'bg-surface border border-border-muted text-gray-300'
              }`}
            >
              {msg.content.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border-muted rounded-lg px-3 py-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border-muted shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={loading}
            className="flex-1 px-2 py-1.5 text-xs bg-background border border-border-muted rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-primary disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-3 py-1.5 text-xs font-bold text-white bg-purple-secondary rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
