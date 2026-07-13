import { shuffle, type Drill } from '../engine/drills';
import type { Lesson } from './lessons';

/** Shuffled passes over the token list until targetLen words. */
function repeatTokens(tokens: string[], targetLen: number): string[] {
  const words: string[] = [];
  while (words.length < targetLen) words.push(...shuffle(tokens));
  return words.slice(0, targetLen);
}

/** Real code lines in shuffled order, split into space-separated tokens; never cuts mid-line. */
function fromLines(lines: string[], targetLen: number): string[] {
  const words: string[] = [];
  while (words.length < targetLen) {
    for (const line of shuffle(lines)) {
      words.push(...line.split(' '));
      if (words.length >= targetLen) break;
    }
  }
  return words;
}

const SYMBOL_CLUSTERS = [
  '();', '{}', '[]', '=>', '->', '!==', '===', '&&', '||', '??', '?.', '${}', '</>', '::', '>=', '+=',
];

const IDENTIFIERS = [
  'getUserById', 'handleClick', 'useState', 'onKeyDown', 'isLoading', 'maxRetries',
  'addEventListener', 'fetchData', 'setTimeout', 'querySelector', 'toLowerCase', 'parseFloat',
  'TypeError', 'KeyboardEvent', 'ReadonlySet',
  'user_id', 'max_length', 'is_valid', 'created_at', 'parse_args', 'to_string', 'get_or_create', '__init__',
];

const KEYWORDS = [
  'const', 'let', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'from',
  'export', 'default', 'async', 'await', 'class', 'interface', 'type', 'extends', 'new',
  'this', 'null', 'undefined', 'true', 'false', 'try', 'catch', 'throw', 'switch', 'case',
  'break', 'continue', 'typeof', 'def', 'self', 'elif', 'lambda', 'None', 'True', 'False',
  'yield', 'static', 'print', 'range', 'len',
];

const IDIOM_LINES = [
  'const user = await getUser(id);',
  'if (x !== null) {',
  'return items.map((x) => x * 2);',
  "console.log('done');",
  '} else {',
  'export default function App() {',
  'const [open, setOpen] = useState(false);',
  "import { useEffect } from 'react';",
  "throw new Error('nope');",
  'data?.items ?? [];',
  "names.filter(Boolean).join(',');",
  'a === b ? a : b;',
];

const NUMBER_LINES = [
  'for (let i = 0; i < 100; i++) {',
  'const max = 2 ** 31 - 1;',
  'port = 8080',
  'rgb(255, 128, 0)',
  'arr[42] = arr[7] + 1;',
  'x = 3.14 * r ** 2',
  'if (code >= 400 && code < 500) {',
  'timeout = 1e9',
  '0xff & 0x0f',
  'v2.1.0',
];

const TERMINAL_LINES = [
  'git status',
  'git add -A',
  'git commit -m "fix"',
  'git push origin main',
  'git checkout -b fix/typo',
  'npm install',
  'npm run dev',
  'cd ../src && ls -la',
  'mkdir -p src/utils',
  'grep -rn TODO src/',
  'docker compose up -d',
  'curl -s localhost:8080/health',
];

/** Coding curriculum: the symbols, identifiers, and numbers prose typing never trains. */
export const CODING_DRILLS: Lesson[] = [
  {
    id: 'symbol-clusters',
    title: 'Symbol clusters',
    summary:
      'Punctuation is where prose typists lose half their speed: (); {} => !== all live on the ' +
      'shifted number row and the pinkies. Drill each cluster until it fires as one motion, not a ' +
      'hunt — opposite-pinky shift, then straight back to home row.',
    makeDrill: (): Drill => ({
      label: 'symbol clusters',
      description:
        'Each cluster is one motion, not two or three keystrokes. Slow is fine — never look down to find a symbol.',
      words: repeatTokens(SYMBOL_CLUSTERS, 40),
    }),
  },
  {
    id: 'identifier-case',
    title: 'camelCase & snake_case',
    summary:
      'Identifiers put Shift and underscores in the MIDDLE of words — something prose never does. ' +
      'The opposite pinky presses Shift for a mid-word capital and the hand snaps back; the ' +
      'underscore is a pinky reach that must not drag the rest of the hand off the home row.',
    makeDrill: (): Drill => ({
      label: 'identifier case',
      description:
        'Mid-word capitals use the OPPOSITE pinky for Shift. Keep the rhythm even through the underscore reaches.',
      words: repeatTokens(IDENTIFIERS, 30),
    }),
  },
  {
    id: 'keywords',
    title: 'Keywords on autopilot',
    summary:
      'You type return, const, and def thousands of times — they are the "th" and "the" of code. ' +
      'Making the keyword vocabulary fully automatic frees your attention for the logic between ' +
      'the keywords instead of the letters inside them.',
    makeDrill: (): Drill => ({
      label: 'language keywords',
      description: 'Common JS/TS and Python keywords. Type each as a single burst, like a familiar word.',
      words: repeatTokens(KEYWORDS, 40),
    }),
  },
  {
    id: 'code-idioms',
    title: 'Real-code lines',
    summary:
      'Keywords, identifiers, and symbols combined the way real code strings them together: bracket ' +
      'after keyword, arrow after parens, semicolon to close. This is where the separate skills ' +
      'become sentences — aim for flow across the whole line.',
    makeDrill: (): Drill => ({
      label: 'code idioms',
      description: 'Fragments of real code lines. Keep your eyes a token ahead, exactly like reading prose.',
      words: fromLines(IDIOM_LINES, 36),
    }),
  },
  {
    id: 'number-row',
    title: 'Number row',
    summary:
      'Code hits digits far more than prose: indices, ports, hex, versions. The number row is the ' +
      'longest reach on the board and most people leave home row to find it — practice reaching up ' +
      'with one finger and coming straight back down.',
    makeDrill: (): Drill => ({
      label: 'number row',
      description: 'Digits in real contexts. Reach from the home row — do not float the whole hand up.',
      words: fromLines(NUMBER_LINES, 36),
    }),
  },
  {
    id: 'terminal',
    title: 'Terminal & git',
    summary:
      'Shell commands lean on hyphens, dots, and slashes: flags like -m, paths like ../src. A ' +
      'fumbled command costs more than fumbled prose — there is no backspace after Enter — so ' +
      'accuracy matters double here.',
    makeDrill: (): Drill => ({
      label: 'terminal & git',
      description: 'Everyday shell and git commands. Watch the hyphens and dots — accuracy over speed.',
      words: fromLines(TERMINAL_LINES, 30),
    }),
  },
];
