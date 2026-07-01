'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { executeTrade } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { WatchlistItem, PriceData } from '@/lib/types';

interface Props {
  selectedTicker: string | null;
  allTickers: string[];
  priceData: PriceData[];
  watchlist: WatchlistItem[];
  onTradeComplete: () => void;
}

export default function TradeBar({
  selectedTicker,
  allTickers,
  priceData,
  watchlist,
  onTradeComplete,
}: Props) {
  const [ticker, setTicker] = useState(selectedTicker || '');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentPrice = priceData.length > 0 ? priceData[priceData.length - 1].price : null;

  const suggestions = useMemo(() => {
    const q = ticker.toUpperCase();
    if (!q) return allTickers.slice(0, 10);
    return allTickers.filter((t) => t.startsWith(q)).slice(0, 10);
  }, [ticker, allTickers]);

  // Sync with selectedTicker prop
  useEffect(() => {
    if (selectedTicker && !ticker) {
      setTicker(selectedTicker);
    }
  }, [selectedTicker, ticker]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleTrade = useCallback(async (side: 'buy' | 'sell') => {
    const t = (ticker || selectedTicker || '').trim().toUpperCase();
    const q = parseFloat(quantity);
    if (!t) {
      setMessage({ text: 'Enter a ticker symbol', isError: true });
      return;
    }
    if (isNaN(q) || q <= 0) {
      setMessage({ text: 'Enter a valid quantity', isError: true });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await executeTrade({ ticker: t, quantity: q, side });
      if (res.success) {
        setMessage({
          text: `${side.toUpperCase()} ${q} ${t} @ ${formatCurrency(res.price)}`,
          isError: false,
        });
      } else {
        setMessage({ text: res.error || 'Trade failed', isError: true });
      }
      onTradeComplete();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Trade failed';
      setMessage({ text: msg, isError: true });
    } finally {
      setLoading(false);
    }
  }, [ticker, selectedTicker, quantity, onTradeComplete]);

  const handleSelectTicker = useCallback((t: string) => {
    setTicker(t);
    setShowDropdown(false);
    inputRef.current?.focus();
  }, []);

  const estimatedValue = useMemo(() => {
    const q = parseFloat(quantity);
    if (!currentPrice || isNaN(q) || q <= 0) return null;
    return q * currentPrice;
  }, [quantity, currentPrice]);

  const displayTicker = ticker || selectedTicker || '';
  const isPriceUp = currentPrice && priceData.length >= 2
    ? currentPrice >= priceData[priceData.length - 2].price
    : null;

  return (
    <div className="dashboard-panel flex h-full flex-col overflow-hidden rounded-lg">
        {/* Header with ticker + price */}
        <div className="panel-header flex items-start justify-between gap-3 px-4 py-3">
          <div>
            <div className="text-data font-semibold uppercase tracking-widest text-text-muted">Order Ticket</div>
            {displayTicker ? (
              <div className="mt-1">
                <span className="text-lg font-bold tracking-wide text-text-primary">{displayTicker}</span>
                {currentPrice && (
                  <span className={`ml-2 font-mono text-sm font-semibold ${
                    isPriceUp === null ? 'text-text-primary' :
                    isPriceUp ? 'text-price-green' : 'text-price-red'
                  }`}>
                    {formatCurrency(currentPrice)}
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-1 text-sm font-semibold text-text-primary">Select a ticker</div>
            )}
          </div>
          <div className="rounded-md border border-blue-primary/30 bg-blue-primary/10 p-2 text-blue-primary">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-between p-4">
        <div className="space-y-4">
        {/* Ticker input with dropdown */}
        <div>
          <div className="relative">
            <label className="mb-1.5 block text-data font-semibold uppercase tracking-wider text-text-muted">Ticker</label>
            <input
              ref={inputRef}
              type="text"
              value={ticker}
              onChange={(e) => {
                setTicker(e.target.value.toUpperCase());
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Type ticker"
              className="w-full rounded-md border border-border-muted bg-surface px-3 py-2.5 font-mono text-sm uppercase text-text-primary transition-all placeholder:text-text-muted focus:border-blue-primary/55 focus:outline-none focus:ring-2 focus:ring-blue-primary/10"
            />
            {showDropdown && suggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute left-0 right-0 top-full z-20 mt-1 max-h-44 overflow-y-auto rounded-md border border-border-muted bg-surface shadow-2xl"
              >
                {suggestions.map((t) => {
                  const inWatchlist = watchlist.find((w) => w.ticker === t);
                  const change = inWatchlist?.change_percent;
                  return (
                    <button
                      key={t}
                      onClick={() => handleSelectTicker(t)}
                      className="flex w-full items-center justify-between px-3 py-2 font-mono text-sm text-text-primary transition-colors hover:bg-surface-elevated"
                    >
                      <span className="font-semibold">{t}</span>
                      {change !== null && change !== undefined && (
                        <span className={change >= 0 ? 'text-price-green' : 'text-price-red'}>
                          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quantity input */}
        <div>
          <label className="mb-1.5 block text-data font-semibold uppercase tracking-wider text-text-muted">Quantity</label>
          <div>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="0"
              step="any"
              placeholder="0.00"
              className="w-full rounded-md border border-border-muted bg-surface px-3 py-2.5 font-mono text-sm text-text-primary transition-all placeholder:text-text-muted focus:border-blue-primary/55 focus:outline-none focus:ring-2 focus:ring-blue-primary/10"
            />
          </div>
          {estimatedValue !== null && (
            <div className="mt-2 flex items-center justify-between rounded-md border border-border-muted bg-surface/70 px-3 py-2">
              <span className="text-data font-semibold uppercase tracking-wider text-text-muted">Estimated Notional</span>
              <span className="font-mono text-sm text-text-primary">{formatCurrency(estimatedValue)}</span>
            </div>
          )}
        </div>
        </div>

        {/* Buy / Sell buttons */}
        <div className="mt-5">
        <div className="flex gap-2">
          <button
            onClick={() => handleTrade('buy')}
            disabled={loading}
            className="flex-1 rounded-md border border-price-green/30 bg-price-green/10 py-2.5 text-sm font-bold text-price-green transition-all duration-150 hover:bg-price-green/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Buy {displayTicker}
          </button>
          <button
            onClick={() => handleTrade('sell')}
            disabled={loading}
            className="flex-1 rounded-md border border-price-red/30 bg-price-red/10 py-2.5 text-sm font-bold text-price-red transition-all duration-150 hover:bg-price-red/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sell {displayTicker}
          </button>
        </div>

        {/* Loading / Message */}
        {(loading || message) && (
          <div className="pt-3">
            {loading ? (
              <div className="flex items-center justify-center gap-1.5 py-1">
                <div className="w-1.5 h-1.5 bg-blue-primary rounded-full animate-bounce-dot" />
                <div className="w-1.5 h-1.5 bg-purple-secondary rounded-full animate-bounce-dot" style={{ animationDelay: '0.15s' }} />
                <div className="w-1.5 h-1.5 bg-blue-primary rounded-full animate-bounce-dot" style={{ animationDelay: '0.3s' }} />
              </div>
            ) : (
              <div className={`rounded-md border px-3 py-2 text-center text-data font-semibold ${
                message?.isError ? 'text-price-red' : 'text-price-green'
              }`}>
                {message?.text}
              </div>
            )}
          </div>
        )}
        </div>
        </div>
    </div>
  );
}
