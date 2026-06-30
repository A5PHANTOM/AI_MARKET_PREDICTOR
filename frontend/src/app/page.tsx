'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SSEManager } from '@/lib/sse';
import { fetchPortfolio, fetchWatchlist, fetchPortfolioHistory } from '@/lib/api';
import {
  PortfolioResponse,
  WatchlistItem,
  PortfolioSnapshot,
  PriceData,
  ConnectionStatus as CS,
} from '@/lib/types';
import Header from '@/components/Header';
import Watchlist from '@/components/Watchlist';
import MainChart from '@/components/MainChart';
import PortfolioHeatmap from '@/components/PortfolioHeatmap';
import PnLChart from '@/components/PnLChart';
import PositionsTable from '@/components/PositionsTable';
import TradeBar from '@/components/TradeBar';
import ChatPanel from '@/components/ChatPanel';

export default function Home() {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [history, setHistory] = useState<PortfolioSnapshot[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<CS>(CS.Disconnected);
  const [chatOpen, setChatOpen] = useState(false);
  const [priceHistory, setPriceHistory] = useState<Map<string, PriceData[]>>(new Map());
  const sseRef = useRef<SSEManager | null>(null);

  const loadPortfolio = useCallback(async () => {
    try {
      const data = await fetchPortfolio();
      setPortfolio(data);
    } catch {
      // retry on next interval
    }
  }, []);

  const loadWatchlist = useCallback(async () => {
    try {
      const data: WatchlistItem[] = await fetchWatchlist();
      setWatchlist(data);
      if (data.length > 0 && !selectedTicker) {
        setSelectedTicker(data[0].ticker);
      }
    } catch {
      // retry on next interval
    }
  }, [selectedTicker]);

  const loadHistory = useCallback(async () => {
    try {
      const data: PortfolioSnapshot[] = await fetchPortfolioHistory();
      setHistory(data);
    } catch {
      // retry on next interval
    }
  }, []);

  useEffect(() => {
    loadPortfolio();
    loadWatchlist();
    loadHistory();

    const sse = new SSEManager();
    sseRef.current = sse;

    const unsubStatus = sse.onStatus(setConnectionStatus);
    const unsubPrice = sse.onPrice((data: PriceData) => {
      setPriceHistory((prev) => {
        const next = new Map(prev);
        const existing = next.get(data.ticker) || [];
        next.set(data.ticker, [...existing, data]);
        return next;
      });
    });

    sse.connect();

    const portInterval = setInterval(loadPortfolio, 5000);
    const histInterval = setInterval(loadHistory, 30000);

    return () => {
      sse.disconnect();
      unsubStatus();
      unsubPrice();
      clearInterval(portInterval);
      clearInterval(histInterval);
    };
  }, [loadPortfolio, loadWatchlist, loadHistory]);

  const handleTradeComplete = useCallback(() => {
    loadPortfolio();
    loadHistory();
  }, [loadPortfolio, loadHistory]);

  const mainChartData = selectedTicker ? priceHistory.get(selectedTicker) || [] : [];

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header
        portfolio={portfolio}
        connectionStatus={connectionStatus}
        onToggleChat={() => setChatOpen((v) => !v)}
        chatOpen={chatOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-60 shrink-0 overflow-y-auto border-r border-border-muted bg-surface/20">
          <Watchlist
            items={watchlist}
            priceHistory={priceHistory}
            selectedTicker={selectedTicker}
            onSelectTicker={setSelectedTicker}
          />
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <section className="flex-1 min-h-0 border-b border-border-muted">
            <MainChart ticker={selectedTicker} data={mainChartData} />
          </section>

          <section className="shrink-0 border-b border-border-muted">
            <TradeBar
              selectedTicker={selectedTicker}
              onTradeComplete={handleTradeComplete}
            />
          </section>

          <section className="flex-1 min-h-0 overflow-y-auto">
            <PositionsTable positions={portfolio?.positions || []} />
          </section>
        </main>

        <ChatPanel open={chatOpen} />
      </div>

      <div className="shrink-0 flex border-t border-border-muted" style={{ height: '200px' }}>
        <div className="flex-1 min-w-0 border-r border-border-muted">
          <PortfolioHeatmap
            positions={portfolio?.positions || []}
            totalValue={portfolio?.total_value || 0}
          />
        </div>
        <div className="flex-1 min-w-0">
          <PnLChart snapshots={history} />
        </div>
      </div>
    </div>
  );
}
