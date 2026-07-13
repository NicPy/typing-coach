import { WORDS_EN } from '../data/words-en';
import { keyInfo, FINGER_LABELS, type Finger } from './fingerMap';
import type { DrillSeed } from './hints';

export interface Drill {
  label: string;
  description: string;
  words: string[];
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function wordsContaining(bigram: string): string[] {
  return WORDS_EN.filter((w) => w.includes(bigram));
}

/** ngram-type style: raw pair repetitions mixed with real words containing the pair. */
export function bigramDrill(bigrams: string[], targetLen = 42): Drill {
  const words: string[] = [];
  const pools = bigrams.map((b) => ({ bigram: b, pool: wordsContaining(b) }));
  while (words.length < targetLen) {
    for (const { bigram, pool } of pools) {
      words.push(bigram, bigram + bigram);
      const picks = shuffle(pool).slice(0, 3);
      words.push(...(picks.length > 0 ? picks : [bigram + bigram + bigram]));
      if (words.length >= targetLen) break;
    }
  }
  return {
    label: `bigrams: ${bigrams.join(' ')}`,
    description:
      'Type each pair as one motion, not two keystrokes. Slow is fine — smooth comes first, speed follows.',
    words: words.slice(0, targetLen),
  };
}

export function shiftDrill(targetLen = 36): Drill {
  const caps = shuffle(WORDS_EN.filter((w) => w.length >= 3))
    .slice(0, targetLen)
    .map((w) => w[0].toUpperCase() + w.slice(1));
  return {
    label: 'shift technique',
    description:
      'Every word starts with a capital. Always press Shift with the pinky OPPOSITE to the letter, and return to the home row right after.',
    words: caps,
  };
}

export function fingerDrill(finger: Finger, targetLen = 36): Drill {
  const scored = WORDS_EN.map((w) => {
    const hits = [...w].filter((ch) => keyInfo(ch)?.finger === finger).length;
    return { w, score: hits / w.length, hits };
  })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map((x) => x.w);
  const words: string[] = [];
  while (words.length < targetLen) words.push(...shuffle(scored));
  return {
    label: `${FINGER_LABELS[finger]} workout`,
    description: `These words lean on your ${FINGER_LABELS[finger]}. Keep the other fingers anchored on the home row.`,
    words: words.slice(0, targetLen),
  };
}

export function accuracyDrill(targetLen = 30): Drill {
  return {
    label: 'accuracy reset',
    description:
      'Goal: 100% accuracy, speed does not matter. If you miss a key, finish the run anyway — but slow down until misses stop.',
    words: shuffle(WORDS_EN.slice(0, 60)).slice(0, targetLen),
  };
}

export function rhythmDrill(targetLen = 36): Drill {
  return {
    label: 'steady rhythm',
    description:
      'Type to an even internal beat — every keystroke the same distance apart, like a metronome. Read one word ahead of your fingers.',
    words: shuffle(WORDS_EN.slice(0, 100)).slice(0, targetLen),
  };
}

export function drillFromSeed(seed: DrillSeed): Drill {
  switch (seed.kind) {
    case 'bigrams':
      return bigramDrill(seed.bigrams && seed.bigrams.length > 0 ? seed.bigrams : ['th', 'he']);
    case 'shift':
      return shiftDrill();
    case 'finger':
      return fingerDrill(seed.finger ?? 'l-pinky');
    case 'accuracy':
      return accuracyDrill();
    case 'rhythm':
      return rhythmDrill();
  }
}
