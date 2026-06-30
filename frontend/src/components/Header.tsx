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
    <header className="flex items-center justify-between px-4 py-2 bg-background border-b border-border-muted">
      <div className="flex items-center gap-6">
        <h1 className="text-sm font-bold text-accent-yellow tracking-wide uppercase">
          FinAlly
        </h1>
        <span className="text-xs text-gray-400 hidden sm:inline">AI Trading Workstation</span>
      </div>

      <div className="flex items-center gap-6">
        {portfolio && (
          <>
            <div className="text-right">
              <div className="text-data text-gray-400">Total Value</div>
              <div className="text-data-lg font-bold text-white">
                {formatCurrency(portfolio.total_value)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-data text-gray-400">Cash</div>
              <div className="text-data-lg font-bold text-white">
                {formatCurrency(portfolio.cash_balance)}
              </div>
            </div>
            {portfolio.unrealized_pnl !== 0 && (
              <div className="text-right hidden md:block">
                <div className="text-data text-gray-400">P&L</div>
                <div
                  className={`text-data-lg font-bold ${
                    portfolio.unrealized_pnl >= 0 ? 'text-price-green' : 'text-price-red'
                  }`}
                >
                  {formatCurrency(portfolio.unrealized_pnl)}
                </div>
              </div>
            )}
          </>
        )}
        <ConnectionStatus status={connectionStatus} />
        <button
          onClick={onToggleChat}
          className="px-3 py-1 text-xs rounded bg-surface border border-border-muted text-gray-300 hover:border-accent-yellow transition-colors"
        >
          {chatOpen ? 'Close Chat' : 'AI Chat'}
        </button>
      </div>
    </header>
  );
}
