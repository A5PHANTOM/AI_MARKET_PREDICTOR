'use client';

import { PortfolioResponse, ConnectionStatus as CS } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import ConnectionStatus from './ConnectionStatus';

interface Props {
  portfolio: PortfolioResponse | null;
  connectionStatus: CS;
  onToggleChat: () => void;
  chatOpen: boolean;
}

export default function Header({ portfolio, connectionStatus, onToggleChat, chatOpen }: Props) {
  return (
    <header className="z-30 shrink-0 border-b border-border-muted bg-background/92 px-3 py-3 backdrop-blur-xl lg:px-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 rounded-lg border border-border-muted bg-surface px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-accent-yellow" />
          <h1 className="text-sm font-bold tracking-[0.18em] text-gradient-gold uppercase">
            FinAlly
          </h1>
        </div>
        <span className="hidden text-sm font-medium text-text-secondary sm:inline">
          AI Trading Terminal
        </span>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
        {portfolio && (
          <>
            <div className="metric-tile rounded-lg px-3 py-2">
              <div className="text-data font-semibold uppercase tracking-wider text-text-muted">Total Value</div>
              <div className="font-mono text-sm font-bold text-text-primary">
                {formatCurrency(portfolio.total_value)}
              </div>
            </div>
            <div className="metric-tile rounded-lg px-3 py-2">
              <div className="text-data font-semibold uppercase tracking-wider text-text-muted">Cash</div>
              <div className="font-mono text-sm font-bold text-text-primary">
                {formatCurrency(portfolio.cash_balance)}
              </div>
            </div>
            <div className="metric-tile rounded-lg px-3 py-2">
              <div className="text-data font-semibold uppercase tracking-wider text-text-muted">P&L</div>
                  <div
                className={`font-mono text-sm font-bold ${
                      portfolio.unrealized_pnl >= 0 ? 'text-price-green' : 'text-price-red'
                    }`}
                  >
                    {portfolio.unrealized_pnl >= 0 ? '+' : ''}
                    {formatCurrency(portfolio.unrealized_pnl)}
                  </div>
                </div>
          </>
        )}
        <div className="metric-tile rounded-lg px-3 py-2">
          <ConnectionStatus status={connectionStatus} />
        </div>
        <button
          onClick={onToggleChat}
          className="rounded-lg border border-border-muted bg-surface-elevated px-3.5 py-2 text-xs font-semibold text-text-secondary transition-all duration-200 hover:border-blue-primary/50 hover:text-text-primary"
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            {chatOpen ? 'Close' : 'AI Chat'}
          </span>
        </button>
      </div>
      </div>
    </header>
  );
}
