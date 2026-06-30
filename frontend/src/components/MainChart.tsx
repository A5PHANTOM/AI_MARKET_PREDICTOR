'use client';

import { useRef, useEffect } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData, Time, ColorType } from 'lightweight-charts';
import { PriceData } from '@/lib/types';

interface Props {
  ticker: string | null;
  data: PriceData[];
}

export default function MainChart({ ticker, data }: Props) {
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
      height: 300,
    });

    const series = chart.addLineSeries({
      color: '#209dd7',
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
    if (!seriesRef.current) return;
    if (data.length === 0) {
      seriesRef.current.setData([]);
      return;
    }

    const chartData: LineData[] = data.map((d) => ({
      time: (d.timestamp as Time),
      value: d.price,
    }));

    seriesRef.current.setData(chartData);
    chartRef.current?.timeScale().fitContent();
  }, [ticker, data]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1">
        <span className="text-data-lg font-bold text-white">
          {ticker ?? 'Select a ticker'}
        </span>
        {data.length > 0 && (
          <span className="text-data text-gray-400">
            {data.length} updates
          </span>
        )}
      </div>
      <div ref={containerRef} className="flex-1 min-h-[250px]" />
    </div>
  );
}
