import type { BigramStat, SessionMetrics } from '../engine/metrics';
import type { Hint } from '../engine/hints';
import type { SessionKind } from '../engine/session';
import type { Finger } from '../engine/fingerMap';

const KEYS = {
  results: 'tc.results',
  aggregates: 'tc.aggregates',
  settings: 'tc.settings',
} as const;

const SCHEMA_VERSION = 2;
const MAX_RESULTS = 200;

export interface StoredHint {
  ruleId: string;
  title: string;
  message: string;
}

export interface StoredResult {
  id: string;
  schemaVersion: number;
  /** ISO datetime of the run */
  date: string;
  kind: SessionKind;
  label: string;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  durationMs: number;
  /** Active keystroke time. Missing on results saved before schema v2. */
  activeDurationMs?: number;
  charCount: number;
  errorCount: number;
  slowBigrams: BigramStat[];
  hints: StoredHint[];
}

export interface Settings {
  /** user-set goal; intentionally has no default in code */
  targetWpm?: number;
  showKeyboard: boolean;
  highlightNextKey: boolean;
  mode: 'time' | 'words';
  durationSec: number;
  wordCount: number;
  punctuation: boolean;
  numbers: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  showKeyboard: true,
  highlightNextKey: true,
  mode: 'time',
  durationSec: 30,
  wordCount: 25,
  punctuation: false,
  numbers: false,
};

export interface Aggregates {
  schemaVersion: number;
  updated: string;
  bigrams: Record<string, { count: number; meanMs: number }>;
  fingers: Partial<Record<Finger, { count: number; meanMs: number; errors: number }>>;
  /** how many sessions flagged same-hand shift usage */
  sameHandShiftSessions: number;
  sessionCount: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — typing still works, we just don't persist
  }
}

// --- results ---------------------------------------------------------------

export function getResults(): StoredResult[] {
  return read<StoredResult[]>(KEYS.results, []);
}

export function saveResult(
  metrics: SessionMetrics,
  hints: Hint[],
  kind: SessionKind,
  label: string,
): StoredResult {
  const result: StoredResult = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    schemaVersion: SCHEMA_VERSION,
    date: new Date().toISOString(),
    kind,
    label,
    wpm: metrics.wpm,
    rawWpm: metrics.rawWpm,
    accuracy: metrics.accuracy,
    consistency: metrics.consistency,
    durationMs: metrics.durationMs,
    activeDurationMs: metrics.activeDurationMs,
    charCount: metrics.charCount,
    errorCount: metrics.errorCount,
    slowBigrams: metrics.bigrams.slice(0, 10),
    hints: hints.map((h) => ({ ruleId: h.ruleId, title: h.title, message: h.message })),
  };
  const all = getResults();
  all.push(result);
  write(KEYS.results, all.slice(-MAX_RESULTS));
  return result;
}

// --- aggregates (cross-session weak spots, feed the personalized drills) ----

const EMPTY_AGGREGATES: Aggregates = {
  schemaVersion: SCHEMA_VERSION,
  updated: '',
  bigrams: {},
  fingers: {},
  sameHandShiftSessions: 0,
  sessionCount: 0,
};

export function getAggregates(): Aggregates {
  return read<Aggregates>(KEYS.aggregates, EMPTY_AGGREGATES);
}

/** Weighted-merge session stats into rolling aggregates; recent sessions weigh more. */
export function updateAggregates(metrics: SessionMetrics): void {
  const agg = getAggregates();
  for (const b of metrics.bigrams) {
    const prev = agg.bigrams[b.bigram];
    if (!prev) {
      agg.bigrams[b.bigram] = { count: b.count, meanMs: b.meanMs };
    } else {
      const w = Math.min(prev.count, 50); // cap history weight so stats stay adaptive
      agg.bigrams[b.bigram] = {
        count: Math.min(prev.count + b.count, 500),
        meanMs: (prev.meanMs * w + b.meanMs * b.count) / (w + b.count),
      };
    }
  }
  for (const f of metrics.fingers) {
    if (f.meanMs === null) continue;
    const prev = agg.fingers[f.finger];
    if (!prev) {
      agg.fingers[f.finger] = { count: f.count, meanMs: f.meanMs, errors: f.errors };
    } else {
      const w = Math.min(prev.count, 100);
      agg.fingers[f.finger] = {
        count: Math.min(prev.count + f.count, 1000),
        meanMs: (prev.meanMs * w + f.meanMs * f.count) / (w + f.count),
        errors: prev.errors + f.errors,
      };
    }
  }
  if (
    metrics.shift.shiftedCount >= 3 &&
    metrics.shift.sameHandCount / metrics.shift.shiftedCount >= 0.3
  ) {
    agg.sameHandShiftSessions++;
  }
  agg.sessionCount++;
  agg.updated = new Date().toISOString();
  write(KEYS.aggregates, agg);
}

// --- settings ----------------------------------------------------------------

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings, {}) };
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  write(KEYS.settings, next);
  return next;
}
