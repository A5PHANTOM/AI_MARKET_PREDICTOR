'use client';

import { useMemo } from 'react';
import { Position } from '@/lib/types';
import { formatCurrency, formatSignedPercent } from '@/lib/utils';

interface Props {
  positions: Position[];
  totalValue: number;
}

interface TreemapNode {
  ticker: string;
  value: number;
  weight: number;
  pl: number;
  plPercent: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

function squarify(
  items: { ticker: string; value: number; weight: number; pl: number; plPercent: number }[],
  w: number,
  h: number
): TreemapNode[] {
  const total = items.reduce((s, i) => s + i.weight, 0);
  if (total === 0) return [];

  let nodes: TreemapNode[] = [];
  let remaining = [...items.map((i) => ({ ...i, x: 0, y: 0, w: 0, h: 0 }))];
  let cx = 0, cy = 0, cw = w, ch = h;

  function worstRatio(row: typeof remaining, side: number): number {
    if (row.length === 0 || side === 0) return Infinity;
    const sum = row.reduce((s, r) => s + r.weight, 0);
    const max = Math.max(...row.map((r) => r.weight));
    const min = Math.min(...row.map((r) => r.weight));
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  }

  function layoutRow(row: typeof remaining, isVertical: boolean) {
    const sum = row.reduce((s, r) => s + r.weight, 0);
    const depth = isVertical ? ch : cw;
    const available = isVertical ? ch : cw;

    let offset = 0;
    row.forEach((r) => {
      const size = (r.weight / sum) * available;
      r.x = isVertical ? cx : cx + offset;
      r.y = isVertical ? cy + offset : cy;
      r.w = isVertical ? depth : size;
      r.h = isVertical ? size : depth;
      offset += size;
    });

    if (isVertical) { cx += depth; cw -= depth; }
    else { cy += depth; ch -= depth; }
  }

  while (remaining.length > 0) {
    const isVertical = cw >= ch;
    const side = isVertical ? ch : cw;
    let row: typeof remaining = [];
    let rest = [...remaining];
    let bestWorst = Infinity;

    while (rest.length > 0) {
      const candidate = [...row, rest[0]];
      const wr = worstRatio(candidate, side);
      if (wr <= bestWorst) {
        bestWorst = wr;
        row = candidate;
        rest = rest.slice(1);
      } else break;
    }

    layoutRow(row, isVertical);
    nodes = nodes.concat(row);
    remaining = rest;
  }

  return nodes;
}

export default function PortfolioHeatmap({ positions, totalValue }: Props) {
  const nodes = useMemo(() => {
    if (positions.length === 0) return [];
    const items = positions.map((p) => {
      const marketValue = p.quantity * p.current_price;
      return {
        ticker: p.ticker,
        value: marketValue,
        weight: totalValue > 0 ? marketValue / totalValue : 0,
        pl: p.unrealized_pnl,
        plPercent: p.change_percent,
      };
    });
    return squarify(items, 100, 100);
  }, [positions, totalValue]);

  if (positions.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="panel-header px-4 py-3">
          <div className="text-data font-semibold uppercase tracking-widest text-text-muted">Allocation</div>
          <div className="text-sm font-semibold text-text-primary">Portfolio Heatmap</div>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-text-muted">
          No positions to display.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="panel-header flex shrink-0 items-center justify-between px-4 py-3">
        <div>
          <div className="text-data font-semibold uppercase tracking-widest text-text-muted">Allocation</div>
          <div className="text-sm font-semibold text-text-primary">Portfolio Heatmap</div>
        </div>
        <span className="font-mono text-data text-text-muted">{formatCurrency(totalValue)}</span>
      </div>
      <div className="relative m-3 flex-1">
        {nodes.map((node, i) => {
          const isPositive = node.pl >= 0;
          const intensity = Math.min(Math.abs(node.plPercent) / 50, 1);
          const bg = isPositive
            ? `rgba(56, 217, 150, ${0.12 + 0.32 * intensity})`
            : `rgba(255, 95, 122, ${0.12 + 0.32 * intensity})`;
          const borderColor = isPositive
            ? `rgba(56, 217, 150, ${0.18 + 0.28 * intensity})`
            : `rgba(255, 95, 122, ${0.18 + 0.28 * intensity})`;

          return (
            <div
              key={node.ticker}
              className="absolute flex cursor-default flex-col items-center justify-center overflow-hidden rounded-md animate-fade-in transition-all duration-200 hover:brightness-110"
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                width: `${node.w}%`,
                height: `${node.h}%`,
                backgroundColor: bg,
                border: `1px solid ${borderColor}`,
                animationDelay: `${i * 40}ms`,
              }}
            >
              <span className="text-sm font-bold leading-tight text-text-primary drop-shadow-lg">
                {node.ticker}
              </span>
              <span className={`text-data font-mono font-medium ${isPositive ? 'text-price-green' : 'text-price-red'}`}>
                {formatSignedPercent(node.plPercent)}
              </span>
              <span className="text-data text-text-muted hidden sm:block drop-shadow-lg">
                {formatCurrency(node.pl)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
