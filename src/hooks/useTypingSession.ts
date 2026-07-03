import { useCallback, useEffect, useRef, useState } from 'react';
import type { Keystroke, ShiftSide } from '../engine/session';

export type Phase = 'idle' | 'running' | 'finished';

export interface RawFinish {
  log: Keystroke[];
  durationMs: number;
  typedWords: string[];
}

interface Options {
  words: string[];
  mode: 'time' | 'words';
  durationSec: number;
  /** when false, input is ignored (e.g. results shown, modal open) */
  enabled: boolean;
  onFinish: (raw: RawFinish) => void;
}

export interface TypingSession {
  phase: Phase;
  wordIdx: number;
  typedWords: string[];
  elapsedMs: number;
  liveWpm: number;
  /** currently held KeyboardEvent.codes, for the on-screen keyboard */
  activeCodes: ReadonlySet<string>;
  reset: () => void;
}

const MAX_EXTRA_CHARS = 12;

export function useTypingSession(opts: Options): TypingSession {
  const [phase, setPhase] = useState<Phase>('idle');
  const [wordIdx, setWordIdx] = useState(0);
  const [typedWords, setTypedWords] = useState<string[]>(['']);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [liveWpm, setLiveWpm] = useState(0);
  const [activeCodes, setActiveCodes] = useState<ReadonlySet<string>>(new Set());

  const logRef = useRef<Keystroke[]>([]);
  const startRef = useRef<number | null>(null);
  const correctCharsRef = useRef(0);
  const finishedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heldRef = useRef<Set<string>>(new Set());

  // keep latest props/state reachable from the stable key handler
  const stateRef = useRef({ words: opts.words, wordIdx, typedWords, phase, mode: opts.mode, durationSec: opts.durationSec, enabled: opts.enabled });
  stateRef.current = { words: opts.words, wordIdx, typedWords, phase, mode: opts.mode, durationSec: opts.durationSec, enabled: opts.enabled };
  const onFinishRef = useRef(opts.onFinish);
  onFinishRef.current = opts.onFinish;

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const finish = useCallback(() => {
    if (finishedRef.current || startRef.current === null) return;
    finishedRef.current = true;
    stopTimer();
    const durationMs = performance.now() - startRef.current;
    setPhase('finished');
    onFinishRef.current({
      log: logRef.current,
      durationMs,
      typedWords: stateRef.current.typedWords,
    });
  }, []);

  const start = useCallback(() => {
    startRef.current = performance.now();
    setPhase('running');
    timerRef.current = setInterval(() => {
      if (startRef.current === null) return;
      const elapsed = performance.now() - startRef.current;
      setElapsedMs(elapsed);
      setLiveWpm(elapsed > 2000 ? Math.round(correctCharsRef.current / 5 / (elapsed / 60000)) : 0);
      const { mode, durationSec } = stateRef.current;
      if (mode === 'time' && elapsed >= durationSec * 1000) finish();
    }, 200);
  }, [finish]);

  const reset = useCallback(() => {
    stopTimer();
    logRef.current = [];
    startRef.current = null;
    correctCharsRef.current = 0;
    finishedRef.current = false;
    setPhase('idle');
    setWordIdx(0);
    setTypedWords(['']);
    setElapsedMs(0);
    setLiveWpm(0);
  }, []);

  useEffect(() => {
    const currentShift = (): ShiftSide => {
      if (heldRef.current.has('ShiftLeft')) return 'left';
      if (heldRef.current.has('ShiftRight')) return 'right';
      return null;
    };

    const pushLog = (k: Keystroke) => {
      logRef.current.push(k);
      if (k.correct && k.key !== 'Backspace') correctCharsRef.current++;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.repeat) {
        heldRef.current.add(e.code);
        setActiveCodes(new Set(heldRef.current));
      }

      const s = stateRef.current;
      if (!s.enabled || s.phase === 'finished') return;

      // word-level delete
      if (e.key === 'Backspace' && (e.ctrlKey || e.altKey || e.metaKey)) {
        e.preventDefault();
        setTypedWords((tw) => {
          const next = [...tw];
          next[s.wordIdx] = '';
          return next;
        });
        pushLog({ t: performance.now(), key: 'Backspace', expected: null, correct: false, shift: null, wordStart: false });
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        const typed = s.typedWords[s.wordIdx] ?? '';
        if (typed.length > 0) {
          setTypedWords((tw) => {
            const next = [...tw];
            next[s.wordIdx] = typed.slice(0, -1);
            return next;
          });
        } else if (s.wordIdx > 0 && s.typedWords[s.wordIdx - 1] !== s.words[s.wordIdx - 1]) {
          // allow stepping back into an incorrectly submitted word
          setWordIdx(s.wordIdx - 1);
        } else {
          return;
        }
        pushLog({ t: performance.now(), key: 'Backspace', expected: null, correct: false, shift: null, wordStart: false });
        return;
      }

      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();

      if (s.phase === 'idle') start();
      const t = performance.now();
      const target = s.words[s.wordIdx] ?? '';
      const typed = s.typedWords[s.wordIdx] ?? '';

      if (e.key === ' ') {
        if (typed.length === 0) return; // ignore leading spaces
        const wordCorrect = typed === target;
        pushLog({ t, key: ' ', expected: ' ', correct: wordCorrect, shift: currentShift(), wordStart: false });
        const isLast = s.wordIdx >= s.words.length - 1;
        if (s.mode === 'words' && isLast) {
          finish();
          return;
        }
        setWordIdx(s.wordIdx + 1);
        setTypedWords((tw) => {
          const next = [...tw];
          while (next.length <= s.wordIdx + 1) next.push('');
          return next;
        });
        return;
      }

      if (typed.length >= target.length + MAX_EXTRA_CHARS) return;
      const expected = typed.length < target.length ? target[typed.length] : null;
      const correct = expected !== null && e.key === expected;
      pushLog({
        t,
        key: e.key,
        expected,
        correct,
        shift: e.shiftKey ? currentShift() : null,
        wordStart: typed.length === 0 && s.wordIdx > 0,
      });
      const nextTyped = typed + e.key;
      setTypedWords((tw) => {
        const next = [...tw];
        next[s.wordIdx] = nextTyped;
        return next;
      });
      if (s.mode === 'words' && s.wordIdx >= s.words.length - 1 && nextTyped === target) {
        // last word completed correctly ends the run without needing a space
        setTimeout(finish, 0);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldRef.current.delete(e.code);
      setActiveCodes(new Set(heldRef.current));
    };

    const onBlur = () => {
      heldRef.current.clear();
      setActiveCodes(new Set());
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [start, finish]);

  useEffect(() => stopTimer, []);

  return { phase, wordIdx, typedWords, elapsedMs, liveWpm, activeCodes, reset };
}
