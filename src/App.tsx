import { useCallback, useEffect, useState } from 'react';
import { TestPage } from './pages/TestPage';
import { TrainingPage } from './pages/TrainingPage';
import { StatsPage } from './pages/StatsPage';
import type { DrillSeed, Hint } from './engine/hints';
import { CalendarTimeline } from './components/CalendarTimeline';

type Page = 'test' | 'training' | 'stats';

function pageFromHash(): Page {
  if (typeof window === 'undefined') return 'test';
  const h = window.location.hash.replace('#', '');
  return h === 'training' || h === 'stats' ? h : 'test';
}

export default function App() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [pendingSeed, setPendingSeed] = useState<DrillSeed | null>(null);
  const [timelineVersion, setTimelineVersion] = useState(0);
  const refreshTimeline = useCallback(() => setTimelineVersion((version) => version + 1), []);

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
        </nav>
      </header>

      <main className="main">
        {page === 'test' && <TestPage onDrill={goDrill} onSessionSaved={refreshTimeline} />}
        {page === 'training' && (
          <TrainingPage
            key={pendingSeed ? 'seeded' : 'plain'}
            pendingSeed={pendingSeed}
            clearPendingSeed={() => setPendingSeed(null)}
            onSessionSaved={refreshTimeline}
          />
        )}
        {page === 'stats' && <StatsPage />}
      </main>

      <footer className="footer sub">
        data stays in your browser (localStorage) · qwerty · finger colors match the legend
      </footer>

      <CalendarTimeline refreshKey={timelineVersion} />
    </div>
  );
}
