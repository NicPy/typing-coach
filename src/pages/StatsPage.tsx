import { useMemo, useState } from 'react';
import { getResults, getSettings, saveSettings, type StoredResult } from '../storage/localStore';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TrendChart({ tests }: { tests: StoredResult[] }) {
  if (tests.length < 2) return null;
  const W = 640;
  const H = 140;
  const PAD = { l: 34, r: 8, t: 8, b: 8 };
  const maxY = Math.max(40, Math.ceil(Math.max(...tests.map((t) => t.wpm)) / 20) * 20);
  const x = (i: number) => PAD.l + (i / (tests.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / maxY) * (H - PAD.t - PAD.b);
  const path = tests.map((t, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(t.wpm).toFixed(1)}`).join(' ');
  return (
    <svg className="wpm-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="wpm trend across tests">
      {[0, maxY / 2, maxY].map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="chart-grid" />
          <text x={PAD.l - 6} y={y(v) + 3} className="chart-tick" textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      <path d={path} className="chart-wpm" />
      {tests.map((t, i) => (
        <circle key={t.id} cx={x(i)} cy={y(t.wpm)} r={2.5} className="chart-dot">
          <title>{`${fmtDate(t.date)} — ${t.wpm.toFixed(0)} wpm, ${t.accuracy.toFixed(0)}%`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function StatsPage() {
  const [settings, setSettings] = useState(() => getSettings());
  const results = useMemo(() => getResults().slice().reverse(), []);
  const tests = useMemo(() => results.filter((r) => r.kind === 'test').slice().reverse(), [results]);

  const recent = tests.slice(-5);
  const recentAvg = recent.length
    ? recent.reduce((a, r) => a + r.wpm, 0) / recent.length
    : null;
  const best = tests.length ? Math.max(...tests.map((t) => t.wpm)) : null;
  const withHints = results.filter((r) => r.hints.length > 0);

  const patch = (p: Parameters<typeof saveSettings>[0]) => setSettings(saveSettings(p));

  return (
    <div className="page stats-page">
      <section>
        <h2>progress</h2>
        {tests.length === 0 ? (
          <p className="sub empty-note">No saved runs yet — take a typing test first.</p>
        ) : (
          <>
            <div className="stat-row">
              <div className="stat-small">
                <div className="stat-label">tests</div>
                <div>{tests.length}</div>
              </div>
              <div className="stat-small">
                <div className="stat-label">best</div>
                <div>{best!.toFixed(0)} wpm</div>
              </div>
              <div className="stat-small">
                <div className="stat-label">recent avg (5)</div>
                <div>{recentAvg!.toFixed(0)} wpm</div>
              </div>
              {settings.targetWpm ? (
                <div className="stat-small">
                  <div className="stat-label">target</div>
                  <div>
                    {recentAvg!.toFixed(0)}/{settings.targetWpm}
                  </div>
                </div>
              ) : null}
            </div>
            {settings.targetWpm && recentAvg !== null ? (
              <div className="progress-bar" title={`${Math.round((recentAvg / settings.targetWpm) * 100)}% of target`}>
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min(100, (recentAvg / settings.targetWpm) * 100)}%` }}
                />
              </div>
            ) : null}
            <TrendChart tests={tests} />
          </>
        )}
      </section>

      <section>
        <h2>settings</h2>
        <div className="settings-row">
          <label className="setting">
            target wpm
            <input
              type="number"
              min={1}
              max={400}
              placeholder="set a goal"
              value={settings.targetWpm ?? ''}
              onChange={(e) =>
                patch({ targetWpm: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </label>
          <label className="setting">
            <input
              type="checkbox"
              checked={settings.showKeyboard}
              onChange={(e) => patch({ showKeyboard: e.target.checked })}
            />
            show keyboard
          </label>
          <label className="setting">
            <input
              type="checkbox"
              checked={settings.highlightNextKey}
              onChange={(e) => patch({ highlightNextKey: e.target.checked })}
            />
            highlight next key + finger
          </label>
        </div>
      </section>

      <section>
        <h2>history</h2>
        {results.length === 0 ? (
          <p className="sub empty-note">Nothing here yet.</p>
        ) : (
          <table className="history">
            <thead>
              <tr>
                <th>date</th>
                <th>run</th>
                <th>wpm</th>
                <th>acc</th>
                <th>cons</th>
                <th>errors</th>
              </tr>
            </thead>
            <tbody>
              {results.slice(0, 50).map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.date)}</td>
                  <td>
                    <span className={`badge badge-${r.kind}`}>{r.kind}</span> {r.label}
                  </td>
                  <td className="accent">{r.wpm.toFixed(0)}</td>
                  <td>{r.accuracy.toFixed(0)}%</td>
                  <td>{r.consistency.toFixed(0)}%</td>
                  <td>{r.errorCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>coaching history</h2>
        <p className="sub">Every piece of advice the coach has given, newest first.</p>
        {withHints.length === 0 ? (
          <p className="sub empty-note">No hints recorded yet.</p>
        ) : (
          <div className="coach-history">
            {withHints.slice(0, 30).map((r) => (
              <details className="coach-entry" key={r.id}>
                <summary>
                  <span className="sub">{fmtDate(r.date)}</span> · {r.label} ·{' '}
                  {r.hints.map((h) => h.title).join(' · ')}
                </summary>
                {r.hints.map((h) => (
                  <p className="hint-text" key={h.ruleId}>
                    <strong>{h.title}.</strong> {h.message}
                  </p>
                ))}
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
