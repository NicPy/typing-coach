import { FINGER_LABELS, rowTravel, type Finger } from './fingerMap';
import { MIN_BIGRAM_SAMPLES, type SessionMetrics } from './metrics';

export interface DrillSeed {
  kind: 'bigrams' | 'shift' | 'finger' | 'accuracy' | 'rhythm';
  bigrams?: string[];
  finger?: Finger;
}

export interface Hint {
  ruleId: string;
  /** higher = shown first */
  severity: number;
  title: string;
  message: string;
  drill?: DrillSeed;
}

const fmt = (ms: number) => `${Math.round(ms)}ms`;

type Rule = (m: SessionMetrics) => Hint | null;

const accuracyFirst: Rule = (m) => {
  if (m.charCount < 30 || m.accuracy >= 95) return null;
  return {
    ruleId: 'accuracy-first',
    severity: 100,
    title: 'Accuracy before speed',
    message:
      `Your accuracy was ${m.accuracy.toFixed(1)}% (${m.errorCount} misses). Below ~95%, ` +
      `errors and corrections cost more time than typing slower would. Drop your pace until ` +
      `you can stay above 97%, then let speed return on its own.`,
    drill: { kind: 'accuracy' },
  };
};

const slowSameFinger: Rule = (m) => {
  if (!m.baselineMs) return null;
  const culprits = m.bigrams.filter(
    (b) =>
      b.count >= MIN_BIGRAM_SAMPLES &&
      (b.type === 'same-finger' || b.type === 'scissor') &&
      b.meanMs > m.baselineMs! * 1.5,
  );
  if (culprits.length === 0) return null;
  const top = culprits.slice(0, 3);
  const list = top
    .map((b) => {
      const travel = rowTravel(b.bigram[0], b.bigram[1]);
      const why = b.type === 'same-finger'
        ? travel >= 2
          ? 'same finger jumping across rows'
          : 'same finger, two keys'
        : 'adjacent fingers crossing rows';
      return `"${b.bigram[0]}→${b.bigram[1]}" ${fmt(b.meanMs)} (${why})`;
    })
    .join(', ');
  return {
    ruleId: 'slow-same-finger',
    severity: 90,
    title: 'Same-finger jumps are slowing you down',
    message:
      `These transitions took much longer than your ${fmt(m.baselineMs)} baseline: ${list}. ` +
      `One finger has to travel between keys, so the motion can't overlap. Drill these pairs ` +
      `in isolation until they feel like a single motion, and start moving the finger while ` +
      `the previous key is still going down.`,
    drill: { kind: 'bigrams', bigrams: top.map((b) => b.bigram) },
  };
};

const slowBigrams: Rule = (m) => {
  if (!m.baselineMs) return null;
  const culprits = m.bigrams.filter(
    (b) =>
      b.count >= MIN_BIGRAM_SAMPLES &&
      b.type !== 'same-finger' &&
      b.type !== 'scissor' &&
      b.meanMs > m.baselineMs! * 1.8,
  );
  if (culprits.length === 0) return null;
  const top = culprits.slice(0, 3);
  const list = top.map((b) => `"${b.bigram[0]}→${b.bigram[1]}" ${fmt(b.meanMs)}`).join(', ');
  return {
    ruleId: 'slow-bigrams',
    severity: 60,
    title: 'A few key transitions drag your average down',
    message:
      `Compared to your ${fmt(m.baselineMs)} baseline these pairs were slow: ${list}. ` +
      `Speed lives in transitions, not single keys — drill exactly these pairs for a few ` +
      `minutes; a focused 10 minutes on your worst pairs beats an hour of random text.`,
    drill: { kind: 'bigrams', bigrams: top.map((b) => b.bigram) },
  };
};

const sameHandShift: Rule = (m) => {
  const { shiftedCount, sameHandCount } = m.shift;
  if (shiftedCount < 3 || sameHandCount / shiftedCount < 0.3) return null;
  return {
    ruleId: 'same-hand-shift',
    severity: 80,
    title: 'Use the opposite hand for Shift',
    message:
      `${sameHandCount} of ${shiftedCount} capitals/symbols were shifted with the same hand ` +
      `that typed the key. That contorts the hand and breaks your rhythm. Rule: the pinky ` +
      `opposite to the letter always presses Shift — left Shift for right-hand letters, ` +
      `right Shift for left-hand letters.`,
    drill: { kind: 'shift' },
  };
};

