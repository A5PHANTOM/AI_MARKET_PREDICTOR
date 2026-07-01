'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SSEManager } from '@/lib/sse';
import { fetchPortfolio, fetchWatchlist, fetchPortfolioHistory, fetchMarketSnapshot } from '@/lib/api';
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

const ALL_TICKERS = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE', 'ADA', 'AVAX', 'DOT', 'LINK'];

export default function Home() {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [history, setHistory] = useState<PortfolioSnapshot[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<CS>(CS.Disconnected);
  const [chatOpen, setChatOpen] = useState(false);
  const [priceHistory, setPriceHistory] = useState<Map<string, PriceData[]>>(new Map());
  const [chartLoading, setChartLoading] = useState(true);
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

  // Fetch initial price snapshot to pre-load chart immediately
  useEffect(() => {
    fetchMarketSnapshot()
      .then((snapshot) => {
        const initial: Map<string, PriceData[]> = new Map();
        for (const ticker in snapshot) {
          initial.set(ticker, [snapshot[ticker]]);
        }
        setPriceHistory(initial);
      })
      .catch(() => {
        // SSE will fill in when connected
      })
      .finally(() => setChartLoading(false));
  }, []);

  useEffect(() => {
    loadPortfolio();
    loadWatchlist();
    loadHistory();

    const sse = new SSEManager();
    sseRef.current = sse;

    const unsubStatus = sse.onStatus(setConnectionStatus);
    const unsubBatch = sse.onBatch((updates: PriceData[]) => {
      setPriceHistory((prev) => {
        const next = new Map(prev);
        for (const data of updates) {
          const existing = next.get(data.ticker) || [];
          existing.push(data);
          next.set(data.ticker, existing);
        }
        return next;
      });
    });

    sse.connect();

    const portInterval = setInterval(loadPortfolio, 5000);
    const histInterval = setInterval(loadHistory, 30000);

    return () => {
      sse.disconnect();
      unsubStatus();
      unsubBatch();
      clearInterval(portInterval);
      clearInterval(histInterval);
    };
  }, [loadPortfolio, loadWatchlist, loadHistory]);

  const handleTradeComplete = useCallback(() => {
    loadPortfolio();
    loadHistory();
  }, [loadPortfolio, loadHistory]);

  const mainChartData = selectedTicker ? priceHistory.get(selectedTicker) || [] : [];
  const allTickers = priceHistory.size > 0 ? Array.from(priceHistory.keys()) : ALL_TICKERS;

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-background text-text-primary lg:overflow-hidden">
      <Header
        portfolio={portfolio}
        connectionStatus={connectionStatus}
        onToggleChat={() => setChatOpen((v) => !v)}
        chatOpen={chatOpen}
      />

      <div className="flex-1 min-h-0 relative flex flex-col lg:flex-row p-3 lg:p-4 gap-3">
        {/* Chat sidebar - always visible on desktop */}
        <aside className="hidden lg:flex lg:w-[300px] lg:shrink-0 lg:min-h-0">
          <ChatPanel open={true} onClose={() => setChatOpen(false)} sidebar />
        </aside>

        {/* Main content area */}
        <div className="flex-1 min-h-0 grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)_280px] lg:grid-rows-[minmax(0,1fr)_180px]">
          <aside className="dashboard-panel overflow-hidden rounded-lg lg:min-h-0 lg:col-start-1 lg:row-start-1 lg:row-end-3">
            <Watchlist
              items={watchlist}
              priceHistory={priceHistory}
              selectedTicker={selectedTicker}
              onSelectTicker={setSelectedTicker}
            />
          </aside>

          <main className="min-w-0 min-h-0 flex flex-col gap-2 h-full lg:col-start-2 lg:row-start-1 lg:row-end-2">
            <section className="dashboard-panel overflow-hidden rounded-lg lg:min-h-0 lg:flex-[3]">
              <MainChart ticker={selectedTicker} data={mainChartData} loading={chartLoading} />
            </section>

            <section className="dashboard-panel overflow-hidden rounded-lg lg:min-h-0 lg:flex-[2]">
              <PositionsTable positions={portfolio?.positions || []} />
            </section>
          </main>

          <aside className="overflow-hidden rounded-lg lg:min-h-0 lg:col-start-3 lg:row-start-1 lg:row-end-3">
            <TradeBar
              selectedTicker={selectedTicker}
              allTickers={allTickers}
              priceData={mainChartData}
              watchlist={watchlist}
              onTradeComplete={handleTradeComplete}
            />
          </aside>

          <div className="flex gap-2 min-h-0 lg:col-start-2 lg:row-start-2">
            <section className="dashboard-panel overflow-hidden rounded-lg flex-1">
              <PortfolioHeatmap
                positions={portfolio?.positions || []}
                totalValue={portfolio?.total_value || 0}
              />
            </section>
            <section className="dashboard-panel overflow-hidden rounded-lg flex-1">
              <PnLChart snapshots={history} />
            </section>
          </div>
        </div>

        {/* Mobile chat overlay */}
        <div className="lg:hidden">
          <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
      </div>
    </div>
  );
}
