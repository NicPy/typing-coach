export type ShiftSide = 'left' | 'right' | null;

/** One logged keypress during a session. */
export interface Keystroke {
  /** ms timestamp (performance.now) */
  t: number;
  /** typed character, or 'Backspace' */
  key: string;
  /** character that should have been typed at this position (null for extra chars / backspace) */
  expected: string | null;
  correct: boolean;
  /** which shift was held, if any */
  shift: ShiftSide;
  /** true when this keystroke starts a new word (first char after a space) */
  wordStart: boolean;
}

export type SessionKind = 'test' | 'drill' | 'lesson';

export interface SessionConfig {
  kind: SessionKind;
  /** human label, e.g. "time 30" or a lesson title */
  label: string;
  mode: 'time' | 'words';
  durationSec?: number;
  wordCount?: number;
  punctuation: boolean;
  numbers: boolean;
}

/** Raw outcome of a completed session, before analysis. */
export interface RawSession {
  config: SessionConfig;
  log: Keystroke[];
  durationMs: number;
  targetWords: string[];
  typedWords: string[];
}
