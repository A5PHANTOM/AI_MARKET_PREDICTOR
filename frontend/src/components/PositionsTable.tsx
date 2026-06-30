'use client';

import { Position } from '@/lib/types';
import { formatCurrency, formatSignedPercent, formatQuantity, cn } from '@/lib/utils';

interface Props {
  positions: Position[];
}

export default function PositionsTable({ positions }: Props) {
  if (positions.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center py-8">
        No positions yet. Start trading!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-data">
        <thead>
          <tr className="text-gray-400 border-b border-border-muted">
            <th className="text-left py-1.5 px-2 font-medium">Ticker</th>
            <th className="text-right py-1.5 px-2 font-medium">Qty</th>
            <th className="text-right py-1.5 px-2 font-medium">Avg Cost</th>
            <th className="text-right py-1.5 px-2 font-medium">Price</th>
            <th className="text-right py-1.5 px-2 font-medium">Market Value</th>
            <th className="text-right py-1.5 px-2 font-medium">P&L</th>
            <th className="text-right py-1.5 px-2 font-medium">%</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => {
            const marketValue = pos.quantity * pos.current_price;
            return (
            <tr key={pos.ticker} className="border-b border-border-muted/50 hover:bg-surface/30">
              <td className="py-1.5 px-2 font-bold text-white">{pos.ticker}</td>
              <td className="py-1.5 px-2 text-right font-mono text-gray-300">
                {formatQuantity(pos.quantity)}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-gray-300">
                {formatCurrency(pos.avg_cost)}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-gray-300">
                {formatCurrency(pos.current_price)}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-gray-300">
                {formatCurrency(marketValue)}
              </td>
              <td
                className={cn(
                  'py-1.5 px-2 text-right font-mono',
                  pos.unrealized_pnl >= 0 ? 'text-price-green' : 'text-price-red'
                )}
              >
                {formatCurrency(pos.unrealized_pnl)}
              </td>
              <td
                className={cn(
                  'py-1.5 px-2 text-right font-mono',
                  pos.unrealized_pnl >= 0 ? 'text-price-green' : 'text-price-red'
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
  );
}
