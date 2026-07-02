/** ~200 most common English words (same corpus style as monkeytype's "english"). */
export const WORDS_EN = [
  'the', 'be', 'of', 'and', 'a', 'to', 'in', 'he', 'have', 'it',
  'that', 'for', 'they', 'with', 'as', 'not', 'on', 'she', 'at', 'by',
  'this', 'we', 'you', 'do', 'but', 'from', 'or', 'which', 'one', 'would',
  'all', 'will', 'there', 'say', 'who', 'make', 'when', 'can', 'more', 'if',
  'no', 'man', 'out', 'other', 'so', 'what', 'time', 'up', 'go', 'about',
  'than', 'into', 'could', 'state', 'only', 'new', 'year', 'some', 'take', 'come',
  'these', 'know', 'see', 'use', 'get', 'like', 'then', 'first', 'any', 'work',
  'now', 'may', 'such', 'give', 'over', 'think', 'most', 'even', 'find', 'day',
  'also', 'after', 'way', 'many', 'must', 'look', 'before', 'great', 'back', 'through',
  'long', 'where', 'much', 'should', 'well', 'people', 'down', 'own', 'just', 'because',
  'good', 'each', 'those', 'feel', 'seem', 'how', 'high', 'too', 'place', 'little',
  'world', 'very', 'still', 'nation', 'hand', 'old', 'life', 'tell', 'write', 'become',
  'here', 'show', 'house', 'both', 'between', 'need', 'mean', 'call', 'develop', 'under',
  'last', 'right', 'move', 'thing', 'general', 'school', 'never', 'same', 'another', 'begin',
  'while', 'number', 'part', 'turn', 'real', 'leave', 'might', 'want', 'point', 'form',
  'off', 'child', 'few', 'small', 'since', 'against', 'ask', 'late', 'home', 'interest',
  'large', 'person', 'end', 'open', 'public', 'follow', 'during', 'present', 'without', 'again',
  'hold', 'govern', 'around', 'possible', 'head', 'consider', 'word', 'program', 'problem', 'however',
  'lead', 'system', 'set', 'order', 'eye', 'plan', 'run', 'keep', 'face', 'fact',
  'group', 'play', 'stand', 'increase', 'early', 'course', 'change', 'help', 'line', 'city',
];

const PUNCT_END = ['.', ',', '!', '?', ';', ':'];

export interface GeneratorOptions {
  punctuation: boolean;
  numbers: boolean;
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Generate a stream of practice words, optionally decorated with capitals/punctuation/numbers. */
export function generateWords(count: number, opts: GeneratorOptions): string[] {
  const out: string[] = [];
  let prev = '';
  let capitalizeNext = opts.punctuation; // sentences start with a capital
  while (out.length < count) {
    let word = rand(WORDS_EN);
    if (word === prev) continue;
    prev = word;
    if (opts.numbers && Math.random() < 0.12) {
      word = String(Math.floor(Math.random() * 10000));
    } else if (opts.punctuation) {
      if (capitalizeNext || Math.random() < 0.12) {
        word = word[0].toUpperCase() + word.slice(1);
        capitalizeNext = false;
      }
      const r = Math.random();
      if (r < 0.15) {
        const p = rand(PUNCT_END);
        word += p;
        if (p === '.' || p === '!' || p === '?') capitalizeNext = true;
      } else if (r < 0.19) {
        word = `"${word}"`;
      } else if (r < 0.22) {
        word = `(${word})`;
      } else if (r < 0.25) {
        word += "'s";
      }
    }
    out.push(word);
  }
  return out;
}
