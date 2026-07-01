'use client';

import { memo, useCallback, useRef, useEffect, useState } from 'react';
import { PriceData, WatchlistItem } from '@/lib/types';
import { formatCurrency, formatSignedPercent, cn } from '@/lib/utils';
import Sparkline from './Sparkline';

interface Props {
  items: WatchlistItem[];
  priceHistory: Map<string, PriceData[]>;
  selectedTicker: string | null;
  onSelectTicker: (ticker: string) => void;
}

interface WatchlistRowProps {
  item: WatchlistItem;
  history: PriceData[];
  isSelected: boolean;
  onSelect: (ticker: string) => void;
}

const WatchlistRow = memo(function WatchlistRow({
  item,
  history,
  isSelected,
  onSelect,
}: WatchlistRowProps) {
  const isUp = (item.change ?? 0) >= 0;

  return (
    <button
      onClick={() => onSelect(item.ticker)}
      className={cn(
        'group flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-all duration-150',
        isSelected
          ? 'border-blue-primary/45 bg-blue-primary/10 shadow-[inset_3px_0_0_rgba(91,141,239,0.85)]'
          : 'border-transparent hover:border-border-muted hover:bg-surface-elevated/70'
      )}
    >
      <div className="flex w-12 shrink-0 flex-col">
        <span className="text-sm font-bold tracking-wide text-text-primary">{item.ticker}</span>
        <span className={cn(
          'font-mono text-data tabular-nums',
          isUp ? 'text-price-green' : 'text-price-red'
        )}>
          {formatSignedPercent(item.change_percent ?? 0)}
        </span>
      </div>
      <span className={cn(
        'flex-1 text-right font-mono text-sm tabular-nums',
        isUp ? 'text-price-green' : 'text-price-red'
      )}>
        {formatCurrency(item.price ?? 0)}
      </span>
      <div className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
        <Sparkline data={history} />
      </div>
    </button>
  );
});

export default function Watchlist({ items, priceHistory, selectedTicker, onSelectTicker }: Props) {
  const [flashStates, setFlashStates] = useState<Map<string, 'up' | 'down'>>(new Map());
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const prevPrices = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    for (const item of items) {
      const ticker = item.ticker;
      const current = item.price;
      const prev = prevPrices.current.get(ticker);
      if (prev !== undefined && current !== null && prev !== null && current !== prev) {
        const direction = current > prev ? 'up' : 'down';
        setFlashStates((prevMap) => {
          const next = new Map(prevMap);
          next.set(ticker, direction);
          return next;
        });
        const existing = flashTimers.current.get(ticker);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          setFlashStates((prevMap) => {
            const n = new Map(prevMap);
            n.delete(ticker);
            return n;
          });
          flashTimers.current.delete(ticker);
        }, 600);
        flashTimers.current.set(ticker, timer);
      }
      if (current !== null) {
        prevPrices.current.set(ticker, current);
      }
    }
  }, [items, priceHistory]);

  useEffect(() => {
    return () => {
      flashTimers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const handleSelect = useCallback((ticker: string) => {
    onSelectTicker(ticker);
  }, [onSelectTicker]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="panel-header flex shrink-0 items-center justify-between px-4 py-3">
        <div>
          <div className="text-data font-semibold uppercase tracking-widest text-text-muted">
            Markets
          </div>
          <div className="text-sm font-semibold text-text-primary">Watchlist</div>
        </div>
        <span className="rounded-md border border-border-muted bg-surface-elevated px-2 py-1 font-mono text-data text-text-muted">
          {items.length}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {items.length === 0 && (
          <div className="flex h-full items-center justify-center px-6 text-center text-xs leading-relaxed text-text-muted">
            Add a ticker from chat or trade search to start tracking live prices.
          </div>
        )}
        <div className="flex flex-col gap-1">
        {items.map((item) => {
          const flash = flashStates.get(item.ticker);
          return (
            <div
              key={item.ticker}
              className={cn(
                flash === 'up' && 'animate-flash-green rounded-lg',
                flash === 'down' && 'animate-flash-red rounded-lg'
              )}
            >
              <WatchlistRow
                item={item}
                history={priceHistory.get(item.ticker) || []}
                isSelected={selectedTicker === item.ticker}
                onSelect={handleSelect}
              />
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
