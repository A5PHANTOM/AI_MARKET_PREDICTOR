'use client';

import { useRef, useEffect } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData, Time, ColorType } from 'lightweight-charts';
import { PortfolioSnapshot } from '@/lib/types';

interface Props {
  snapshots: PortfolioSnapshot[];
}

export default function PnLChart({ snapshots }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

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
      color: '#d9ad45',
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
      chart.applyOptions({ width: Math.max(0, width), height: Math.max(80, height) });
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
    if (!seriesRef.current || snapshots.length === 0) return;

    const chartData: LineData[] = snapshots.map((s) => ({
      time: (Math.floor(new Date(s.recorded_at).getTime() / 1000) as Time),
      value: s.total_value,
    }));

    seriesRef.current.setData(chartData);
    chartRef.current?.timeScale().fitContent();
  }, [snapshots]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="panel-header flex shrink-0 items-center justify-between px-4 py-3">
        <div>
          <div className="text-data font-semibold uppercase tracking-widest text-text-muted">Performance</div>
          <div className="text-sm font-semibold text-text-primary">Portfolio Value</div>
        </div>
        <span className="font-mono text-data text-text-muted">{snapshots.length} snapshots</span>
      </div>
      <div className="relative flex-1">
        <div ref={containerRef} className="absolute inset-0" />
        {snapshots.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-text-muted">
          No history yet.
        </div>
      )}
      </div>
    </div>
  );
}
