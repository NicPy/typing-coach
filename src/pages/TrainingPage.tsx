import { useMemo, useState } from 'react';
import { LESSONS } from '../data/lessons';
import { bigramDrill, drillFromSeed, fingerDrill, shiftDrill, type Drill } from '../engine/drills';
import { classifyBigram, FINGER_LABELS, type Finger } from '../engine/fingerMap';
import type { DrillSeed, Hint } from '../engine/hints';
import { getAggregates } from '../storage/localStore';
import { TypingExercise } from '../components/TypingExercise';

interface Props {
  /** drill requested from a test's results screen, if any */
  pendingSeed: DrillSeed | null;
  clearPendingSeed: () => void;
  onSessionSaved: () => void;
}

interface ActiveDrill {
  drill: Drill;
  kind: 'lesson' | 'drill';
}

interface WeakSpots {
  bigrams: Array<{ bigram: string; meanMs: number; count: number }>;
  weakFinger: { finger: Finger; meanMs: number } | null;
  shiftFlagged: boolean;
  sessions: number;
}

function findWeakSpots(): WeakSpots {
  const agg = getAggregates();
  const entries = Object.entries(agg.bigrams).filter(([, v]) => v.count >= 6);
  const overall =
    entries.length > 0
      ? entries.reduce((acc, [, v]) => acc + v.meanMs, 0) / entries.length
      : 0;
  const bigrams = entries
    .filter(([b, v]) => {
      const type = classifyBigram(b[0], b[1]);
      const factor = type === 'same-finger' || type === 'scissor' ? 1.25 : 1.5;
      return v.meanMs > overall * factor;
    })
    .map(([bigram, v]) => ({ bigram, meanMs: v.meanMs, count: v.count }))
    .sort((a, b) => b.meanMs - a.meanMs)
    .slice(0, 4);

  const fingers = Object.entries(agg.fingers)
    .filter(([f, v]) => f !== 'thumb' && v.count >= 40)
    .map(([f, v]) => ({ finger: f as Finger, meanMs: v.meanMs }));
  const fingerMean =
    fingers.length > 0 ? fingers.reduce((a, f) => a + f.meanMs, 0) / fingers.length : 0;
  const worst = [...fingers].sort((a, b) => b.meanMs - a.meanMs)[0];
  const weakFinger = worst && worst.meanMs > fingerMean * 1.25 ? worst : null;

  return {
    bigrams,
    weakFinger,
    shiftFlagged: agg.sameHandShiftSessions >= 2,
    sessions: agg.sessionCount,
  };
}

export function TrainingPage({ pendingSeed, clearPendingSeed, onSessionSaved }: Props) {
  const [active, setActive] = useState<ActiveDrill | null>(() =>
    pendingSeed ? { drill: drillFromSeed(pendingSeed), kind: 'drill' } : null,
  );
  const [seq, setSeq] = useState(0);
  const weak = useMemo(findWeakSpots, [active]);

  const startActive = (a: ActiveDrill) => {
    setActive(a);
    setSeq((s) => s + 1);
  };

  const exit = () => {
    setActive(null);
    clearPendingSeed();
  };

  const startFromHint = (hint: Hint) => {
    if (hint.drill) startActive({ drill: drillFromSeed(hint.drill), kind: 'drill' });
  };

  if (active) {
    return (
      <div className="page">
        <TypingExercise
          key={seq}
          drill={active.drill}
          kind={active.kind}
          onExit={exit}
          onDrill={startFromHint}
          onSessionSaved={onSessionSaved}
        />
      </div>
    );
  }

  return (
    <div className="page training-page">
      <section>
        <h2>your weak spots</h2>
        <p className="sub">
          Generated from your saved sessions — the more you type, the sharper these get.
        </p>
        {weak.sessions < 2 && weak.bigrams.length === 0 ? (
          <p className="sub empty-note">
            Not enough data yet. Finish a couple of typing tests first, then come back.
          </p>
        ) : (
          <div className="card-grid">
            {weak.bigrams.length > 0 && (
              <div className="card">
                <h3>slow pairs</h3>
                <p className="sub">
                  {weak.bigrams
                    .map((b) => `${b.bigram[0]}→${b.bigram[1]} (${Math.round(b.meanMs)}ms)`)
                    .join(', ')}
                </p>
                <button
                  className="btn"
                  onClick={() =>
                    startActive({ drill: bigramDrill(weak.bigrams.map((b) => b.bigram)), kind: 'drill' })
                  }
                >
                  drill these pairs
                </button>
              </div>
            )}
            {weak.weakFinger && (
              <div className="card">
                <h3>lagging finger</h3>
                <p className="sub">
                  Your {FINGER_LABELS[weak.weakFinger.finger]} averages{' '}
                  {Math.round(weak.weakFinger.meanMs)}ms per key — slowest of all fingers.
                </p>
                <button
                  className="btn"
                  onClick={() => startActive({ drill: fingerDrill(weak.weakFinger!.finger), kind: 'drill' })}
                >
                  train it
                </button>
              </div>
            )}
            {weak.shiftFlagged && (
              <div className="card">
                <h3>shift technique</h3>
                <p className="sub">
                  Several sessions flagged same-hand shift usage. Retrain the opposite-pinky habit.
                </p>
                <button className="btn" onClick={() => startActive({ drill: shiftDrill(), kind: 'drill' })}>
                  shift drill
                </button>
              </div>
            )}
            {weak.bigrams.length === 0 && !weak.weakFinger && !weak.shiftFlagged && (
              <p className="sub empty-note">
                Nothing stands out across your recent sessions — keep testing and check back.
              </p>
            )}
          </div>
        )}
      </section>

      <section>
        <h2>best practices</h2>
        <p className="sub">
          The habits that move typing speed the most, in order. Read the note, then run the drill.
        </p>
        <div className="lesson-list">
          {LESSONS.map((lesson) => (
            <div className="lesson" key={lesson.id}>
              <div className="lesson-body">
                <h3>{lesson.title}</h3>
                <p className="sub">{lesson.summary}</p>
              </div>
              <button
                className="btn"
                onClick={() => startActive({ drill: lesson.makeDrill(), kind: 'lesson' })}
              >
                practice
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
