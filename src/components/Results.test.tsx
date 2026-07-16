import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { generateHints } from '../engine/hints';
import { computeMetrics } from '../engine/metrics';
import { typeText } from '../engine/testUtils';
import { Results } from './Results';

function outcome() {
  const errors = new Set([0, 4, 9, 14, 20, 25, 30, 35, 40, 45]);
  const raw = typeText('the quick brown fox jumps over the lazy dog again and again', { errors });
  const metrics = computeMetrics(raw.log, raw.durationMs);
  return { metrics, hints: generateHints(metrics, 1) };
}

describe('Results', () => {
  it('lets a main-page coach drill be added to todos', () => {
    const { metrics, hints } = outcome();
    const html = renderToString(
      createElement(Results, {
        metrics,
        hints,
        label: 'time 30',
        onRestart: () => {},
        onDrill: () => {},
        onAddHintTodo: () => {},
        todoHintIds: new Set<string>(),
        compact: true,
      }),
    );

    expect(html).toContain('drill this');
    expect(html).toContain('add to todos');
  });

  it('shows when a coach drill is already saved', () => {
    const { metrics, hints } = outcome();
    const html = renderToString(
      createElement(Results, {
        metrics,
        hints,
        label: 'time 30',
        onRestart: () => {},
        onAddHintTodo: () => {},
        todoHintIds: new Set([hints[0].ruleId]),
        compact: true,
      }),
    );

    expect(html).toContain('saved to todos');
    expect(html).toContain('disabled');
  });
});
