import type { SessionMetrics } from '../engine/metrics';
import type { Hint } from '../engine/hints';
import { WpmChart } from './WpmChart';

interface Props {
  metrics: SessionMetrics;
  hints: Hint[];
  label: string;
  onRestart: () => void;
  onDrill?: (hint: Hint) => void;
  compact?: boolean;
  isTodo?: boolean;
  onAddTodo?: () => void;
  todoHintIds?: ReadonlySet<string>;
  onAddHintTodo?: (hint: Hint) => void;
}

export function Results({
  metrics,
  hints,
  label,
  onRestart,
  onDrill,
  compact,
  isTodo,
  onAddTodo,
  todoHintIds,
  onAddHintTodo,
}: Props) {
  return (
    <div className="results">
      <div className="results-main">
        <div className="stat-big">
          <div className="stat-label">wpm</div>
          <div className="stat-value accent">{metrics.wpm.toFixed(0)}</div>
        </div>
        <div className="stat-big">
          <div className="stat-label">acc</div>
          <div className="stat-value accent">{metrics.accuracy.toFixed(0)}%</div>
        </div>
        <div className="stat-row">
          <div className="stat-small">
            <div className="stat-label">raw</div>
            <div>{metrics.rawWpm.toFixed(0)}</div>
          </div>
          <div className="stat-small">
            <div className="stat-label">consistency</div>
            <div>{metrics.consistency.toFixed(0)}%</div>
          </div>
          <div className="stat-small">
            <div className="stat-label">time</div>
            <div>{(metrics.durationMs / 1000).toFixed(0)}s</div>
          </div>
          <div className="stat-small">
            <div className="stat-label">chars</div>
            <div>
              {metrics.correctCount}/{metrics.errorCount}
            </div>
          </div>
          <div className="stat-small">
            <div className="stat-label">mode</div>
            <div>{label}</div>
          </div>
        </div>
      </div>

      {!compact && <WpmChart series={metrics.wpmSeries} />}

      <div className="hints">
        <h3 className="hints-title">coach's notes</h3>
        {hints.map((h) => {
          const savedToTodos = todoHintIds?.has(h.ruleId) ?? false;
          return (
            <div className="hint" key={h.ruleId}>
              <div className="hint-head">
                <span className="hint-name">{h.title}</span>
                {h.drill && (onDrill || onAddHintTodo) && (
                  <div className="hint-actions">
                    {onDrill && (
                      <button className="btn btn-small" onClick={() => onDrill(h)}>
                        drill this
                      </button>
                    )}
                    {onAddHintTodo && (
                      <button
                        className="btn btn-small"
                        onClick={() => onAddHintTodo(h)}
                        disabled={savedToTodos}
                      >
                        {savedToTodos ? 'saved to todos' : 'add to todos'}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="hint-text">{h.message}</p>
            </div>
          );
        })}
      </div>

      <div className="results-actions">
        <button className="btn" onClick={onRestart}>
          next {compact ? 'round' : 'test'} <span className="key-cap">tab</span>
        </button>
        {onAddTodo && (
          <button className="btn" onClick={onAddTodo} disabled={isTodo}>
            {isTodo ? 'added to todos' : 'add exercise to todos'}
          </button>
        )}
      </div>
    </div>
  );
}
