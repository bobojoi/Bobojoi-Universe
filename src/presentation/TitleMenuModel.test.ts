import { describe, expect, it } from 'vitest';
import { TitleMenuModel } from './TitleMenuModel';

describe('TitleMenuModel', () => {
  it('disables continue with a reason when no valid save exists', () => {
    const item = new TitleMenuModel(false).getView().items.find(({ id }) => id === 'continue');
    expect(item).toMatchObject({ enabled: false, unavailableReason: '尚無可繼續的進度' });
  });

  it('enables continue when a valid save exists', () => {
    const item = new TitleMenuModel(true).getView().items.find(({ id }) => id === 'continue');
    expect(item?.enabled).toBe(true);
  });

  it('starts immediately when new game has no save to overwrite', () => {
    expect(new TitleMenuModel(false).confirm('new-game')).toBe('start-new-game');
  });

  it('requires a second confirmation before overwriting an existing game', () => {
    const menu = new TitleMenuModel(true);
    expect(menu.confirm('new-game')).toBe('none');
    expect(menu.getView()).toMatchObject({ mode: 'confirm-new-game' });
    expect(menu.confirm('confirm')).toBe('start-new-game');
  });

  it('requires a second confirmation before clearing a save', () => {
    const menu = new TitleMenuModel(true);
    expect(menu.confirm('clear-save')).toBe('none');
    expect(menu.getView().confirmationText).toBe('這會刪除目前所有進度，且無法復原。');
    expect(menu.confirm('confirm')).toBe('clear-save');
  });

  it('cancel preserves the save-backed main menu state', () => {
    const menu = new TitleMenuModel(true);
    menu.confirm('clear-save');
    expect(menu.confirm('cancel')).toBe('none');
    expect(menu.getView()).toMatchObject({ mode: 'main' });
    expect(menu.getView().items.find(({ id }) => id === 'continue')?.enabled).toBe(true);
  });

  it('clear refresh disables continue immediately', () => {
    const menu = new TitleMenuModel(true);
    menu.setHasSave(false);
    expect(menu.getView().items.find(({ id }) => id === 'continue')?.enabled).toBe(false);
  });

  it('escape returns help to the main menu', () => {
    const menu = new TitleMenuModel(false);
    menu.confirm('help');
    expect(menu.getView().mode).toBe('help');
    menu.back();
    expect(menu.getView().mode).toBe('main');
  });
});
