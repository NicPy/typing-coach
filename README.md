# typing coach

A monkeytype-style typing trainer with a built-in coach. Every run records per-keystroke
timings; when the session ends the coach explains *why* you were slow — slow same-finger
transitions (like `m→u`), shift technique, rhythm breaks, error spirals — and generates
targeted drills for exactly those weaknesses.

## Features

- **Typing test** — time (15/30/60/120s) or word-count modes, punctuation & numbers
  toggles, live wpm, smooth caret, `tab` to restart.
- **Finger-mapped keyboard** — on-screen QWERTY keyboard colored by finger, with live
  key highlighting and an optional "next key + finger" teaching highlight.
- **Coach's notes** — post-session analysis of your keystroke log: slowest bigrams vs
  your own baseline, same-finger row jumps, which shift hand you used, pauses around
  capitals, consistency, per-finger speed, post-error behavior, word-start hesitation.
- **Training page** — a best-practices curriculum (home row, accuracy-first,
  opposite-hand shift, bigram flow, same-finger jumps, rhythm) plus personalized drills
  generated from your accumulated weak spots.
- **Exercise todos** — save a completed drill for another day, start it again from the
  todos page, and keep it queued until the result feels satisfactory.
- **Stats** — run history with dates, wpm trend, every hint the coach ever gave, and a
  user-set target wpm with progress tracking.

All data stays in your browser's localStorage. No accounts, no server.

## Run

```bash
npm install
npm run dev    # start dev server
npm test       # unit tests for the analytics + hints engine
npm run build  # type-check + production build
```
