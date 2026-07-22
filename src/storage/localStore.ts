import type { BigramStat, SessionMetrics } from '../engine/metrics';
import type { Hint } from '../engine/hints';
import type { SessionKind } from '../engine/session';
import type { Finger } from '../engine/fingerMap';
import type { Drill } from '../engine/drills';

const KEYS = {
  results: 'tc.results',
  aggregates: 'tc.aggregates',
  settings: 'tc.settings',
  todos: 'tc.todos',
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

interface StoredTodoBase {
  id: string;
  /** ISO datetime when the exercise was added */
  createdAt: string;
  label: string;
  description: string;
  words: string[];
}

export interface StoredPracticeTodo extends StoredTodoBase {
  kind: Exclude<SessionKind, 'test'>;
}

export type TestTodoSettings = Pick<
  Settings,
  'mode' | 'durationSec' | 'wordCount' | 'punctuation' | 'numbers'
>;

export interface StoredTestTodo extends StoredTodoBase {
  kind: 'test';
  settings: TestTodoSettings;
}

export type StoredTodo = StoredPracticeTodo | StoredTestTodo;

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

/** The integer score used throughout the UI for the user's all-time speed record. */
export function getHighestWpm(): number {
  return getResults().reduce((best, result) => Math.max(best, Math.round(result.wpm)), 0);
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

// --- todo exercises ---------------------------------------------------------

export function getTodos(): StoredTodo[] {
  return read<StoredTodo[]>(KEYS.todos, []);
}

/** The exercise identity is its kind and label, so repeated adds do not create duplicates. */
export function findTodo(
  drill: Drill,
  kind: Exclude<SessionKind, 'test'>,
): StoredPracticeTodo | undefined {
  return getTodos().find(
    (todo): todo is StoredPracticeTodo =>
      todo.kind !== 'test' && todo.kind === kind && todo.label === drill.label,
  );
}

export function addTodo(
  drill: Drill,
  kind: Exclude<SessionKind, 'test'>,
): StoredPracticeTodo {
  const todos = getTodos();
  const existing = todos.find(
    (todo): todo is StoredPracticeTodo =>
      todo.kind !== 'test' && todo.kind === kind && todo.label === drill.label,
  );
  if (existing) return existing;

  const todo: StoredPracticeTodo = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    kind,
    label: drill.label,
    description: drill.description,
    words: [...drill.words],
  };
  write(KEYS.todos, [...todos, todo]);
  return todo;
}

function testTodoSettings(settings: Settings | TestTodoSettings): TestTodoSettings {
  return {
    mode: settings.mode,
    durationSec: settings.durationSec,
    wordCount: settings.wordCount,
    punctuation: settings.punctuation,
    numbers: settings.numbers,
  };
}

function sameTestSettings(a: TestTodoSettings, b: TestTodoSettings): boolean {
  return (
    a.mode === b.mode &&
    a.durationSec === b.durationSec &&
    a.wordCount === b.wordCount &&
    a.punctuation === b.punctuation &&
    a.numbers === b.numbers
  );
}

function sameWords(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((word, index) => word === b[index]);
}

export function findTestTodo(
  settings: Settings | TestTodoSettings,
  words: string[],
): StoredTestTodo | undefined {
  const target = testTodoSettings(settings);
  return getTodos().find(
    (todo): todo is StoredTestTodo =>
      todo.kind === 'test' &&
      sameTestSettings(todo.settings, target) &&
      sameWords(todo.words, words),
  );
}

export function addTestTodo(
  settings: Settings | TestTodoSettings,
  words: string[],
): StoredTestTodo {
  const todos = getTodos();
  const target = testTodoSettings(settings);
  const existing = todos.find(
    (todo): todo is StoredTestTodo =>
      todo.kind === 'test' &&
      sameTestSettings(todo.settings, target) &&
      sameWords(todo.words, words),
  );
  if (existing) return existing;

  const label = target.mode === 'time' ? `time ${target.durationSec}` : `words ${target.wordCount}`;
  const options = [target.punctuation && 'punctuation', target.numbers && 'numbers'].filter(Boolean);
  const todo: StoredTestTodo = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    kind: 'test',
    label,
    description: `Repeat the same ${label} test${options.length ? ` with ${options.join(' and ')}` : ''}.`,
    words: [...words],
    settings: target,
  };
  write(KEYS.todos, [...todos, todo]);
  return todo;
}

export function removeTodo(id: string): void {
  write(KEYS.todos, getTodos().filter((todo) => todo.id !== id));
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
