'use client';

import { useRef, useEffect } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData, Time, ColorType } from 'lightweight-charts';
import { PriceData } from '@/lib/types';
import { formatCurrency, formatSignedPercent } from '@/lib/utils';

interface Props {
  ticker: string | null;
  data: PriceData[];
  loading?: boolean;
}

export default function MainChart({ ticker, data, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const lastTickerRef = useRef<string | null>(null);
  const dataLengthRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#10141b' },
        textColor: '#747e8d',
      },
      grid: {
        vertLines: { color: '#1a202b' },
        horzLines: { color: '#1a202b' },
      },
      crosshair: {
        vertLine: { color: '#445064', width: 1, style: 2, labelBackgroundColor: '#171d26' },
        horzLine: { color: '#445064', width: 1, style: 2, labelBackgroundColor: '#171d26' },
      },
      timeScale: {
        borderColor: '#252d3a',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#252d3a',
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const series = chart.addLineSeries({
      color: '#5b8def',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      chart.applyOptions({ width: Math.max(0, width), height: Math.max(100, height) });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) return;

    if (loading || data.length === 0) {
      seriesRef.current.setData([]);
      lastTickerRef.current = ticker;
      dataLengthRef.current = 0;
      return;
    }

    const isNewTicker = ticker !== lastTickerRef.current;
    const isNewData = data.length !== dataLengthRef.current;
    lastTickerRef.current = ticker;
    dataLengthRef.current = data.length;

    if (isNewTicker) {
      const chartData: LineData[] = data.map((d) => ({
        time: d.timestamp as Time,
        value: d.price,
      }));
      seriesRef.current.setData(chartData);
      chartRef.current?.timeScale().fitContent();
    } else if (isNewData) {
      const last = data[data.length - 1];
      seriesRef.current.update({
        time: last.timestamp as Time,
        value: last.price,
      });
    }
  }, [ticker, data, loading]);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="panel-header flex items-center justify-between px-4 py-3">
          <div className="h-5 w-32 animate-skeleton rounded bg-surface-elevated" />
          <div className="h-4 w-20 animate-skeleton rounded bg-surface-elevated" />
        </div>
        <div className="m-4 flex-1 animate-skeleton rounded-lg bg-surface-elevated" />
      </div>
    );
  }

  const latest = data.length > 0 ? data[data.length - 1] : null;
  const change = latest?.change_percent ?? 0;

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <div className="text-data font-semibold uppercase tracking-widest text-text-muted">
            Primary Market
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-lg font-bold tracking-wide text-text-primary">
              {ticker ?? 'Select a ticker'}
            </span>
            {latest && ticker && (
              <span className="font-mono text-base font-semibold text-text-primary">
                {formatCurrency(latest.price)}
              </span>
            )}
          </div>
        </div>
        {latest && (
          <div className="flex items-center gap-2">
            <span className={`rounded-md px-2 py-1 font-mono text-data font-semibold ${
              change >= 0 ? 'bg-price-green/10 text-price-green' : 'bg-price-red/10 text-price-red'
            }`}>
              {formatSignedPercent(change)}
            </span>
            <span className="rounded-md border border-border-muted bg-surface-elevated px-2 py-1 font-mono text-data text-text-muted">
              {data.length} pts
            </span>
          </div>
        )}
      </div>
      <div className="relative flex-1">
        <div ref={containerRef} className="absolute inset-0" />
        {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-text-muted">
          Waiting for live market data.
        </div>
      )}
      </div>
    </div>
  );
}
