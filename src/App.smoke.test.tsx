import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import App from './App';
import { TodosPage } from './pages/TodosPage';

describe('App', () => {
  it('renders the test page without crashing (no DOM, no localStorage)', () => {
    const html = renderToString(createElement(App));
    expect(html).toContain('typing coach');
    expect(html).toContain('word-stream');
    expect(html).toContain('kb-legend');
    expect(html).toContain('daily rhythm');
    expect(html).toContain('Daily activity calendar');
  });

  it('renders an empty todos page without browser storage', () => {
    const html = renderToString(
      createElement(TodosPage, { onSessionSaved: () => {}, onDrill: () => {} }),
    );

    expect(html).toContain('nothing queued');
    expect(html).toContain('add exercise to todos');
  });
});
