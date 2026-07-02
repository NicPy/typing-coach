import type { Keystroke, ShiftSide } from './session';
import { needsShift } from './fingerMap';

interface TypeTextOptions {
  /** default gap between keystrokes */
  dt?: number;
  /** per-bigram gap override, e.g. { mu: 400 } */
  bigramDt?: Record<string, number>;
  /** which shift is "held" for shifted characters */
  shiftSide?: ShiftSide;
  /** indices of keystrokes to mark as misses */
  errors?: Set<number>;
}

/** Build a synthetic keystroke log by "typing" a phrase at controlled speeds. */
export function typeText(text: string, opts: TypeTextOptions = {}): { log: Keystroke[]; durationMs: number } {
  const { dt = 150, bigramDt = {}, shiftSide = 'left', errors = new Set<number>() } = opts;
  const log: Keystroke[] = [];
  let t = 0;
  let prevChar: string | null = null;
  [...text].forEach((ch, i) => {
    if (i > 0) t += bigramDt[(prevChar ?? '') + ch] ?? dt;
    log.push({
      t,
      key: ch,
      expected: ch,
      correct: !errors.has(i),
      shift: needsShift(ch) ? shiftSide : null,
      wordStart: prevChar === ' ',
    });
    prevChar = ch;
  });
  return { log, durationMs: t + dt };
}
