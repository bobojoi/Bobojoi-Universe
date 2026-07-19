import { describe, expect, it } from 'vitest';
import { paginateDialogueLines, parseDialogueMessage } from './DialoguePagination';

describe('DialoguePagination', () => {
  it('separates a short speaker name from body copy', () => {
    expect(parseDialogueMessage('泡妞：今天開始努力吧！')).toEqual({
      speaker: '泡妞',
      body: '今天開始努力吧！',
    });
  });

  it('keeps descriptive copy without a speaker unchanged', () => {
    expect(parseDialogueMessage('泡彈搖著尾巴。')).toEqual({ body: '泡彈搖著尾巴。' });
  });

  it('paginates wrapped lines without losing or duplicating content', () => {
    expect(paginateDialogueLines(['一', '二', '三', '四', '五', '六', '七'], 3)).toEqual([
      '一\n二\n三',
      '四\n五\n六',
      '七',
    ]);
  });

  it('falls back safely when page capacity is invalid', () => {
    expect(paginateDialogueLines(['一', '二'], 0)).toEqual(['一\n二']);
  });
});
