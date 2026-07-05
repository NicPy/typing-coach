import type { Keystroke } from './session';
import { classifyBigram, keyInfo, type BigramType, type Finger } from './fingerMap';

/** Pauses longer than this are treated as breaks, not typing time. */
const MAX_INTERVAL_MS = 3000;
/** Bigrams need at least this many samples before we trust their timing. */
export const MIN_BIGRAM_SAMPLES = 3;

export interface BigramStat {
  bigram: string;
  count: number;
  meanMs: number;
  type: BigramType;
}

export interface FingerStat {
  finger: Finger;
  count: number;
  meanMs: number | null;
  errors: number;
}

export interface ShiftStats {
  shiftedCount: number;
  /** shifted chars where shift was held by the same hand that typed the char */
  sameHandCount: number;
  meanBeforeMs: number | null;
  meanAfterMs: number | null;
}

export interface ErrorStats {
  errorCount: number;
  backspaceCount: number;
  /** number of correction runs of 2+ consecutive backspaces */
  correctionChains: number;
  /** mean interval of the two keystrokes following an error */
  postErrorMeanMs: number | null;
  topMissedChars: Array<{ char: string; count: number }>;
}

export interface WpmSample {
  sec: number;
  raw: number;
  wpm: number;
  errors: number;
}

export interface SessionMetrics {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  /** 0..100, from inter-key interval variance */
  consistency: number;
  durationMs: number;
  /** Time spent actively typing; pauses longer than MAX_INTERVAL_MS are excluded. */
  activeDurationMs: number;
  charCount: number;
  correctCount: number;
  errorCount: number;
  /** median inter-key interval — the user's own baseline speed */
  baselineMs: number | null;
  intervalCount: number;
  /** slowest first, only bigrams with 2+ samples */
  bigrams: BigramStat[];
  fingers: FingerStat[];
  shift: ShiftStats;
  errors: ErrorStats;
  wordStartMeanMs: number | null;
  wordInternalMeanMs: number | null;
  wpmSeries: WpmSample[];
}

