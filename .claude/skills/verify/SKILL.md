---
name: verify
description: Build, launch, and drive typing-coach end-to-end (headless Chrome + CDP) to verify UI/engine changes at the real surface.
---

# Verifying typing-coach changes

No Playwright/chromium-cli on this Mac. Use headless Chrome + a Node CDP script
over native WebSocket.

## Launch

```bash
npm run dev &   # Vite on http://localhost:5173
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --remote-debugging-port=9222 \
  --user-data-dir=<scratchpad>/chrome-profile --window-size=1200,1400 about:blank &
```

Pages deep-link via hash: `#training`, `#stats` (default is the test page).

## Drive (Node .mjs, no deps)

- Target: `fetch('http://localhost:9222/json')` → first `type === 'page'`, connect
  `new WebSocket(t.webSocketDebuggerUrl)`, JSON-RPC `{id, method, params}`.
- Navigate: `Page.navigate`, wait ~1.5s. Screenshot: `Page.captureScreenshot` → write base64.
- Query DOM: `Runtime.evaluate` with `returnByValue: true`.
- Type for real (the app listens to window keydown, uses `e.key` + `e.code` for shift side):
  `Input.dispatchKeyEvent` — `keyDown` with `key`+`text` (+`modifiers: 8` and a
  `rawKeyDown` Shift with `code: 'ShiftLeft'` first for shifted chars), then `keyUp`.
  Backspace/Escape: `rawKeyDown` with `windowsVirtualKeyCode`.
- Words on screen: `[...document.querySelectorAll('.word')].map(w => w.textContent)`;
  per-char state classes: `.char.correct/.incorrect/.extra`; active word `[data-widx="N"]`.
- Space submits a word; the last word finishes the run on its final correct char.
- Saved sessions: `localStorage` key `tc.results` (label/kind/wpm), settings `tc.settings`.

A known-good script template: drive a drill by reading `.word` texts and typing them
back, with a deliberate wrong char + backspace as a probe. Rebuild it from this recipe
(~80 lines) in the scratchpad; keep screenshots there too.

## Gotchas

- Drill "words" must never contain spaces (space = submit word).
- All drill chars must be mapped by `keyInfo()` (`src/engine/fingerMap.ts`) or
  analytics silently skip them — `src/data/codingDrills.test.ts` guards this for
  the coding drills.
- Perf constraint: keystrokes must not re-render the whole `WordStream` (memoized);
  don't add fresh object/closure props to it when touching `TypingExercise`.
