import type { ChatMessage, LatencyMetrics } from './types';

/**
 * Pure helpers that turn data-channel events from the agent into chat state.
 * All functions return new arrays/objects and never mutate their input.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AgentEvent = Record<string, any>;

export interface PipelineMetrics {
  vad: number;
  stt: number;
  llm: number;
  tts: number;
  total: number;
  conversationId: string;
  createdAt: number;
}

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
const norm = (s: string) => s.trim().toLowerCase();

/** Overwrite only the fields that carry a positive value in `patch`. */
function mergeLatency(base: LatencyMetrics | undefined, patch: LatencyMetrics): LatencyMetrics {
  const out: LatencyMetrics = { ...base };
  (Object.keys(patch) as Array<keyof LatencyMetrics>).forEach((k) => {
    const v = patch[k];
    if (v && v > 0) out[k] = v;
  });
  return out;
}

function lastIndexWhere<T>(arr: T[], pred: (x: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return i;
  return -1;
}

function replaceAt(arr: ChatMessage[], index: number, patch: Partial<ChatMessage>): ChatMessage[] {
  return arr.map((m, i) => (i === index ? { ...m, ...patch } : m));
}

function agentLatency(data: AgentEvent): LatencyMetrics {
  return {
    llm: data.latency?.llm,
    tts: data.latency?.tts,
    agentResponseDuration: data.latency?.agentResponseDuration,
    total: data.latency?.total,
  };
}

/** Text of an assistant reply, or null when the event must be ignored. */
export function extractReplyText(data: AgentEvent): string | null {
  if (data.type === 'conversation_item_added' && data.item) {
    const role = data.item.role || data.role;
    if (role !== 'assistant') return null;
    const contents = data.item.content || data.content || [];
    if (Array.isArray(contents)) {
      const first = contents.find((c: unknown) => typeof c === 'string') as string | undefined;
      if (first !== undefined) return first.trim();
    }
  }
  return (data.text || '').trim();
}

export function parseMetrics(data: AgentEvent): PipelineMetrics | null {
  const conversationId = data.conversation_id || data.conversationId;
  const src = data.metrics && typeof data.metrics === 'object' ? data.metrics : data;
  const stage = (v: AgentEvent | number | undefined): number => (v && typeof v === 'object' ? v.duration_ms : v) || 0;
  // Nested (metrics_collected) format may omit the conversation id; the flat format must have it.
  if (!conversationId && src === data) return null;
  return {
    vad: stage(src.vad),
    stt: stage(src.stt),
    llm: stage(src.llm),
    tts: stage(src.tts),
    total: src.total_duration_ms || src.total || 0,
    conversationId: conversationId || `conv-${Date.now()}`,
    createdAt: data.timestamp || data.created_at || Date.now(),
  };
}

export function applyUserSpeech(prev: ChatMessage[], data: AgentEvent, text: string, conversationId?: string): ChatMessage[] {
  const ts = data.timestamp || Date.now();
  const duplicate = prev
    .filter((m) => m.type === 'user')
    .slice(-3)
    .some((m) => norm(m.text) === norm(text) && Math.abs(ts - m.timestamp) < 2000);
  if (duplicate) return prev;
  return [
    ...prev,
    {
      id: uid('user'),
      type: 'user',
      text,
      timestamp: ts,
      latency: {
        vad: data.latency?.vad,
        stt: data.latency?.stt,
        userSpeechDuration: data.latency?.userSpeechDuration || 0,
      },
      conversationId,
    },
  ];
}

export function applyAgentReply(prev: ChatMessage[], data: AgentEvent, text: string, conversationId?: string): ChatMessage[] {
  if (!text) return prev;
  const ts = data.timestamp || Date.now();

  // Same conversation + same text within 2s is a streaming update / duplicate: refresh it.
  if (conversationId) {
    const idx = lastIndexWhere(
      prev,
      (m) => m.type === 'agent' && m.conversationId === conversationId && norm(m.text) === norm(text)
    );
    if (idx >= 0 && Math.abs(ts - prev[idx].timestamp) < 2000) {
      return replaceAt(prev, idx, { timestamp: ts, latency: mergeLatency(prev[idx].latency, agentLatency(data)) });
    }
  }

  return [
    ...prev,
    { id: uid('agent-reply'), type: 'agent', text, timestamp: ts, latency: agentLatency(data), conversationId },
  ];
}

export function applyAgentSpeech(prev: ChatMessage[], data: AgentEvent, text: string, conversationId?: string): ChatMessage[] {
  const ts = data.timestamp || Date.now();
  const idx = lastIndexWhere(prev, (m) => m.type === 'agent' && (!conversationId || m.conversationId === conversationId));
  if (idx < 0 || Math.abs(ts - prev[idx].timestamp) >= 5000) return prev; // TTS text normally equals the reply
  return replaceAt(prev, idx, {
    text,
    timestamp: data.timestamp || prev[idx].timestamp,
    latency: mergeLatency(prev[idx].latency, agentLatency(data)),
  });
}

export function applyMetrics(prev: ChatMessage[], metrics: PipelineMetrics): ChatMessage[] {
  const patch: LatencyMetrics = {
    vad: metrics.vad,
    stt: metrics.stt,
    llm: metrics.llm,
    tts: metrics.tts,
    total: metrics.total,
  };

  if (prev.some((m) => m.conversationId === metrics.conversationId)) {
    return prev.map((m) =>
      m.conversationId === metrics.conversationId ? { ...m, latency: mergeLatency(m.latency, patch) } : m
    );
  }

  // Fallback: attach to one of the last 3 agent messages created within 10 seconds of the metrics.
  const agentIdx = prev.reduce<number[]>((acc, m, i) => (m.type === 'agent' ? [...acc, i] : acc), []).slice(-3);
  const target = agentIdx
    .reverse()
    .find((i) => Math.abs(metrics.createdAt - prev[i].timestamp) < 10000);
  if (target === undefined) return prev; // the reply will arrive separately
  return replaceAt(prev, target, {
    conversationId: metrics.conversationId,
    latency: mergeLatency(prev[target].latency, patch),
  });
}

/** Remove empty/placeholder messages and near-duplicates, then order by time (user before agent when close). */
export function prepareMessages(messages: ChatMessage[]): ChatMessage[] {
  const filtered: ChatMessage[] = [];
  for (const msg of messages) {
    if (!msg.text || !msg.text.trim()) continue;
    const text = norm(msg.text);
    const isDuplicate = filtered
      .slice(-10)
      .some((m) => m.type === msg.type && norm(m.text) === text && Math.abs(m.timestamp - msg.timestamp) < 3000);
    if (!isDuplicate) filtered.push(msg);
  }
  return filtered.sort((a, b) => {
    const diff = a.timestamp - b.timestamp;
    if (Math.abs(diff) > 1000) return diff;
    if (a.type === 'user' && b.type === 'agent') return -1;
    if (a.type === 'agent' && b.type === 'user') return 1;
    return diff;
  });
}
