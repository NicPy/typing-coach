import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Drill } from '../engine/drills';
import {
  addTestTodo,
  addTodo,
  DEFAULT_SETTINGS,
  findTestTodo,
  findTodo,
  getTodos,
  removeTodo,
} from './localStore';

class MemoryStorage {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  clear(): void {
    this.data.clear();
  }
}

const storage = new MemoryStorage();
const drill: Drill = {
  label: 'accuracy reset',
  description: 'Aim for a clean run.',
  words: ['slow', 'and', 'steady'],
};

describe('todo storage', () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', storage);
  });

  it('adds and restores a completed exercise', () => {
    const saved = addTodo(drill, 'drill');

    expect(getTodos()).toEqual([saved]);
    expect(findTodo(drill, 'drill')?.id).toBe(saved.id);
  });

  it('does not add the same exercise twice', () => {
    addTodo(drill, 'drill');
    addTodo(drill, 'drill');

    expect(getTodos()).toHaveLength(1);
  });

  it('removes an exercise when the user is satisfied', () => {
    const saved = addTodo(drill, 'drill');
    removeTodo(saved.id);

    expect(getTodos()).toEqual([]);
  });

  it('saves and restores the exact completed main-page test', () => {
    const settings = { ...DEFAULT_SETTINGS, durationSec: 15, punctuation: true };
    const words = ['same', 'test', 'text'];

    const saved = addTestTodo(settings, words);

    expect(saved.kind).toBe('test');
    expect(saved.settings.durationSec).toBe(15);
    expect(saved.words).toEqual(words);
    expect(findTestTodo(settings, words)?.id).toBe(saved.id);
  });

  it('does not duplicate the same completed test', () => {
    const settings = { ...DEFAULT_SETTINGS, mode: 'words' as const, wordCount: 10 };
    const words = ['repeat', 'these', 'words'];

    addTestTodo(settings, words);
    addTestTodo(settings, words);

    expect(getTodos()).toHaveLength(1);
  });
});
