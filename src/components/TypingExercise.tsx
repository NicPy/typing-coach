import { useCallback, useEffect, useRef, useState } from 'react';
import type { Drill } from '../engine/drills';
import { computeMetrics, type SessionMetrics } from '../engine/metrics';
import { generateHints, type Hint } from '../engine/hints';
import {
  addTodo,
  findTodo,
  getSettings,
  saveResult,
  updateAggregates,
} from '../storage/localStore';
import type { SessionKind } from '../engine/session';
import { useTypingSession, type RawFinish } from '../hooks/useTypingSession';
import { WordStream } from './WordStream';
import { Keyboard } from './Keyboard';
import { Results } from './Results';

interface Props {
  drill: Drill;
  kind: Exclude<SessionKind, 'test'>;
  onExit: () => void;
  onDrill?: (hint: Hint) => void;
  onSessionSaved: (wpm: number) => void;
}

interface Outcome {
  metrics: SessionMetrics;
  hints: Hint[];
}

/** Self-contained words-mode exercise used by the training page. */
export function TypingExercise({ drill, kind, onExit, onDrill, onSessionSaved }: Props) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [isTodo, setIsTodo] = useState(() => Boolean(findTodo(drill, kind)));
  const [settings] = useState(() => getSettings());

  const labelRef = useRef(drill.label);
  labelRef.current = drill.label;
  const kindRef = useRef(kind);
  kindRef.current = kind;

  const handleFinish = useCallback((raw: RawFinish) => {
    const metrics = computeMetrics(raw.log, raw.durationMs);
    const hints = generateHints(metrics, 2);
    if (metrics.charCount >= 10) {
      saveResult(metrics, hints, kindRef.current, labelRef.current);
      updateAggregates(metrics);
      onSessionSaved(metrics.wpm);
    }
    setOutcome({ metrics, hints });
  }, [onSessionSaved]);

  const session = useTypingSession({
    words: drill.words,
    mode: 'words',
    durationSec: 0,
    enabled: outcome === null,
    onFinish: handleFinish,
  });

  const resetSession = session.reset;
  const again = useCallback(() => {
    setOutcome(null);
    resetSession();
  }, [resetSession]);

  const addExerciseToTodos = useCallback(() => {
    addTodo(drill, kind);
    setIsTodo(true);
  }, [drill, kind]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        again();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [again, onExit]);

  const running = session.phase === 'running';
  const currentWord = drill.words[session.wordIdx] ?? '';
  const typedNow = session.typedWords[session.wordIdx] ?? '';
  const nextChar = typedNow.length < currentWord.length ? currentWord[typedNow.length] : ' ';

  return (
    <div className="exercise">
      <div className="exercise-head">
        <div>
          <h3 className="exercise-title">{drill.label}</h3>
          <p className="sub">{drill.description}</p>
        </div>
        <button className="btn btn-small" onClick={onExit}>
          back <span className="key-cap">esc</span>
        </button>
      </div>

      {outcome ? (
        <Results
          metrics={outcome.metrics}
          hints={outcome.hints}
          label={drill.label}
          onRestart={again}
          onDrill={onDrill}
          compact
          isTodo={isTodo}
          onAddTodo={addExerciseToTodos}
        />
      ) : (
        <>
          <div className="live-stats">
            <span className="accent">
              {Math.min(session.wordIdx, drill.words.length)}/{drill.words.length}
            </span>
            {running && session.liveWpm > 0 && <span>{session.liveWpm.toFixed(0)} wpm</span>}
          </div>
          <WordStream
            words={drill.words}
            typedWords={session.typedWords}
            wordIdx={session.wordIdx}
            running={running}
          />
          <p className="hint-line sub">
            just start typing · <span className="key-cap">tab</span> restart
          </p>
        </>
      )}

      {settings.showKeyboard && (
        <Keyboard
          activeCodes={session.activeCodes}
          nextChar={outcome ? null : nextChar}
          highlightNext={settings.highlightNextKey && !outcome}
        />
      )}
    </div>
  );
}
