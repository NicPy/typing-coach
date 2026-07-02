import type { Settings } from '../storage/localStore';

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

const DURATIONS = [15, 30, 60, 120];
const WORD_COUNTS = [10, 25, 50, 100];

export function ConfigBar({ settings, onChange }: Props) {
  return (
    <div className="config-bar">
      <div className="config-group">
        <button
          className={`cfg ${settings.punctuation ? 'on' : ''}`}
          onClick={() => onChange({ punctuation: !settings.punctuation })}
        >
          @ punctuation
        </button>
        <button
          className={`cfg ${settings.numbers ? 'on' : ''}`}
          onClick={() => onChange({ numbers: !settings.numbers })}
        >
          # numbers
        </button>
      </div>
      <div className="config-sep" />
      <div className="config-group">
        <button
          className={`cfg ${settings.mode === 'time' ? 'on' : ''}`}
          onClick={() => onChange({ mode: 'time' })}
        >
          time
        </button>
        <button
          className={`cfg ${settings.mode === 'words' ? 'on' : ''}`}
          onClick={() => onChange({ mode: 'words' })}
        >
          words
        </button>
      </div>
      <div className="config-sep" />
      <div className="config-group">
        {settings.mode === 'time'
          ? DURATIONS.map((d) => (
              <button
                key={d}
                className={`cfg ${settings.durationSec === d ? 'on' : ''}`}
                onClick={() => onChange({ durationSec: d })}
              >
                {d}
              </button>
            ))
          : WORD_COUNTS.map((c) => (
              <button
                key={c}
                className={`cfg ${settings.wordCount === c ? 'on' : ''}`}
                onClick={() => onChange({ wordCount: c })}
              >
                {c}
              </button>
            ))}
      </div>
    </div>
  );
}
