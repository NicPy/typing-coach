import { useLayoutEffect, useRef } from 'react';

interface Props {
  words: string[];
  typedWords: string[];
  wordIdx: number;
  running: boolean;
}

/** monkeytype-style 3-line word stream with a smooth caret. */
export function WordStream({ words, typedWords, wordIdx, running }: Props) {
  const innerRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    const caret = caretRef.current;
    if (!inner || !caret) return;
    const wordEl = inner.querySelector<HTMLElement>(`[data-widx="${wordIdx}"]`);
    if (!wordEl) return;

    const typed = typedWords[wordIdx] ?? '';
    const chars = wordEl.querySelectorAll<HTMLElement>('.char');
    let x = wordEl.offsetLeft;
    if (chars.length > 0) {
      if (typed.length < chars.length) {
        x = wordEl.offsetLeft + chars[typed.length].offsetLeft;
      } else {
        const last = chars[chars.length - 1];
        x = wordEl.offsetLeft + last.offsetLeft + last.offsetWidth;
      }
    }
    caret.style.transform = `translate(${x}px, ${wordEl.offsetTop}px)`;
    caret.style.height = `${wordEl.offsetHeight}px`;

    // keep the active line as the middle visible line once past the first
    const lineH = wordEl.offsetHeight;
    const scroll = Math.max(0, wordEl.offsetTop - lineH);
    inner.style.transform = `translateY(${-scroll}px)`;
  }, [words, typedWords, wordIdx]);

  return (
    <div className="word-stream">
      <div className="word-stream-inner" ref={innerRef}>
        <div className={`caret ${running ? '' : 'blink'}`} ref={caretRef} />
        {words.map((word, wi) => {
          const typed = typedWords[wi] ?? '';
          const submitted = wi < wordIdx;
          const wordError = submitted && typed !== word;
          const len = Math.max(word.length, typed.length);
          const chars = [];
          for (let ci = 0; ci < len; ci++) {
            let cls = 'char pending';
            let text = word[ci] ?? typed[ci];
            if (ci < typed.length) {
              if (ci >= word.length) {
                cls = 'char extra';
                text = typed[ci];
              } else {
                cls = typed[ci] === word[ci] ? 'char correct' : 'char incorrect';
              }
            }
            chars.push(
              <span className={cls} key={ci}>
                {text}
              </span>,
            );
          }
          return (
            <span className={`word ${wordError ? 'word-error' : ''}`} data-widx={wi} key={wi}>
              {chars}
            </span>
          );
        })}
      </div>
    </div>
  );
}
