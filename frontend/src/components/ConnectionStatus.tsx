'use client';

import { ConnectionStatus as CS } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  status: CS;
}

export default function ConnectionStatus({ status }: Props) {
  const colorMap: Record<CS, string> = {
    [CS.Connected]: 'bg-price-green shadow-[0_0_6px_#00c853]',
    [CS.Reconnecting]: 'bg-accent-yellow shadow-[0_0_6px_#ecad0a]',
    [CS.Disconnected]: 'bg-price-red shadow-[0_0_6px_#ff1744]',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'w-2 h-2 rounded-full transition-colors duration-300',
          colorMap[status]
        )}
      />
      <span className="text-data text-gray-400">
        {status === CS.Connected
          ? 'Live'
          : status === CS.Reconnecting
          ? 'Reconnecting'
          : 'Offline'}
      </span>
    </div>
  );
}
