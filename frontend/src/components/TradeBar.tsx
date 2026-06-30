'use client';

import { useState } from 'react';
import { executeTrade } from '@/lib/api';

interface Props {
  selectedTicker: string | null;
  onTradeComplete: () => void;
}

export default function TradeBar({ selectedTicker, onTradeComplete }: Props) {
  const [ticker, setTicker] = useState(selectedTicker || '');
  const [quantity, setQuantity] = useState('10');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const handleTrade = async (side: 'buy' | 'sell') => {
    const t = ticker.trim().toUpperCase();
    const q = parseFloat(quantity);
    if (!t) {
      setMessage('Enter a ticker');
      setError(true);
      return;
    }
    if (isNaN(q) || q <= 0) {
      setMessage('Enter a valid quantity');
      setError(true);
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await executeTrade({ ticker: t, quantity: q, side });
      if (res.success) {
        setMessage(`Executed: ${side} ${q} ${t} @ $${res.price}`);
        setError(false);
      } else {
        setMessage(res.error || 'Trade failed');
        setError(true);
      }
      onTradeComplete();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Trade failed';
      setMessage(msg);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-2 p-3 border-t border-border-muted">
      <div className="flex flex-col gap-1">
        <label className="text-data text-gray-400">Ticker</label>
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder={selectedTicker || 'AAPL'}
          className="w-20 px-2 py-1 text-data-lg bg-background border border-border-muted rounded text-white font-mono uppercase focus:outline-none focus:border-blue-primary"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-data text-gray-400">Quantity</label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          min="0"
          step="1"
          className="w-20 px-2 py-1 text-data-lg bg-background border border-border-muted rounded text-white font-mono focus:outline-none focus:border-blue-primary"
        />
      </div>
      <button
        onClick={() => handleTrade('buy')}
        disabled={loading}
        className="px-4 py-1.5 text-data-lg font-bold text-white bg-purple-secondary rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        Buy
      </button>
      <button
        onClick={() => handleTrade('sell')}
        disabled={loading}
        className="px-4 py-1.5 text-data-lg font-bold text-white bg-price-red rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        Sell
      </button>
      {message && (
        <span
          className={`text-data ml-2 ${
            error ? 'text-price-red' : 'text-price-green'
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
