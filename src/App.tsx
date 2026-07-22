import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { TestPage } from './pages/TestPage';
import { TrainingPage } from './pages/TrainingPage';
import { StatsPage } from './pages/StatsPage';
import { TodosPage } from './pages/TodosPage';
import type { DrillSeed, Hint } from './engine/hints';
import { CalendarTimeline } from './components/CalendarTimeline';
import { CrownIcon } from './components/CrownIcon';
import { getHighestWpm } from './storage/localStore';

const PersonalBestCelebration = lazy(() =>
  import('./components/PersonalBestCelebration').then((module) => ({
    default: module.PersonalBestCelebration,
  })),
);

type Page = 'test' | 'training' | 'stats' | 'todos';

interface RecordMoment {
  id: number;
  score: number;
  previousBest: number;
}

function pageFromHash(): Page {
  if (typeof window === 'undefined') return 'test';
  const h = window.location.hash.replace('#', '');
  return h === 'training' || h === 'stats' || h === 'todos' ? h : 'test';
}

export default function App() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [pendingSeed, setPendingSeed] = useState<DrillSeed | null>(null);
  const [timelineVersion, setTimelineVersion] = useState(0);
  const [bestWpm, setBestWpm] = useState(getHighestWpm);
  const [recordMoment, setRecordMoment] = useState<RecordMoment | null>(null);
  const bestWpmRef = useRef(bestWpm);

  const handleSessionSaved = useCallback((wpm: number) => {
    setTimelineVersion((version) => version + 1);
    const score = Math.round(wpm);
    if (score <= bestWpmRef.current) return;

    const previousBest = bestWpmRef.current;
    bestWpmRef.current = score;
    setBestWpm(score);
    setRecordMoment({ id: Date.now(), score, previousBest });
  }, []);

  useEffect(() => {
    window.history.replaceState(null, '', page === 'test' ? '#' : `#${page}`);
  }, [page]);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goDrill = (hint: Hint) => {
    if (!hint.drill) return;
    setPendingSeed(hint.drill);
    setPage('training');
  };

  return (
    <div className="app has-calendar">
      <header className="header">
        <button className="logo" onClick={() => setPage('test')}>
          <span className="logo-icon">⌨</span> typing coach
        </button>
        <nav className="nav">
          <button className={page === 'test' ? 'on' : ''} onClick={() => setPage('test')}>
            test
          </button>
          <button className={page === 'training' ? 'on' : ''} onClick={() => setPage('training')}>
            training
          </button>
          <button className={page === 'stats' ? 'on' : ''} onClick={() => setPage('stats')}>
            stats
          </button>
          <button className={page === 'todos' ? 'on' : ''} onClick={() => setPage('todos')}>
            todos
          </button>
          <div
            className={`best-wpm${bestWpm > 0 ? ' has-record' : ''}`}
            aria-label={bestWpm > 0 ? `Personal best: ${bestWpm} words per minute` : 'No personal best yet'}
            title="personal best"
          >
            <CrownIcon className="best-wpm-crown" />
            <span className="best-wpm-score">{bestWpm > 0 ? bestWpm : '—'}</span>
            <span className="best-wpm-unit">wpm</span>
          </div>
        </nav>
      </header>

      <main className="main">
        {page === 'test' && <TestPage onDrill={goDrill} onSessionSaved={handleSessionSaved} />}
        {page === 'training' && (
          <TrainingPage
            key={pendingSeed ? 'seeded' : 'plain'}
            pendingSeed={pendingSeed}
            clearPendingSeed={() => setPendingSeed(null)}
            onSessionSaved={handleSessionSaved}
          />
        )}
        {page === 'stats' && <StatsPage />}
        {page === 'todos' && <TodosPage onSessionSaved={handleSessionSaved} onDrill={goDrill} />}
      </main>

      <footer className="footer sub">
        data stays in your browser (localStorage) · qwerty · finger colors match the legend
      </footer>

      <CalendarTimeline refreshKey={timelineVersion} />

      {recordMoment && (
        <Suspense fallback={null}>
          <PersonalBestCelebration
            key={recordMoment.id}
            score={recordMoment.score}
            previousBest={recordMoment.previousBest}
            onDismiss={() => setRecordMoment(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
