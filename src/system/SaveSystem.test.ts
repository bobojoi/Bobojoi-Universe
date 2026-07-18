import { describe, expect, it, vi } from 'vitest';
import { createDefaultStudioQuestState } from '../quest/StudioQuestManager';
import { createDefaultMainStoryState } from '../story/MainStoryManager';
import { createDefaultTutorialProgress } from '../tutorial/TutorialProgress';
import { SaveSystem, type SaveStorage } from './SaveSystem';

class MemoryStorage implements SaveStorage {
  public value: string | null = null;
  public failWrites = false;

  public getItem(): string | null {
    return this.value;
  }

  public setItem(_key: string, value: string): void {
    if (this.failWrites) throw new Error('quota');
    this.value = value;
  }

  public removeItem(): void {
    this.value = null;
  }
}

describe('SaveSystem', () => {
  it('treats malformed JSON as no valid save', () => {
    const storage = new MemoryStorage();
    storage.value = '{broken';
    expect(new SaveSystem(storage).hasSave()).toBe(false);
  });

  it('reports a valid v7 save and restores tutorial flags', () => {
    const storage = new MemoryStorage();
    const saves = new SaveSystem(storage);
    const tutorial = { ...createDefaultTutorialProgress(), sawIntroText: true };
    expect(saves.save(
      { x: 620, y: 760 },
      createDefaultStudioQuestState(),
      createDefaultMainStoryState(false),
      tutorial,
    )).toBe(true);
    expect(saves.hasSave()).toBe(true);
    expect(saves.load()?.tutorialProgress.sawIntroText).toBe(true);
  });

  it('clears the slot and immediately reports no save', () => {
    const storage = new MemoryStorage();
    const saves = new SaveSystem(storage);
    saves.save(
      { x: 620, y: 760 },
      createDefaultStudioQuestState(),
      createDefaultMainStoryState(false),
      createDefaultTutorialProgress(),
    );
    expect(saves.clear()).toBe(true);
    expect(saves.hasSave()).toBe(false);
  });

  it('reports failed writes instead of pretending autosave succeeded', () => {
    const storage = new MemoryStorage();
    storage.failWrites = true;
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(new SaveSystem(storage).save(
      { x: 620, y: 760 },
      createDefaultStudioQuestState(),
      createDefaultMainStoryState(false),
      createDefaultTutorialProgress(),
    )).toBe(false);
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});
