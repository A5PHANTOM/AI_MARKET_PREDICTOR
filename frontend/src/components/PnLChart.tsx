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
        background: { type: ColorType.Solid, color: '#0d1117' },
        textColor: '#8b8fa3',
      },
      grid: {
        vertLines: { color: '#1a1a2e' },
        horzLines: { color: '#1a1a2e' },
      },
      crosshair: {
        vertLine: { color: '#636785', width: 1, style: 2, labelBackgroundColor: '#1a1a2e' },
        horzLine: { color: '#636785', width: 1, style: 2, labelBackgroundColor: '#1a1a2e' },
      },
      timeScale: {
        borderColor: '#2d2d44',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#2d2d44',
      },
      width: containerRef.current.clientWidth,
      height: 200,
    });

    const series = chart.addLineSeries({
      color: '#ecad0a',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
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
    <div className="flex flex-col h-full">
      <div className="text-data text-gray-400 uppercase tracking-wider px-3 py-1">
        Portfolio Value Over Time
      </div>
      <div ref={containerRef} className="flex-1 min-h-[150px]" />
    </div>
  );
}
