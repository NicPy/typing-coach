import { accuracyDrill, bigramDrill, rhythmDrill, shiftDrill, type Drill } from '../engine/drills';
import { WORDS_EN } from './words-en';

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  makeDrill: () => Drill;
}

const HOME_ROW_WORDS = [
  'as', 'all', 'ask', 'had', 'has', 'add', 'fall', 'hall', 'lash', 'flag',
  'glad', 'shall', 'salad', 'flask', 'dash', 'gash', 'half', 'gas', 'sad', 'lad',
];

/** Best-practices curriculum. Content is generic technique advice, ordered by impact. */
export const LESSONS: Lesson[] = [
  {
    id: 'home-row',
    title: '1 · Home row is home',
    summary:
      'Fingers rest on A-S-D-F and J-K-L-; with index fingers on the F/J bumps. Every reach starts ' +
      'there and RETURNS there — most slow, inaccurate typing comes from hands drifting after a reach. ' +
      'Keep wrists floating, not planted, and never look down at the keys.',
    makeDrill: () => ({
      label: 'home row anchor',
      description: 'Mostly home-row words. Feel the F/J bumps between words without looking down.',
      words: Array.from({ length: 30 }, () => HOME_ROW_WORDS[Math.floor(Math.random() * HOME_ROW_WORDS.length)]),
    }),
  },
  {
    id: 'accuracy-first',
    title: '2 · Accuracy first, always',
    summary:
      'Errors are the most expensive thing in typing: each one costs a backspace, a retype, and a ' +
      'broken rhythm. Practicing fast-but-sloppy trains sloppy. Stay above 97% accuracy and speed ' +
      'follows for free; below 95%, deliberately slow down.',
    makeDrill: accuracyDrill,
  },
  {
    id: 'opposite-shift',
    title: '3 · Shift with the opposite pinky',
    summary:
      'Capitals and symbols should never twist a hand: the pinky OPPOSITE the letter presses Shift ' +
      '(right Shift for A, left Shift for L). The rest of the hand stays anchored, and everything ' +
      'snaps back to the home row after the stroke.',
    makeDrill: shiftDrill,
  },
  {
    id: 'bigram-flow',
    title: '4 · Train pairs, not letters',
    summary:
      'The top 100 two-letter combinations cover about half of everything you will ever type. ' +
      'Fast typists execute "th", "he", "in" as single motions. Drilling common pairs until they ' +
      'are automatic is the highest-leverage practice there is.',
    makeDrill: () => bigramDrill(['th', 'he', 'in', 'er', 'an', 're']),
  },
  {
    id: 'same-finger',
    title: '5 · Tame same-finger jumps',
    summary:
      'Pairs typed by one finger on different rows (m→u, e→d, u→n, c→e) are the slowest motions on ' +
      'the keyboard — the finger must fully finish one key before travelling to the next. They can\'t ' +
      'be avoided, only smoothed: drill them until the travel is one confident hop.',
    makeDrill: () => bigramDrill(['mu', 'um', 'ed', 'de', 'un', 'nu', 'ce']),
  },
  {
    id: 'rhythm',
    title: '6 · Steady beat, eyes ahead',
    summary:
      'Consistency beats bursts: an even keystroke rhythm at a modest pace outscores sprint-and-stall. ' +
      'Keep your eyes one or two words ahead of your fingers so the next word is queued before you ' +
      'need it. Short daily sessions (15–20 min) compound; marathon sessions don\'t.',
    makeDrill: rhythmDrill,
  },
];

/** A plain-words warmup used as the default training entry. */
export function warmup(): Drill {
  return {
    label: 'warmup',
    description: 'Two lines of common words to loosen up before drilling.',
    words: WORDS_EN.slice(0, 100).sort(() => Math.random() - 0.5).slice(0, 20),
  };
}
