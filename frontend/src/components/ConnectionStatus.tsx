'use client';

import { ConnectionStatus as CS } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  status: CS;
}

export default function ConnectionStatus({ status }: Props) {
  const config = {
    [CS.Connected]: {
      dot: 'bg-price-green',
      label: 'Live',
      pulse: 'animate-pulse-glow',
    },
    [CS.Reconnecting]: {
      dot: 'bg-accent-yellow',
      label: 'Reconnecting',
      pulse: '',
    },
    [CS.Disconnected]: {
      dot: 'bg-price-red',
      label: 'Offline',
      pulse: '',
    },
  };

  const c = config[status];

  return (
    <div className="flex items-center gap-2">
      <div className={cn('w-2 h-2 rounded-full transition-all duration-300', c.dot, c.pulse)} />
      <span className="text-data font-semibold uppercase tracking-wider text-text-muted">{c.label}</span>
    </div>
  );
}
