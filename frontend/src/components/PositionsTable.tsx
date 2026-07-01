'use client';

import { Position } from '@/lib/types';
import { formatCurrency, formatSignedPercent, formatQuantity, cn } from '@/lib/utils';

interface Props {
  positions: Position[];
}

export default function PositionsTable({ positions }: Props) {
  if (positions.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="panel-header px-4 py-3">
          <div className="text-data font-semibold uppercase tracking-widest text-text-muted">Portfolio</div>
          <div className="text-sm font-semibold text-text-primary">Open Positions</div>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 text-sm text-text-muted">
          <div className="text-center">
            <div className="mb-2 text-2xl opacity-30">○</div>
            No positions yet. Place an order to build your portfolio.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="panel-header flex shrink-0 items-center justify-between px-4 py-3">
        <div>
          <div className="text-data font-semibold uppercase tracking-widest text-text-muted">Portfolio</div>
          <div className="text-sm font-semibold text-text-primary">Open Positions</div>
        </div>
        <span className="rounded-md border border-border-muted bg-surface-elevated px-2 py-1 font-mono text-data text-text-muted">
          {positions.length} active
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[760px] text-data">
          <thead>
            <tr className="border-b border-border-muted bg-surface/60 text-text-muted">
              <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider">Ticker</th>
              <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-wider">Qty</th>
              <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-wider">Avg Cost</th>
              <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-wider">Price</th>
              <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-wider">Market Value</th>
              <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-wider">P&L</th>
              <th className="px-4 py-2.5 text-right font-semibold uppercase tracking-wider">%</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos, i) => {
              const marketValue = pos.quantity * pos.current_price;
              const isPositive = pos.unrealized_pnl >= 0;
              return (
                <tr
                  key={pos.ticker}
                  className="animate-fade-in border-b border-border-muted/45 transition-colors duration-100 hover:bg-surface-elevated/60"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <td className="px-4 py-2.5 font-bold text-text-primary">{pos.ticker}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {formatQuantity(pos.quantity)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {formatCurrency(pos.avg_cost)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {formatCurrency(pos.current_price)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {formatCurrency(marketValue)}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right font-mono font-medium',
                      isPositive ? 'text-price-green' : 'text-price-red'
                    )}
                  >
                    {isPositive ? '+' : ''}{formatCurrency(pos.unrealized_pnl)}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right font-mono font-medium',
                      isPositive ? 'text-price-green' : 'text-price-red'
                    )}
                  >
                    {formatSignedPercent(pos.change_percent)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
