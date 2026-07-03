import { memo } from 'react';
import { baseChar, needsShift, keyInfo, FINGER_COLORS, FINGER_LABELS, type Finger } from '../engine/fingerMap';

interface KeyDef {
  code: string;
  label: string;
  /** character this key produces unshifted; used for finger mapping + next-key highlight */
  char?: string;
  finger?: Finger;
  width: number;
}

const k = (code: string, label: string, char: string, width = 1): KeyDef => ({ code, label, char, width });
const mod = (code: string, label: string, width: number, finger?: Finger): KeyDef => ({ code, label, width, finger });

const ROWS: KeyDef[][] = [
  [
    k('Backquote', '`', '`'), k('Digit1', '1', '1'), k('Digit2', '2', '2'), k('Digit3', '3', '3'),
    k('Digit4', '4', '4'), k('Digit5', '5', '5'), k('Digit6', '6', '6'), k('Digit7', '7', '7'),
    k('Digit8', '8', '8'), k('Digit9', '9', '9'), k('Digit0', '0', '0'), k('Minus', '-', '-'),
    k('Equal', '=', '='), mod('Backspace', 'bksp', 2, 'r-pinky'),
  ],
  [
    mod('Tab', 'tab', 1.5, 'l-pinky'),
    k('KeyQ', 'q', 'q'), k('KeyW', 'w', 'w'), k('KeyE', 'e', 'e'), k('KeyR', 'r', 'r'),
    k('KeyT', 't', 't'), k('KeyY', 'y', 'y'), k('KeyU', 'u', 'u'), k('KeyI', 'i', 'i'),
    k('KeyO', 'o', 'o'), k('KeyP', 'p', 'p'), k('BracketLeft', '[', '['), k('BracketRight', ']', ']'),
    k('Backslash', '\\', '\\', 1.5),
  ],
  [
    mod('CapsLock', 'caps', 1.75),
    k('KeyA', 'a', 'a'), k('KeyS', 's', 's'), k('KeyD', 'd', 'd'), k('KeyF', 'f', 'f'),
    k('KeyG', 'g', 'g'), k('KeyH', 'h', 'h'), k('KeyJ', 'j', 'j'), k('KeyK', 'k', 'k'),
    k('KeyL', 'l', 'l'), k('Semicolon', ';', ';'), k('Quote', "'", "'"),
    mod('Enter', 'enter', 2.25, 'r-pinky'),
  ],
  [
    mod('ShiftLeft', 'shift', 2.25, 'l-pinky'),
    k('KeyZ', 'z', 'z'), k('KeyX', 'x', 'x'), k('KeyC', 'c', 'c'), k('KeyV', 'v', 'v'),
    k('KeyB', 'b', 'b'), k('KeyN', 'n', 'n'), k('KeyM', 'm', 'm'), k('Comma', ',', ','),
    k('Period', '.', '.'), k('Slash', '/', '/'),
    mod('ShiftRight', 'shift', 2.75, 'r-pinky'),
  ],
  [
    mod('ControlLeft', 'ctrl', 1.5), mod('AltLeft', 'alt', 1.5),
    k('Space', '', ' ', 7), mod('AltRight', 'alt', 1.5), mod('ControlRight', 'ctrl', 1.5),
  ],
];

const LEGEND: Finger[] = [
  'l-pinky', 'l-ring', 'l-middle', 'l-index', 'r-index', 'r-middle', 'r-ring', 'r-pinky',
];

interface Props {
  activeCodes: ReadonlySet<string>;
  /** next character the user should type; highlighted with its finger when enabled */
  nextChar?: string | null;
  highlightNext: boolean;
}

export const Keyboard = memo(function Keyboard({ activeCodes, nextChar, highlightNext }: Props) {
  let nextBase: string | null = null;
  let nextShiftCode: string | null = null;
  if (highlightNext && nextChar) {
    nextBase = baseChar(nextChar);
    if (needsShift(nextChar)) {
      const hand = keyInfo(nextChar)?.hand;
      // opposite-hand pinky presses shift
      nextShiftCode = hand === 'left' ? 'ShiftRight' : hand === 'right' ? 'ShiftLeft' : null;
    }
  }

  return (
    <div className="keyboard">
      {ROWS.map((row, ri) => (
        <div className="kb-row" key={ri}>
          {row.map((key) => {
            const finger = key.finger ?? (key.char ? keyInfo(key.char)?.finger : undefined);
            const color = finger ? FINGER_COLORS[finger] : undefined;
            const isActive = activeCodes.has(key.code);
            const isNext = (nextBase !== null && key.char === nextBase) || key.code === nextShiftCode;
            return (
              <div
                key={key.code}
                className={`kb-key ${isActive ? 'kb-active' : ''} ${isNext ? 'kb-next' : ''}`}
                style={{
                  flexGrow: key.width,
                  flexBasis: 0,
                  ...(color
                    ? {
                        backgroundColor: `${color}26`,
                        borderColor: isNext || isActive ? color : `${color}55`,
                        ...(isNext ? { boxShadow: `0 0 8px ${color}88` } : {}),
                      }
                    : {}),
                }}
                title={finger ? FINGER_LABELS[finger] : undefined}
              >
                {key.label}
              </div>
            );
          })}
        </div>
      ))}
      <div className="kb-legend">
        {LEGEND.map((f) => (
          <span className="kb-legend-item" key={f}>
            <span className="kb-legend-dot" style={{ backgroundColor: FINGER_COLORS[f] }} />
            {FINGER_LABELS[f]}
          </span>
        ))}
      </div>
    </div>
  );
});
