import { describe, expect, it } from 'vitest';
import { computeMetrics } from './metrics';
import { typeText } from './testUtils';

describe('computeMetrics', () => {
  it('computes wpm and accuracy for a clean run', () => {
    // 11 keystrokes over ~2.5s
    const { log, durationMs } = typeText('mu mu mu mu', { dt: 150 });
    const m = computeMetrics(log, durationMs);
    expect(m.charCount).toBe(11);
    expect(m.correctCount).toBe(11);
    expect(m.accuracy).toBe(100);
    expect(m.wpm).toBeCloseTo(11 / 5 / (durationMs / 60000), 5);
  });

  it('isolates a slow same-finger bigram against the baseline', () => {
    const { log, durationMs } = typeText('mu mu mu mu', { dt: 150, bigramDt: { mu: 400 } });
    const m = computeMetrics(log, durationMs);
    const mu = m.bigrams.find((b) => b.bigram === 'mu');
    expect(mu).toBeDefined();
    expect(mu!.count).toBe(4);
    expect(mu!.meanMs).toBeCloseTo(400, 5);
    expect(mu!.type).toBe('same-finger');
    expect(m.baselineMs).toBeCloseTo(150, 5);
  });

  it('excludes word boundaries from bigram stats', () => {
    const { log, durationMs } = typeText('ab ab', { dt: 150 });
    const m = computeMetrics(log, durationMs);
    expect(m.bigrams.map((b) => b.bigram)).toEqual(['ab']);
  });

  it('detects same-hand shift usage', () => {
    // T is a left-hand letter typed with left shift held -> same hand
    const { log, durationMs } = typeText('Ta Ta Ta', { shiftSide: 'left' });
    const m = computeMetrics(log, durationMs);
    expect(m.shift.shiftedCount).toBe(3);
    expect(m.shift.sameHandCount).toBe(3);
  });

  it('accepts opposite-hand shift usage', () => {
    const { log, durationMs } = typeText('Ta Ta Ta', { shiftSide: 'right' });
    const m = computeMetrics(log, durationMs);
    expect(m.shift.shiftedCount).toBe(3);
    expect(m.shift.sameHandCount).toBe(0);
  });

  it('separates word-start hesitation from in-word speed', () => {
    const { log, durationMs } = typeText('abc abc abc', {
      dt: 150,
      bigramDt: { ' a': 600 },
    });
    const m = computeMetrics(log, durationMs);
    expect(m.wordStartMeanMs).toBeCloseTo(600, 5);
    expect(m.wordInternalMeanMs).toBeCloseTo(150, 5);
  });

  it('counts errors and the most-missed characters', () => {
    const { log, durationMs } = typeText('abcabc', { errors: new Set([1, 4]) }); // both 'b'
    const m = computeMetrics(log, durationMs);
    expect(m.errorCount).toBe(2);
    expect(m.accuracy).toBeCloseTo((4 / 6) * 100, 5);
    expect(m.errors.topMissedChars[0]).toEqual({ char: 'b', count: 2 });
  });

  it('treats long pauses as breaks, not intervals', () => {
    const { log, durationMs } = typeText('abcd', { dt: 150, bigramDt: { cd: 10000 } });
    const m = computeMetrics(log, durationMs);
    expect(m.intervalCount).toBe(2); // ab, bc only
    expect(m.activeDurationMs).toBe(300); // the 10s pause is not typing time
  });

  it('gives perfect-rhythm runs a high consistency score', () => {
    const { log, durationMs } = typeText('abcdefg hijklmn', { dt: 150 });
    const m = computeMetrics(log, durationMs);
    expect(m.consistency).toBeGreaterThan(95);
  });
});
