export type Finger =
  | 'l-pinky'
  | 'l-ring'
  | 'l-middle'
  | 'l-index'
  | 'r-index'
  | 'r-middle'
  | 'r-ring'
  | 'r-pinky'
  | 'thumb';

export type Hand = 'left' | 'right' | 'either';

export interface KeyInfo {
  finger: Finger;
  hand: Hand;
  /** 0 = number row, 1 = top, 2 = home, 3 = bottom, 4 = space */
  row: number;
}

export const FINGER_LABELS: Record<Finger, string> = {
  'l-pinky': 'left pinky',
  'l-ring': 'left ring',
  'l-middle': 'left middle',
  'l-index': 'left index',
  'r-index': 'right index',
  'r-middle': 'right middle',
  'r-ring': 'right ring',
  'r-pinky': 'right pinky',
  thumb: 'thumb',
};

export const FINGER_COLORS: Record<Finger, string> = {
  'l-pinky': '#bf616a',
  'l-ring': '#d08770',
  'l-middle': '#ebcb8b',
  'l-index': '#a3be8c',
  'r-index': '#88c0d0',
  'r-middle': '#81a1c1',
  'r-ring': '#b48ead',
  'r-pinky': '#e08fb6',
  thumb: '#8b8d90',
};

const ROWS: Array<[string, Finger[]]> = [
  ['`1234567890-=', ['l-pinky', 'l-pinky', 'l-ring', 'l-middle', 'l-index', 'l-index', 'r-index', 'r-index', 'r-middle', 'r-ring', 'r-pinky', 'r-pinky', 'r-pinky']],
  ["qwertyuiop[]\\", ['l-pinky', 'l-ring', 'l-middle', 'l-index', 'l-index', 'r-index', 'r-index', 'r-middle', 'r-ring', 'r-pinky', 'r-pinky', 'r-pinky', 'r-pinky']],
  ["asdfghjkl;'", ['l-pinky', 'l-ring', 'l-middle', 'l-index', 'l-index', 'r-index', 'r-index', 'r-middle', 'r-ring', 'r-pinky', 'r-pinky']],
  ['zxcvbnm,./', ['l-pinky', 'l-ring', 'l-middle', 'l-index', 'l-index', 'r-index', 'r-index', 'r-middle', 'r-ring', 'r-pinky']],
];

/** Shifted symbol -> base key on a US QWERTY layout. */
const SHIFT_PAIRS: Record<string, string> = {
  '~': '`', '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6',
  '&': '7', '*': '8', '(': '9', ')': '0', _: '-', '+': '=',
  '{': '[', '}': ']', '|': '\\', ':': ';', '"': "'",
  '<': ',', '>': '.', '?': '/',
};

function buildMap(): Map<string, KeyInfo> {
  const map = new Map<string, KeyInfo>();
  ROWS.forEach(([keys, fingers], rowIdx) => {
    [...keys].forEach((ch, i) => {
      const finger = fingers[i];
      const hand: Hand = finger.startsWith('l') ? 'left' : 'right';
      map.set(ch, { finger, hand, row: rowIdx });
    });
  });
  for (const [shifted, base] of Object.entries(SHIFT_PAIRS)) {
    const info = map.get(base);
    if (info) map.set(shifted, info);
  }
  map.set(' ', { finger: 'thumb', hand: 'either', row: 4 });
  return map;
}

const KEY_MAP = buildMap();

/** Key info for a typed character (handles uppercase and shifted symbols). */
export function keyInfo(char: string): KeyInfo | null {
  if (!char) return null;
  return KEY_MAP.get(char.toLowerCase()) ?? KEY_MAP.get(char) ?? null;
}

/** True when the character requires a shift press on US QWERTY. */
export function needsShift(char: string): boolean {
  return (char >= 'A' && char <= 'Z') || char in SHIFT_PAIRS;
}

/** The unshifted key that produces this character (e.g. '!' -> '1', 'A' -> 'a'). */
export function baseChar(char: string): string {
  if (char in SHIFT_PAIRS) return SHIFT_PAIRS[char];
  return char.toLowerCase();
}

export type BigramType = 'same-finger' | 'scissor' | 'same-hand' | 'alternating' | 'repeat' | 'other';

const FINGER_ORDER: Finger[] = [
  'l-pinky', 'l-ring', 'l-middle', 'l-index', 'r-index', 'r-middle', 'r-ring', 'r-pinky',
];

/**
 * Classify the motion between two consecutive characters.
 * - same-finger: one finger has to travel between two keys (e.g. m -> u)
 * - scissor: adjacent fingers of the same hand jump between distant rows
 * - same-hand / alternating: everything else, by hand usage
 */
export function classifyBigram(a: string, b: string): BigramType {
  const ka = keyInfo(a);
  const kb = keyInfo(b);
  if (!ka || !kb || ka.finger === 'thumb' || kb.finger === 'thumb') return 'other';
  if (a.toLowerCase() === b.toLowerCase()) return 'repeat';
  if (ka.finger === kb.finger) return 'same-finger';
  if (ka.hand === kb.hand) {
    const ia = FINGER_ORDER.indexOf(ka.finger);
    const ib = FINGER_ORDER.indexOf(kb.finger);
    if (Math.abs(ia - ib) === 1 && Math.abs(ka.row - kb.row) >= 2) return 'scissor';
    return 'same-hand';
  }
  return 'alternating';
}

/** Row distance the finger travels within a same-finger bigram. */
export function rowTravel(a: string, b: string): number {
  const ka = keyInfo(a);
  const kb = keyInfo(b);
  if (!ka || !kb) return 0;
  return Math.abs(ka.row - kb.row);
}
