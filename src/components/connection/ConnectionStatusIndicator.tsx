import React from 'react';
import { ConnectionState } from 'livekit-client';
import { useConnectionState } from '@livekit/components-react';

interface ConnectionStatusIndicatorProps {
  className?: string;
}

const STATUS: Record<string, { text: string; dot: string; ring: string; pulse: boolean }> = {
  [ConnectionState.Connected]: {
    text: 'Ulangan',
    dot: 'bg-green-400',
    ring: 'border-green-400/30 bg-green-500/10 text-green-200',
    pulse: false,
  },
  [ConnectionState.Connecting]: {
    text: 'Ulanmoqda...',
    dot: 'bg-blue-400',
    ring: 'border-blue-400/30 bg-blue-500/10 text-blue-200',
    pulse: true,
  },
  [ConnectionState.Reconnecting]: {
    text: 'Qayta ulanmoqda...',
    dot: 'bg-amber-400',
    ring: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
    pulse: true,
  },
  [ConnectionState.Disconnected]: {
    text: 'Uzilgan',
    dot: 'bg-red-400',
    ring: 'border-red-400/30 bg-red-500/10 text-red-200',
    pulse: false,
  },
};

const FALLBACK = {
  text: 'Noma’lum',
  dot: 'bg-gray-400',
  ring: 'border-white/15 bg-white/5 text-white/60',
  pulse: false,
};

/** Compact, always-visible connection status pill (announced to screen readers). */
export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ className = '' }) => {
  const roomState = useConnectionState();
  const status = STATUS[roomState] ?? FALLBACK;

  return (
    <div className={className}>
      <div
        role="status"
        aria-live="polite"
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-xl transition-colors duration-300 ${status.ring}`}
      >
        <span className="relative flex h-2 w-2" aria-hidden>
          {status.pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${status.dot}`} />}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${status.dot}`} />
        </span>
        <span>{status.text}</span>
      </div>
    </div>
  );
};
