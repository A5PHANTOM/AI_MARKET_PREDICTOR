'use client';

import { useRef, useEffect } from 'react';
import { PriceData } from '@/lib/types';

interface Props {
  data: PriceData[];
  width?: number;
  height?: number;
  color?: string;
  upColor?: string;
  downColor?: string;
}

export default function Sparkline({
  data,
  width = 56,
  height = 18,
  color,
  upColor = '#38d996',
  downColor = '#ff5f7a',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const isUp = prices[prices.length - 1] >= prices[0];
    const strokeColor = color || (isUp ? upColor : downColor);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const padding = 1;
    for (let i = 0; i < prices.length; i++) {
      const x = (i / (prices.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((prices[i] - min) / range) * (height - padding * 2) - padding;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (prices.length >= 2) {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, strokeColor.replace(')', ', 0.15)').replace('rgb', 'rgba'));
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.lineTo(
        ((prices.length - 1) / (prices.length - 1)) * (width - padding * 2) + padding,
        height
      );
      ctx.lineTo(padding, height);
      ctx.closePath();
      ctx.fill();
    }
  }, [data, width, height, color, upColor, downColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="inline-block"
    />
  );
}
