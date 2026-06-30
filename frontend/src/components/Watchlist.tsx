'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { PriceData, WatchlistItem } from '@/lib/types';
import { formatCurrency, formatSignedPercent, cn } from '@/lib/utils';
import Sparkline from './Sparkline';

interface Props {
  items: WatchlistItem[];
  priceHistory: Map<string, PriceData[]>;
  selectedTicker: string | null;
  onSelectTicker: (ticker: string) => void;
}

interface FlashState {
  ticker: string;
  direction: 'up' | 'down';
}

export default function Watchlist({ items, priceHistory, selectedTicker, onSelectTicker }: Props) {
  const [flashStates, setFlashStates] = useState<Map<string, FlashState>>(new Map());
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const triggerFlash = useCallback((ticker: string, direction: 'up' | 'down') => {
    const existing = flashTimers.current.get(ticker);
    if (existing) clearTimeout(existing);

    setFlashStates((prev) => {
      const next = new Map(prev);
      next.set(ticker, { ticker, direction });
      return next;
    });

    const timer = setTimeout(() => {
      setFlashStates((prev) => {
        const next = new Map(prev);
        next.delete(ticker);
        return next;
      });
      flashTimers.current.delete(ticker);
    }, 500);
    flashTimers.current.set(ticker, timer);
  }, []);

  useEffect(() => {
    return () => {
      flashTimers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <div className="flex flex-col gap-1">
      <div className="text-data text-gray-400 uppercase tracking-wider px-2 py-1">Watchlist</div>
      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const flash = flashStates.get(item.ticker);
          const history = priceHistory.get(item.ticker) || [];
          const isUp = (item.change ?? 0) >= 0;
          return (
            <button
              key={item.ticker}
              onClick={() => onSelectTicker(item.ticker)}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors w-full',
                'hover:bg-surface/60 border border-transparent',
                selectedTicker === item.ticker && 'border-blue-primary/40 bg-surface/40',
                flash?.direction === 'up' && 'bg-price-green/10',
                flash?.direction === 'down' && 'bg-price-red/10'
              )}
            >
              <span className="text-data-lg font-bold text-white w-14 shrink-0">{item.ticker}</span>
              <span className="text-data-lg font-mono text-white tabular-nums w-20 text-right shrink-0">
                {formatCurrency(item.price ?? 0)}
              </span>
              <span
                className={cn(
                  'text-data font-mono tabular-nums w-16 text-right shrink-0',
                  isUp ? 'text-price-green' : 'text-price-red'
                )}
              >
                {formatSignedPercent(item.change_percent ?? 0)}
              </span>
              <div className="ml-auto shrink-0">
                <Sparkline data={history} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
