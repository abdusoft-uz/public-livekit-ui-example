import type { LatencyMetrics } from './types';

export type StageKey = 'vad' | 'stt' | 'llm' | 'tts' | 'total';
export type Level = 'good' | 'ok' | 'slow';

/** Upper bounds in ms: value <= good is green, <= ok is amber, otherwise red. */
export const THRESHOLDS: Record<StageKey, { good: number; ok: number }> = {
  vad: { good: 100, ok: 300 },
  stt: { good: 300, ok: 800 },
  llm: { good: 800, ok: 2000 },
  tts: { good: 300, ok: 800 },
  total: { good: 1500, ok: 3000 },
};

export const STAGES: Array<{ key: Exclude<StageKey, 'total'>; label: string; description: string }> = [
  { key: 'vad', label: 'VAD', description: 'Nutqni aniqlash' },
  { key: 'stt', label: 'STT', description: 'Nutqni matnga o‘tkazish' },
  { key: 'llm', label: 'LLM', description: 'Javob yaratish' },
  { key: 'tts', label: 'TTS', description: 'Matnni ovozga o‘tkazish' },
];

export function levelFor(key: StageKey, ms: number): Level {
  const t = THRESHOLDS[key];
  if (ms <= t.good) return 'good';
  if (ms <= t.ok) return 'ok';
  return 'slow';
}

export const LEVEL_STYLES: Record<Level, { text: string; bar: string; chip: string; label: string }> = {
  good: { text: 'text-green-300', bar: 'bg-green-400', chip: 'bg-green-500/15 border-green-400/30', label: 'Yaxshi' },
  ok: { text: 'text-amber-300', bar: 'bg-amber-400', chip: 'bg-amber-500/15 border-amber-400/30', label: 'O‘rtacha' },
  slow: { text: 'text-red-300', bar: 'bg-red-400', chip: 'bg-red-500/15 border-red-400/30', label: 'Sekin' },
};

/** Always milliseconds, with a thin space as the thousands separator. */
export function formatMs(ms: number): string {
  const rounded = Math.round(ms);
  return `${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ms`;
}

export function hasPipelineMetrics(l?: LatencyMetrics): boolean {
  return !!l && [l.vad, l.stt, l.llm, l.tts, l.total].some((v) => !!v && v > 0);
}
