"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { LocalParticipant, RemoteParticipant, TrackPublication } from 'livekit-client';
import { debug } from "@/utils/logger";
import { ChatMessageItem } from './ChatMessageItem';
import {
  AgentEvent,
  PipelineMetrics,
  applyAgentReply,
  applyAgentSpeech,
  applyMetrics,
  applyUserSpeech,
  extractReplyText,
  parseMetrics,
  prepareMessages,
} from './chatEvents';
import type { AgentActivity, ChatMessage } from './types';

export type { ChatMessage, LatencyMetrics } from './types';

interface ChatWindowProps {
  className?: string;
  /** An agent participant is present in the room */
  agentConnected?: boolean;
  /** The agent's audio is currently active */
  agentSpeaking?: boolean;
}

const ACTIVITY_LABEL: Record<AgentActivity, string> = {
  idle: 'Agent kutilmoqda',
  listening: 'Tinglayapti',
  thinking: 'O‘ylayapti',
  speaking: 'Gapiryapti',
};

function ActivityBadge({ activity }: { activity: AgentActivity }) {
  const color =
    activity === 'speaking'
      ? 'border-cyan-300/40 bg-cyan-400/15 text-cyan-200'
      : activity === 'thinking'
      ? 'border-amber-300/40 bg-amber-400/15 text-amber-200'
      : activity === 'listening'
      ? 'border-green-300/40 bg-green-400/15 text-green-200'
      : 'border-white/15 bg-white/5 text-white/50';
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${color}`}
      role="status"
    >
      {activity === 'speaking' ? (
        <span className="au-eq" aria-hidden>
          <span /><span /><span /><span />
        </span>
      ) : (
        <span
          className={`h-1.5 w-1.5 rounded-full bg-current ${activity === 'idle' ? '' : 'animate-pulse'}`}
          aria-hidden
        />
      )}
      {ACTIVITY_LABEL[activity]}
    </span>
  );
}

function EmptyState({ agentConnected }: { agentConnected: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
      <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-400/20 ring-1 ring-white/15">
        <span className="absolute inset-0 animate-ping rounded-full bg-blue-400/10" aria-hidden />
        <svg className="relative h-9 w-9 text-white/80" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 1.75a3 3 0 00-3 3v6.5a3 3 0 006 0v-6.5a3 3 0 00-3-3zM19 10.5v.75a7 7 0 01-14 0v-.75M12 18.25v3.5" />
        </svg>
      </div>
      <h4 className="text-base font-semibold text-white/90">Suhbatni boshlang</h4>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-white/60">
        Mikrofon orqali gapiring. Nutqingiz matnga aylantiriladi va agent javobi shu yerda paydo bo&#8216;ladi.
      </p>
      <p className="mt-4 flex items-center gap-2 text-xs text-white/40">
        <span
          className={`h-1.5 w-1.5 rounded-full ${agentConnected ? 'bg-green-400' : 'animate-pulse bg-amber-400'}`}
          aria-hidden
        />
        {agentConnected ? 'Agent tayyor' : 'Agent kutilmoqda...'}
      </p>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="au-rise flex items-end gap-2" aria-label="Agent javob tayyorlamoqda">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-[10px] font-bold text-white" aria-hidden>
        AI
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-white/10 bg-white/10 px-4 py-3.5 backdrop-blur-md">
        <span className="au-typing-dot" />
        <span className="au-typing-dot" />
        <span className="au-typing-dot" />
      </div>
    </div>
  );
}

export function ChatWindow({ className = '', agentConnected = false, agentSpeaking = false }: ChatWindowProps) {
  const room = useRoomContext();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filtered, de-duplicated and ordered messages
  const sortedMessages = useMemo(() => prepareMessages(messages), [messages]);

  // Timing ref (not rendered, so no re-render on change)
  const lastUserSpeechTimeRef = useRef<number | null>(null);
  // Pipeline metrics by conversation_id (insertion order = arrival order)
  const pipelineMetricsRef = useRef<Map<string, PipelineMetrics>>(new Map());

  const lastMessage = sortedMessages[sortedMessages.length - 1];
  const activity: AgentActivity = !agentConnected
    ? 'idle'
    : agentSpeaking
    ? 'speaking'
    : lastMessage?.type === 'user'
    ? 'thinking'
    : 'listening';

  const lastAgentId = useMemo(() => {
    for (let i = sortedMessages.length - 1; i >= 0; i--) {
      if (sortedMessages[i].type === 'agent') return sortedMessages[i].id;
    }
    return null;
  }, [sortedMessages]);

  // Auto-scroll to the bottom on new messages or when the typing bubble appears
  const isThinking = activity === 'thinking';
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    messagesEndRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' });
  }, [sortedMessages, isThinking]);

  // Listen for STT / reply / metrics events that the agent sends over the data channel
  useEffect(() => {
    if (!room) return;

    const latestConversationId = () => Array.from(pipelineMetricsRef.current.values()).pop()?.conversationId;

    const handleDataReceived = (payload: Uint8Array) => {
      try {
        const data: AgentEvent = JSON.parse(new TextDecoder().decode(payload));
        debug('[ChatWindow] Data received from agent:', data?.type);

        // User speech transcription (server-side STT)
        if (data.type === 'user_speech' && data.text) {
          const text = String(data.text).trim();
          if (!text) return;
          lastUserSpeechTimeRef.current = Date.now();
          const conversationId = latestConversationId();
          setMessages((prev) => applyUserSpeech(prev, data, text, conversationId));
        }

        // Agent reply (LLM). Supports `agent_reply` and `conversation_item_added`.
        if (data.type === 'agent_reply' || data.type === 'conversation_item_added') {
          const text = extractReplyText(data);
          if (text === null) return; // not an assistant message
          const conversationId = latestConversationId() || data.conversation_id || undefined;
          setMessages((prev) => applyAgentReply(prev, data, text, conversationId));
        }

        // Agent speech (TTS text): normally the same text as the reply, so it updates the existing message
        if (data.type === 'agent_speech') {
          const text = String(data.text || '').trim();
          if (!text) return;
          const conversationId = latestConversationId() || data.conversation_id || undefined;
          setMessages((prev) => applyAgentSpeech(prev, data, text, conversationId));
        }

        // Pipeline metrics. Supports `pipeline_metrics` (flat) and `metrics_collected` (nested).
        if (data.type === 'pipeline_metrics' || data.type === 'metrics_collected') {
          const metrics = parseMetrics(data);
          if (!metrics) {
            console.warn('[ChatWindow] Pipeline metrics received without conversation_id');
            return;
          }
          pipelineMetricsRef.current.set(metrics.conversationId, metrics);
          // Keep the map small: only the most recent conversations are ever needed
          if (pipelineMetricsRef.current.size > 50) {
            const oldest = pipelineMetricsRef.current.keys().next().value;
            if (oldest !== undefined) pipelineMetricsRef.current.delete(oldest);
          }
          setMessages((prev) => applyMetrics(prev, metrics));
        }
      } catch (error) {
        console.error('[ChatWindow] Error parsing data channel message:', error);
      }
    };

    room.on('dataReceived', handleDataReceived);
    return () => {
      room.off('dataReceived', handleDataReceived);
    };
  }, [room]);

  // When the agent's audio track appears, record the delay since the user finished speaking
  useEffect(() => {
    if (!room) return;

    const handleTrackPublished = (publication: TrackPublication, participant: LocalParticipant | RemoteParticipant) => {
      if (participant.isLocal || publication.kind !== 'audio' || !lastUserSpeechTimeRef.current) return;
      const responseDelay = Date.now() - lastUserSpeechTimeRef.current;
      debug('[ChatWindow] Agent audio track published, response delay:', responseDelay);
      setMessages((prev) => {
        let idx = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].type === 'user') {
            idx = i;
            break;
          }
        }
        if (idx < 0 || !prev[idx].latency) return prev;
        return prev.map((m, i) => (i === idx ? { ...m, latency: { ...m.latency, total: responseDelay } } : m));
      });
    };

    room.on('trackPublished', handleTrackPublished);
    return () => {
      room.off('trackPublished', handleTrackPublished);
    };
  }, [room]);

  return (
    <section
      aria-label="Suhbat"
      className={`au-chat-bg relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl ${className}`}
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/25 px-4 py-2.5 backdrop-blur-md">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="text-sm font-semibold text-white/90">Suhbat</h3>
          {sortedMessages.length > 0 && <span className="text-xs text-white/40">{sortedMessages.length} ta xabar</span>}
        </div>
        <ActivityBadge activity={activity} />
      </header>

      {/* Messages */}
      <div
        className="au-dots relative min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5"
        role="log"
        aria-live="polite"
        aria-label="Suhbat xabarlari"
      >
        {sortedMessages.length === 0 ? (
          <EmptyState agentConnected={agentConnected} />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {sortedMessages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                isLatestAgent={message.id === lastAgentId}
                isSpeaking={agentSpeaking && message.id === lastAgentId}
              />
            ))}
            {activity === 'thinking' && <TypingBubble />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </section>
  );
}