const shiftPause: Rule = (m) => {
  if (!m.baselineMs || m.shift.shiftedCount < 3) return null;
  const before = m.shift.meanBeforeMs;
  const after = m.shift.meanAfterMs;
  const slowBefore = before !== null && before > m.baselineMs * 1.8;
  const slowAfter = after !== null && after > m.baselineMs * 1.8;
  if (!slowBefore && !slowAfter) return null;
  const parts: string[] = [];
  if (slowBefore) parts.push(`reaching for shifted keys took ${fmt(before!)}`);
  if (slowAfter) parts.push(`the key after a capital took ${fmt(after!)}`);
  return {
    ruleId: 'shift-pause',
    severity: 70,
    title: 'Capitals break your flow',
    message:
      `Against your ${fmt(m.baselineMs)} baseline, ${parts.join(' and ')}. Keep the motion ` +
      `small: only the pinky goes to Shift, the other fingers stay anchored, and every finger ` +
      `returns to the home row immediately after the stroke.`,
    drill: { kind: 'shift' },
  };
};

const rhythm: Rule = (m) => {
  if (m.intervalCount < 30 || m.consistency >= 55) return null;
  return {
    ruleId: 'rhythm',
    severity: 50,
    title: 'Uneven rhythm',
    message:
      `Your consistency was ${m.consistency.toFixed(0)}% — bursts followed by stalls. ` +
      `An even metronome-like pace at a slightly lower speed builds faster long-term than ` +
      `sprinting word by word. Try typing to a steady internal beat for a few sessions.`,
    drill: { kind: 'rhythm' },
  };
};

const weakFinger: Rule = (m) => {
  if (!m.baselineMs) return null;
  const eligible = m.fingers.filter(
    (f) => f.finger !== 'thumb' && f.count >= 10 && f.meanMs !== null,
  );
  if (eligible.length < 4) return null;
  const worst = [...eligible].sort((a, b) => b.meanMs! - a.meanMs!)[0];
  if (worst.meanMs! < m.baselineMs * 1.5) return null;
  return {
    ruleId: 'weak-finger',
    severity: 40,
    title: `Your ${FINGER_LABELS[worst.finger]} lags behind`,
    message:
      `Keys assigned to the ${FINGER_LABELS[worst.finger]} averaged ${fmt(worst.meanMs!)} vs ` +
      `your ${fmt(m.baselineMs)} baseline${worst.errors > 0 ? ` and caused ${worst.errors} misses` : ''}. ` +
      `Give that finger dedicated drill time — weak fingers are usually just under-trained.`,
    drill: { kind: 'finger', finger: worst.finger },
  };
};

const postErrorSpiral: Rule = (m) => {
  if (!m.baselineMs || m.errorCount < 3) return null;
  const slowRecovery = m.errors.postErrorMeanMs !== null && m.errors.postErrorMeanMs > m.baselineMs * 1.8;
  if (m.errors.correctionChains < 3 && !slowRecovery) return null;
  const bits: string[] = [];
  if (m.errors.correctionChains >= 3) bits.push(`${m.errors.correctionChains} multi-backspace corrections`);
  if (slowRecovery) bits.push(`typing after a miss slowed to ${fmt(m.errors.postErrorMeanMs!)}`);
  return {
    ruleId: 'post-error-spiral',
    severity: 55,
    title: 'Mistakes snowball',
    message:
      `${bits.join(' and ')}. One miss is cheap; panicking about it is expensive. After an ` +
      `error: one calm backspace, retype, and consciously reset your pace instead of rushing ` +
      `to win the time back.`,
    drill: { kind: 'accuracy' },
  };
};

const wordStartHesitation: Rule = (m) => {
  if (!m.wordStartMeanMs || !m.wordInternalMeanMs || m.intervalCount < 30) return null;
  if (m.wordStartMeanMs < m.wordInternalMeanMs * 1.7) return null;
  return {
    ruleId: 'word-start-hesitation',
    severity: 45,
    title: 'You hesitate at the start of words',
    message:
      `First letters took ${fmt(m.wordStartMeanMs)} on average vs ${fmt(m.wordInternalMeanMs)} ` +
      `inside words — you're reading each word only when you reach it. Keep your eyes one or ` +
      `two words ahead of your fingers so the next word is already queued up.`,
    drill: { kind: 'rhythm' },
  };
};

const RULES: Rule[] = [
  accuracyFirst,
  slowSameFinger,
  sameHandShift,
  shiftPause,
  slowBigrams,
  postErrorSpiral,
  rhythm,
  wordStartHesitation,
  weakFinger,
];

const FALLBACK: Hint = {
  ruleId: 'keep-going',
  severity: 0,
  title: 'Solid session — keep the streak',
  message:
    'No specific weakness stood out this run. Consistent, short, daily practice (15–20 minutes) ' +
    'moves speed more than occasional long sessions. Nudge the difficulty up: add punctuation ' +
    'or a longer duration.',
};

/** Run all rules and return the most important hints, best first. */
export function generateHints(m: SessionMetrics, limit = 4): Hint[] {
  const hints = RULES.map((rule) => rule(m)).filter((h): h is Hint => h !== null);
  hints.sort((a, b) => b.severity - a.severity);
  if (hints.length === 0) return [FALLBACK];
  return hints.slice(0, limit);
}
