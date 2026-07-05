import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import App from './App';

describe('App', () => {
  it('renders the test page without crashing (no DOM, no localStorage)', () => {
    const html = renderToString(createElement(App));
    expect(html).toContain('typing coach');
    expect(html).toContain('word-stream');
    expect(html).toContain('kb-legend');
    expect(html).toContain('daily rhythm');
    expect(html).toContain('Daily activity calendar');
  });
});
