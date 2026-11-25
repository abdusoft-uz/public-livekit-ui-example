import React, { useEffect, useState } from 'react';
import type { LatencyMetrics } from './types';
import { STAGES, LEVEL_STYLES, levelFor, formatMs } from './metrics';

/**
 * Pipeline latency panel for one agent reply: per-stage bars (VAD / STT / LLM / TTS)
 * and the total time, coloured by thresholds. Collapsible via the summary chip.
 */
export function MetricsPanel({ latency, defaultOpen = false }: { latency: LatencyMetrics; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  // Only the newest reply keeps its details expanded; older ones collapse when a newer reply arrives
  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  const rows = STAGES.map((s) => ({ ...s, value: latency[s.key] ?? 0 })).filter((r) => r.value > 0);
  const sum = rows.reduce((acc, r) => acc + r.value, 0);
  const total = latency.total && latency.total > 0 ? latency.total : sum;
  if (rows.length === 0 && total <= 0) return null;

  const max = Math.max(...rows.map((r) => r.value), 1);
  const totalLevel = LEVEL_STYLES[levelFor('total', total)];

  return (
    <div className="mt-2.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium ${totalLevel.chip} transition-colors hover:bg-white/10`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${totalLevel.bar}`} aria-hidden />
        <span className="text-white/70">Jami javob vaqti</span>
        <span className={`font-mono font-semibold ${totalLevel.text}`}>{formatMs(total)}</span>
        <svg
          className={`h-3 w-3 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && rows.length > 0 && (
        <div className="au-rise mt-2 rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/40">
            <span>Bosqich</span>
            <span>Vaqt (ms)</span>
          </div>
          <ul className="space-y-2">
            {rows.map((r) => {
              const lv = LEVEL_STYLES[levelFor(r.key, r.value)];
              return (
                <li key={r.key}>
                  <div className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="text-white/85">
                      <span className="font-semibold">{r.label}</span>
                      <span className="ml-1.5 text-[10px] text-white/40">{r.description}</span>
                    </span>
                    <span className={`font-mono tabular-nums ${lv.text}`} title={lv.label}>
                      {formatMs(r.value)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`au-bar h-full rounded-full ${lv.bar}`}
                      style={{ width: `${Math.max(4, (r.value / max) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 pt-2 text-[10px] text-white/45">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              yaxshi
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              o&#8216;rtacha
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
              sekin
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
