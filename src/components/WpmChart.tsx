import type { WpmSample } from '../engine/metrics';

interface Props {
  series: WpmSample[];
}

const W = 640;
const H = 160;
const PAD = { l: 36, r: 8, t: 8, b: 20 };

export function WpmChart({ series }: Props) {
  if (series.length < 2) return null;
  const maxY = Math.max(20, Math.ceil(Math.max(...series.map((s) => Math.max(s.raw, s.wpm))) / 20) * 20);
  const x = (sec: number) => PAD.l + ((sec - 1) / (series.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / maxY) * (H - PAD.t - PAD.b);

  const line = (get: (s: WpmSample) => number) =>
    series.map((s, i) => `${i === 0 ? 'M' : 'L'}${x(s.sec).toFixed(1)},${y(get(s)).toFixed(1)}`).join(' ');

  const gridVals = [] as number[];
  for (let v = 0; v <= maxY; v += maxY / 4) gridVals.push(v);

  return (
    <svg className="wpm-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="words per minute over time">
      {gridVals.map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="chart-grid" />
          <text x={PAD.l - 6} y={y(v) + 3} className="chart-tick" textAnchor="end">
            {Math.round(v)}
          </text>
        </g>
      ))}
      <path d={line((s) => s.raw)} className="chart-raw" />
      <path d={line((s) => s.wpm)} className="chart-wpm" />
      {series
        .filter((s) => s.errors > 0)
        .map((s) => (
          <g key={s.sec} className="chart-error">
            <line x1={x(s.sec) - 3} y1={y(s.raw) - 3} x2={x(s.sec) + 3} y2={y(s.raw) + 3} />
            <line x1={x(s.sec) - 3} y1={y(s.raw) + 3} x2={x(s.sec) + 3} y2={y(s.raw) - 3} />
          </g>
        ))}
      <text x={PAD.l} y={H - 4} className="chart-tick">
        1s
      </text>
      <text x={W - PAD.r} y={H - 4} className="chart-tick" textAnchor="end">
        {series[series.length - 1].sec}s
      </text>
    </svg>
  );
}
