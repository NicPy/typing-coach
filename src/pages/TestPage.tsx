import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generateWords } from '../data/words-en';
import { computeMetrics, type SessionMetrics } from '../engine/metrics';
import { generateHints, type Hint } from '../engine/hints';
import {
  addTestTodo,
  findTestTodo,
  getSettings,
  saveResult,
  saveSettings,
  updateAggregates,
  type Settings,
  type StoredTestTodo,
} from '../storage/localStore';
import { useTypingSession, type RawFinish } from '../hooks/useTypingSession';
import { WordStream } from '../components/WordStream';
import { Keyboard } from '../components/Keyboard';
import { ConfigBar } from '../components/ConfigBar';
import { Results } from '../components/Results';

interface Props {
  onDrill: (hint: Hint) => void;
  onSessionSaved: () => void;
  initialTodo?: StoredTestTodo;
  onExit?: () => void;
}

interface Outcome {
  metrics: SessionMetrics;
  hints: Hint[];
}

export function TestPage({ onDrill, onSessionSaved, initialTodo, onExit }: Props) {
  const [settings, setSettings] = useState<Settings>(() =>
    initialTodo ? settingsForTodo(initialTodo) : getSettings(),
  );
  const [seed, setSeed] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [words, setWords] = useState<string[]>(() =>
    initialTodo ? [...initialTodo.words] : initialWords(getSettings()),
  );
  const [isTodo, setIsTodo] = useState(Boolean(initialTodo));

  const label = useMemo(
    () =>
      settings.mode === 'time' ? `time ${settings.durationSec}` : `words ${settings.wordCount}`,
    [settings],
  );
  const labelRef = useRef(label);
  labelRef.current = label;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const wordsRef = useRef(words);
  wordsRef.current = words;

  const handleFinish = useCallback((raw: RawFinish) => {
    const metrics = computeMetrics(raw.log, raw.durationMs);
    const hints = generateHints(metrics);
    setIsTodo(Boolean(findTestTodo(settingsRef.current, wordsRef.current)));
    if (metrics.charCount >= 10) {
      saveResult(metrics, hints, 'test', labelRef.current);
      updateAggregates(metrics);
      onSessionSaved();
    }
    setOutcome({ metrics, hints });
  }, [onSessionSaved]);

  const session = useTypingSession({
    words,
    mode: settings.mode,
    durationSec: settings.durationSec,
    enabled: outcome === null,
    onFinish: handleFinish,
  });

  const resetSession = session.reset;
  const restart = useCallback(
    (patch?: Partial<Settings>) => {
      const next = initialTodo && !patch
        ? settingsForTodo(initialTodo)
        : patch
          ? saveSettings(patch)
          : getSettings();
      setSettings(next);
      setWords(initialTodo && !patch ? [...initialTodo.words] : initialWords(next));
      setOutcome(null);
      setIsTodo(Boolean(initialTodo));
      resetSession();
      setSeed((s) => s + 1);
    },
    [initialTodo, resetSession],
  );

  // tab restarts, esc restarts from results too
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && initialTodo && onExit) {
        e.preventDefault();
        onExit();
      } else if (e.key === 'Tab' || (e.key === 'Escape' && outcome)) {
        e.preventDefault();
        restart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [initialTodo, onExit, restart, outcome]);

  // time mode: extend the word stream as the user approaches the end
  useEffect(() => {
    if (settings.mode === 'time' && session.wordIdx > words.length - 40) {
      setWords((w) => [...w, ...generateWords(60, settings)]);
    }
  }, [session.wordIdx, settings, words.length]);

  const running = session.phase === 'running';
  const currentWord = words[session.wordIdx] ?? '';
  const typedNow = session.typedWords[session.wordIdx] ?? '';
  const nextChar = typedNow.length < currentWord.length ? currentWord[typedNow.length] : ' ';

  const addTestToTodos = useCallback(() => {
    addTestTodo(settingsRef.current, wordsRef.current);
    setIsTodo(true);
  }, []);

  return (
    <div className="test-layout" key={seed}>
      <div className="page test-page">
        {initialTodo ? (
          <div className="exercise-head">
            <div>
              <h3 className="exercise-title">{initialTodo.label}</h3>
              <p className="sub">{initialTodo.description}</p>
            </div>
            {onExit && (
              <button className="btn btn-small" onClick={onExit}>
                back <span className="key-cap">esc</span>
              </button>
            )}
          </div>
        ) : (
          <div className={`fade ${running ? 'faded' : ''}`}>
            <ConfigBar settings={settings} onChange={restart} />
          </div>
        )}

        {outcome ? (
          <Results
            metrics={outcome.metrics}
            hints={outcome.hints}
            label={label}
            onRestart={() => restart()}
            onDrill={onDrill}
            isTodo={isTodo}
            onAddTodo={addTestToTodos}
          />
        ) : (
          <>
            <div className="live-stats">
              <span className="accent">
                {settings.mode === 'time'
                  ? `${Math.max(0, settings.durationSec - Math.floor(session.elapsedMs / 1000))}`
                  : `${Math.min(session.wordIdx, settings.wordCount)}/${settings.wordCount}`}
              </span>
              {running && session.liveWpm > 0 && <span>{session.liveWpm.toFixed(0)} wpm</span>}
            </div>
            <WordStream
              words={words}
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
    </div>
  );
}

function initialWords(settings: Settings): string[] {
  const count = settings.mode === 'time' ? 120 : settings.wordCount;
  return generateWords(count, settings);
}

function settingsForTodo(todo: StoredTestTodo): Settings {
  return { ...getSettings(), ...todo.settings };
}