function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function computeMetrics(log: Keystroke[], durationMs: number): SessionMetrics {
  const chars = log.filter((k) => k.key !== 'Backspace');
  const correctCount = chars.filter((k) => k.correct).length;
  const charCount = chars.length;
  const errorCount = charCount - correctCount;
  const minutes = Math.max(durationMs, 1) / 60000;

  const wpm = correctCount / 5 / minutes;
  const rawWpm = charCount / 5 / minutes;
  const accuracy = charCount === 0 ? 100 : (correctCount / charCount) * 100;
  const activeDurationMs = log.reduce((total, key, index) => {
    if (index === 0) return total;
    const interval = key.t - log[index - 1].t;
    return interval > 0 && interval <= MAX_INTERVAL_MS ? total + interval : total;
  }, 0);

  // --- intervals & bigrams -------------------------------------------------
  const intervals: number[] = [];
  const wordStartIntervals: number[] = [];
  const wordInternalIntervals: number[] = [];
  const bigramAcc = new Map<string, { count: number; total: number }>();
  const fingerAcc = new Map<Finger, { count: number; total: number; timed: number; errors: number }>();
  const shiftBefore: number[] = [];
  const shiftAfter: number[] = [];
  let shiftedCount = 0;
  let sameHandCount = 0;

  const touchFinger = (f: Finger) => {
    let e = fingerAcc.get(f);
    if (!e) {
      e = { count: 0, total: 0, timed: 0, errors: 0 };
      fingerAcc.set(f, e);
    }
    return e;
  };

  let prev: Keystroke | null = null; // previous char keystroke, reset by backspace
  for (const k of log) {
    if (k.key === 'Backspace') {
      prev = null;
      continue;
    }
    const attributed = k.expected ?? k.key;
    const info = keyInfo(attributed);
    if (info) {
      const e = touchFinger(info.finger);
      e.count++;
      if (!k.correct) e.errors++;
    }

    const dt = prev ? k.t - prev.t : null;
    const validDt = dt !== null && dt > 0 && dt <= MAX_INTERVAL_MS ? dt : null;

    if (validDt !== null && prev) {
      intervals.push(validDt);
      if (k.wordStart) wordStartIntervals.push(validDt);
      else if (prev.key !== ' ' && k.key !== ' ') wordInternalIntervals.push(validDt);

      if (info) {
        const e = touchFinger(info.finger);
        e.total += validDt;
        e.timed++;
      }

      if (prev.correct && k.correct && prev.key !== ' ' && k.key !== ' ') {
        const bigram = (prev.key + k.key).toLowerCase();
        let b = bigramAcc.get(bigram);
        if (!b) {
          b = { count: 0, total: 0 };
          bigramAcc.set(bigram, b);
        }
        b.count++;
        b.total += validDt;
      }
    }

    if (k.shift && k.expected) {
      shiftedCount++;
      const hand = keyInfo(k.expected)?.hand;
      if (hand && hand !== 'either' && hand === k.shift) sameHandCount++;
      if (validDt !== null) shiftBefore.push(validDt);
    } else if (prev?.shift && validDt !== null) {
      shiftAfter.push(validDt);
    }

    prev = k;
  }

  const bigrams: BigramStat[] = [...bigramAcc.entries()]
    .filter(([, v]) => v.count >= 2)
    .map(([bigram, v]) => ({
      bigram,
      count: v.count,
      meanMs: v.total / v.count,
      type: classifyBigram(bigram[0], bigram[1]),
    }))
    .sort((a, b) => b.meanMs - a.meanMs);

  const fingers: FingerStat[] = [...fingerAcc.entries()].map(([finger, e]) => ({
    finger,
    count: e.count,
    meanMs: e.timed > 0 ? e.total / e.timed : null,
    errors: e.errors,
  }));

  // --- errors ---------------------------------------------------------------
  const missed = new Map<string, number>();
  for (const k of chars) {
    if (!k.correct && k.expected) missed.set(k.expected, (missed.get(k.expected) ?? 0) + 1);
  }
  let backspaceCount = 0;
  let correctionChains = 0;
  let chain = 0;
  const postErrorDts: number[] = [];
  for (let i = 0; i < log.length; i++) {
    if (log[i].key === 'Backspace') {
      backspaceCount++;
      chain++;
      if (chain === 2) correctionChains++;
    } else {
      chain = 0;
    }
    if (log[i].key !== 'Backspace' && !log[i].correct) {
      // measure the two keystrokes after an error (recovery cost)
      for (let j = i + 1, taken = 0; j < log.length && taken < 2; j++) {
        if (log[j].key === 'Backspace') continue;
        const dt = log[j].t - log[j - 1].t;
        if (dt > 0 && dt <= MAX_INTERVAL_MS) postErrorDts.push(dt);
        taken++;
      }
    }
  }

  // --- consistency ----------------------------------------------------------
  const m = mean(intervals);
  let consistency = 0;
  if (m && intervals.length >= 5) {
    const variance = intervals.reduce((acc, x) => acc + (x - m) ** 2, 0) / intervals.length;
    const cv = Math.sqrt(variance) / m;
    consistency = Math.max(0, Math.min(100, (1 - cv) * 100));
  }

  // --- wpm over time ---------------------------------------------------------
  const wpmSeries: WpmSample[] = [];
  if (chars.length > 0) {
    const t0 = log[0].t;
    const totalSec = Math.max(1, Math.ceil(durationMs / 1000));
    const buckets = new Array(totalSec).fill(0).map(() => ({ chars: 0, correct: 0, errors: 0 }));
    for (const k of chars) {
      const sec = Math.min(totalSec - 1, Math.max(0, Math.floor((k.t - t0) / 1000)));
      buckets[sec].chars++;
      if (k.correct) buckets[sec].correct++;
      else buckets[sec].errors++;
    }
    let cumCorrect = 0;
    for (let s = 0; s < totalSec; s++) {
      cumCorrect += buckets[s].correct;
      wpmSeries.push({
        sec: s + 1,
        raw: buckets[s].chars * 12, // chars/5 * 60
        wpm: cumCorrect / 5 / ((s + 1) / 60),
        errors: buckets[s].errors,
      });
    }
  }

  return {
    wpm,
    rawWpm,
    accuracy,
    consistency,
    durationMs,
    activeDurationMs,
    charCount,
    correctCount,
    errorCount,
    baselineMs: median(intervals),
    intervalCount: intervals.length,
    bigrams,
    fingers,
    shift: {
      shiftedCount,
      sameHandCount,
      meanBeforeMs: mean(shiftBefore),
      meanAfterMs: mean(shiftAfter),
    },
    errors: {
      errorCount,
      backspaceCount,
      correctionChains,
      postErrorMeanMs: mean(postErrorDts),
      topMissedChars: [...missed.entries()]
        .map(([char, count]) => ({ char, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    },
    wordStartMeanMs: mean(wordStartIntervals),
    wordInternalMeanMs: mean(wordInternalIntervals),
    wpmSeries,
  };
}
