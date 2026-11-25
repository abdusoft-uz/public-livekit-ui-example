import React from 'react';
import type { ChatMessage } from './types';
import { MetricsPanel } from './MetricsPanel';
import { formatMs, hasPipelineMetrics } from './metrics';

function UserMeta({ message }: { message: ChatMessage }) {
  const l = message.latency;
  if (!l) return null;
  const items = [
    l.vad ? { label: 'VAD', value: l.vad } : null,
    l.stt ? { label: 'STT', value: l.stt } : null,
    l.userSpeechDuration ? { label: 'Nutq', value: l.userSpeechDuration } : null,
    l.total ? { label: 'Javob', value: l.total } : null,
  ].filter(Boolean) as Array<{ label: string; value: number }>;
  if (items.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white/70">
      {items.map((i) => (
        <span key={i.label}>
          {i.label} <span className="font-mono">{formatMs(i.value)}</span>
        </span>
      ))}
    </div>
  );
}

export const ChatMessageItem = React.memo(function ChatMessageItem({
  message,
  isLatestAgent,
  isSpeaking,
}: {
  message: ChatMessage;
  isLatestAgent: boolean;
  isSpeaking: boolean;
}) {
  const isUser = message.type === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`au-rise flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          isUser ? 'bg-white/10 text-white/70' : 'bg-gradient-to-br from-blue-500 to-cyan-400 text-white'
        }`}
        aria-hidden
      >
        {isUser ? 'S' : 'AI'}
      </div>
      <div className={`flex min-w-0 max-w-[88%] flex-col gap-1 sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 shadow-lg ${
            isUser
              ? 'rounded-br-md bg-gradient-to-br from-blue-500 to-blue-600 text-white'
              : `rounded-bl-md border bg-white/10 text-white/95 backdrop-blur-md ${
                  isSpeaking ? 'border-cyan-300/50' : 'border-white/10'
                }`
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
          {isUser ? (
            <UserMeta message={message} />
          ) : (
            hasPipelineMetrics(message.latency) && (
              <MetricsPanel latency={message.latency!} defaultOpen={isLatestAgent} />
            )
          )}
        </div>
        <div className="flex items-center gap-1.5 px-1 text-[11px] text-white/40">
          <span>{isUser ? 'Siz' : 'Agent'}</span>
          <span aria-hidden>&middot;</span>
          <time dateTime={new Date(message.timestamp).toISOString()}>{time}</time>
        </div>
      </div>
    </div>
  );
});
