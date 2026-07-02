import { describe, expect, it } from 'vitest';
import { computeMetrics } from './metrics';
import { generateHints } from './hints';
import { typeText } from './testUtils';

const ids = (hints: ReturnType<typeof generateHints>) => hints.map((h) => h.ruleId);

describe('generateHints', () => {
  it('puts accuracy first when accuracy is poor', () => {
    const text = 'the quick brown fox jumps over the lazy dog again and again';
    const errors = new Set([0, 4, 9, 14, 20, 25, 30, 35, 40, 45]);
    const { log, durationMs } = typeText(text, { errors });
    const hints = generateHints(computeMetrics(log, durationMs));
    expect(ids(hints)[0]).toBe('accuracy-first');
  });

  it('calls out slow same-finger bigrams by name', () => {
    const { log, durationMs } = typeText('mu mu mu mu mu on it as we go he is', {
      dt: 150,
      bigramDt: { mu: 500 },
    });
    const hints = generateHints(computeMetrics(log, durationMs));
    const sfb = hints.find((h) => h.ruleId === 'slow-same-finger');
    expect(sfb).toBeDefined();
    expect(sfb!.message).toContain('m→u');
    expect(sfb!.drill?.bigrams).toContain('mu');
  });

  it('flags same-hand shift technique', () => {
    const { log, durationMs } = typeText('Tap Tea Tar Ten Tab', { shiftSide: 'left' });
    const hints = generateHints(computeMetrics(log, durationMs));
    expect(ids(hints)).toContain('same-hand-shift');
  });

  it('does not flag shift when the opposite hand is used', () => {
    const { log, durationMs } = typeText('Tap Tea Tar Ten Tab', { shiftSide: 'right' });
    const hints = generateHints(computeMetrics(log, durationMs));
    expect(ids(hints)).not.toContain('same-hand-shift');
  });

  it('flags word-start hesitation', () => {
    const long = Array.from({ length: 12 }, () => 'making').join(' ');
    const { log, durationMs } = typeText(long, { dt: 150, bigramDt: { ' m': 700 } });
    const hints = generateHints(computeMetrics(log, durationMs));
    expect(ids(hints)).toContain('word-start-hesitation');
  });

  it('falls back to an encouragement hint on a clean, even run', () => {
    const { log, durationMs } = typeText('it is on we go at up so he as do if', { dt: 150 });
    const hints = generateHints(computeMetrics(log, durationMs));
    expect(hints.length).toBeGreaterThan(0);
    // a perfectly even run with no misses should not produce complaints
    expect(ids(hints)).not.toContain('accuracy-first');
    expect(ids(hints)).not.toContain('rhythm');
  });

  it('caps the number of hints', () => {
    const errors = new Set(Array.from({ length: 15 }, (_, i) => i * 3));
    const { log, durationMs } = typeText(
      'Mu mu Mu mu Mu mu the quick brown fox jumps over the lazy dog now',
      { dt: 150, bigramDt: { mu: 500, ' m': 700 }, errors, shiftSide: 'right' },
    );
    const hints = generateHints(computeMetrics(log, durationMs));
    expect(hints.length).toBeLessThanOrEqual(4);
  });
});
