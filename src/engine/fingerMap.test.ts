import { describe, expect, it } from 'vitest';
import { baseChar, classifyBigram, keyInfo, needsShift, rowTravel } from './fingerMap';

describe('keyInfo', () => {
  it('maps home row keys to the standard fingers', () => {
    expect(keyInfo('a')?.finger).toBe('l-pinky');
    expect(keyInfo('f')?.finger).toBe('l-index');
    expect(keyInfo('j')?.finger).toBe('r-index');
    expect(keyInfo(';')?.finger).toBe('r-pinky');
    expect(keyInfo(' ')?.finger).toBe('thumb');
  });

  it('maps shifted symbols and uppercase through to the base key', () => {
    expect(keyInfo('!')?.finger).toBe(keyInfo('1')?.finger);
    expect(keyInfo('M')?.finger).toBe(keyInfo('m')?.finger);
    expect(keyInfo('?')?.finger).toBe(keyInfo('/')?.finger);
  });

  it('m and u share the right index finger', () => {
    expect(keyInfo('m')?.finger).toBe('r-index');
    expect(keyInfo('u')?.finger).toBe('r-index');
  });
});

describe('classifyBigram', () => {
  it('flags m->u as same-finger (the classic row jump)', () => {
    expect(classifyBigram('m', 'u')).toBe('same-finger');
    expect(rowTravel('m', 'u')).toBe(2);
  });

  it('flags e->d as same-finger', () => {
    expect(classifyBigram('e', 'd')).toBe('same-finger');
  });

  it('flags x->e as a scissor (adjacent fingers, distant rows)', () => {
    expect(classifyBigram('x', 'e')).toBe('scissor');
  });

  it('flags t->h as alternating hands', () => {
    expect(classifyBigram('t', 'h')).toBe('alternating');
  });

  it('flags doubled letters as repeat', () => {
    expect(classifyBigram('l', 'l')).toBe('repeat');
  });
});

describe('shift helpers', () => {
  it('knows which characters need shift', () => {
    expect(needsShift('A')).toBe(true);
    expect(needsShift('!')).toBe(true);
    expect(needsShift('a')).toBe(false);
    expect(needsShift('1')).toBe(false);
  });

  it('resolves the base key of shifted characters', () => {
    expect(baseChar('!')).toBe('1');
    expect(baseChar('A')).toBe('a');
    expect(baseChar('?')).toBe('/');
  });
});
