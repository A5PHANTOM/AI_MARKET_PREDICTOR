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

function squarify(items: { ticker: string; value: number; weight: number; pl: number; plPercent: number }[], w: number, h: number): TreemapNode[] {
  const total = items.reduce((s, i) => s + i.weight, 0);
  if (total === 0) return [];

  let nodes: TreemapNode[] = [];
  let remaining = items.map((i) => ({ ...i, x: 0, y: 0, w: 0, h: 0 }));
  let cx = 0;
  let cy = 0;
  let cw = w;
  let ch = h;

  function worstRatio(row: typeof remaining, side: number): number {
    if (row.length === 0 || side === 0) return Infinity;
    const sum = row.reduce((s, r) => s + r.weight, 0);
    const max = Math.max(...row.map((r) => r.weight));
    const min = Math.min(...row.map((r) => r.weight));
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  }

  function layoutRow(row: typeof remaining, isVertical: boolean) {
    const sum = row.reduce((s, r) => s + r.weight, 0);
    const available = isVertical ? ch : cw;
    const rowSize = (sum / total) * (isVertical ? ch + cw : cw + ch);
    const depth = isVertical ? ch : cw;

    let offset = 0;
    row.forEach((r) => {
      const size = (r.weight / sum) * available;
      r.x = isVertical ? cx : cx + offset;
      r.y = isVertical ? cy + offset : cy;
      r.w = isVertical ? depth : size;
      r.h = isVertical ? size : depth;
      offset += size;
    });

    if (isVertical) {
      cx += depth;
      cw -= depth;
    } else {
      cy += depth;
      ch -= depth;
    }
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
      } else {
        break;
      }
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
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No positions to display
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[200px]">
      {nodes.map((node) => {
        const isPositive = node.pl >= 0;
        const intensity = Math.min(Math.abs(node.plPercent) / 50, 1);
        const r = isPositive ? Math.floor(0 + (0 - 0) * intensity) : Math.floor(255 - (255 - 255) * intensity);
        const g = isPositive ? Math.floor(200 - (200 - 80) * intensity) : Math.floor(80 - (80 - 0) * intensity);
        const b = isPositive ? Math.floor(83 - (83 - 0) * intensity) : Math.floor(68 - (68 - 68) * intensity);
        const bg = isPositive
          ? `rgba(0, ${Math.floor(200 - 120 * intensity)}, ${Math.floor(83 - 83 * intensity)}, ${0.3 + 0.5 * intensity})`
          : `rgba(${Math.floor(255 - 0 * intensity)}, ${Math.floor(68 - 68 * intensity)}, ${Math.floor(68 - 68 * intensity)}, ${0.3 + 0.5 * intensity})`;

        return (
          <div
            key={node.ticker}
            className="absolute flex flex-col items-center justify-center overflow-hidden rounded border border-border-muted cursor-default transition-opacity hover:opacity-80"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              width: `${node.w}%`,
              height: `${node.h}%`,
              backgroundColor: bg,
            }}
          >
            <span className="text-data-lg font-bold text-white leading-tight">{node.ticker}</span>
            <span className={`text-data font-mono ${isPositive ? 'text-price-green' : 'text-price-red'}`}>
              {formatSignedPercent(node.plPercent)}
            </span>
            <span className="text-data text-gray-400 hidden sm:block">
              {formatCurrency(node.pl)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
