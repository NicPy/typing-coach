import { describe, expect, it } from 'vitest';
import { keyInfo } from '../engine/fingerMap';
import { CODING_DRILLS } from './codingDrills';

describe('coding drills', () => {
  it('has unique ids', () => {
    const ids = CODING_DRILLS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const lesson of CODING_DRILLS) {
    it(`${lesson.id} generates enough space-free words with mapped keys`, () => {
      const drill = lesson.makeDrill();
      expect(drill.words.length).toBeGreaterThanOrEqual(20);
      for (const word of drill.words) {
        expect(word.length).toBeGreaterThan(0);
        expect(word, `word "${word}" must not contain spaces`).not.toContain(' ');
        for (const ch of word) {
          // every char must be typeable and visible to the finger/bigram analytics
          expect(keyInfo(ch), `unmapped char "${ch}" in "${word}"`).not.toBeNull();
        }
      }
    });
  }
});
