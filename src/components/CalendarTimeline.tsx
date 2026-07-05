import { memo, useEffect, useMemo, useRef, useState, type WheelEvent } from 'react';
import { getResults, type StoredResult } from '../storage/localStore';

const FUTURE_DAYS = 14;
const PAST_DAYS = 45;
const ITEM_HEIGHT = 56;
const VISIBLE_RADIUS = 7;

interface DayEntry {
  date: Date;
  key: string;
  durationMs: number;
  averageWpm: number | null;
  isFuture: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDuration(durationMs: number): string {
  const totalMinutes = Math.floor(durationMs / 60_000);
  if (totalMinutes < 1) return durationMs > 0 ? '< 1 min' : '0 min';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes} min`;
}

function makeDays(results: StoredResult[], now: Date): DayEntry[] {
  const today = startOfDay(now);
  const grouped = new Map<string, StoredResult[]>();

  for (const result of results) {
    const key = dayKey(new Date(result.date));
    grouped.set(key, [...(grouped.get(key) ?? []), result]);
  }

  return Array.from({ length: FUTURE_DAYS + PAST_DAYS + 1 }, (_, index) => {
    const offset = FUTURE_DAYS - index;
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const key = dayKey(date);
    const dayResults = grouped.get(key) ?? [];
    const wpmResults = dayResults.filter((result) => result.wpm > 0);

    return {
      date,
      key,
      durationMs: dayResults.reduce(
        (sum, result) => sum + (result.activeDurationMs ?? 0),
        0,
      ),
      averageWpm: wpmResults.length
        ? wpmResults.reduce((sum, result) => sum + result.wpm, 0) / wpmResults.length
        : null,
      isFuture: offset > 0,
      isToday: offset === 0,
      isWeekend: date.getDay() === 5 || date.getDay() === 6,
    };
  });
}

interface Props {
  /** Changes only after a saved session, keeping keystroke renders away from the timeline. */
  refreshKey: number;
}

export const CalendarTimeline = memo(function CalendarTimeline({ refreshKey }: Props) {
  const [now] = useState(() => new Date());
  const days = useMemo(() => makeDays(getResults(), now), [now, refreshKey]);
  const todayIndex = FUTURE_DAYS;
  const [selectedIndex, setSelectedIndex] = useState(todayIndex);
  const viewportRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const selected = days[selectedIndex];
  const firstVisible = Math.max(0, selectedIndex - VISIBLE_RADIUS);
  const lastVisible = Math.min(days.length - 1, selectedIndex + VISIBLE_RADIUS);
  const visibleDays = days.slice(firstVisible, lastVisible + 1);

  const centerDay = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({
      top: index * ITEM_HEIGHT - viewport.clientHeight / 2 + ITEM_HEIGHT / 2,
      behavior,
    });
  };

  useEffect(() => {
    centerDay(todayIndex, 'auto');
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const selectDay = (index: number) => {
    setSelectedIndex(index);
    centerDay(index);
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport) return;

    const direction = Math.sign(event.deltaY);
    if (!direction) return;
    const next = Math.max(0, Math.min(days.length - 1, selectedIndex + direction));
    if (next === selectedIndex) return;

    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(() => selectDay(next));
  };

  return (
    <aside className="calendar-panel" aria-label="Daily activity calendar">
      <div className="calendar-heading">
        <div>
          <span className="calendar-kicker">daily rhythm</span>
          <strong>
            {selected.date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </strong>
        </div>
        {selectedIndex !== todayIndex && (
          <button className="calendar-today-btn" type="button" onClick={() => selectDay(todayIndex)}>
            back to today
          </button>
        )}
      </div>

      <div
        className="calendar-viewport"
        ref={viewportRef}
        onWheel={handleWheel}
      >
        <div className="calendar-rail" aria-hidden="true" />
        <div className="calendar-spacer" style={{ height: firstVisible * ITEM_HEIGHT }} />
        {visibleDays.map((day, visibleIndex) => {
          const index = firstVisible + visibleIndex;
          return (
            <button
              type="button"
              key={day.key}
              className={`calendar-day${day.isFuture ? ' is-future' : ''}${day.isToday ? ' is-today' : ''}${day.isWeekend ? ' is-weekend' : ''}${index === selectedIndex ? ' is-selected' : ''}`}
              onClick={() => selectDay(index)}
              aria-pressed={index === selectedIndex}
              aria-label={`${day.date.toLocaleDateString()}, ${formatDuration(day.durationMs)} practiced${day.averageWpm === null ? '' : `, ${Math.round(day.averageWpm)} words per minute`}`}
            >
              <span className="calendar-dot" />
              <span className="calendar-date">
                <span className="calendar-weekday">
                  {day.date.toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
                <span className="calendar-number">{day.date.getDate()}</span>
                <span className="calendar-month">
                  {day.date.toLocaleDateString(undefined, { month: 'short' })}
                </span>
              </span>
              <span className="calendar-day-stats">
                <strong className={day.durationMs > 5 * 60_000 ? 'is-strong-day' : ''}>
                  {formatDuration(day.durationMs)}
                </strong>
                <span>{day.averageWpm === null ? '— wpm' : `${Math.round(day.averageWpm)} wpm`}</span>
              </span>
            </button>
          );
        })}
        <div
          className="calendar-spacer"
          style={{ height: (days.length - lastVisible - 1) * ITEM_HEIGHT }}
        />
      </div>

      <p className="calendar-hint">scroll to travel through days</p>
    </aside>
  );
});
