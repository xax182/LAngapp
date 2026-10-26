import { describe, expect, it } from 'vitest';
import { numberedToMarked, parsePinyinText, parseSyllable } from '../../src/lib/pinyin.ts';

describe('pinyin', () => {
  it('zamienia cyfry na znaki tonów według zasad', () => {
    expect(numberedToMarked('ni3 hao3')).toBe('nǐ hǎo');
    expect(numberedToMarked('xie4 xie5')).toBe('xiè xie');
    expect(numberedToMarked('liu2 gou3')).toBe('liú gǒu');
    expect(numberedToMarked('gui4 lu:4 nu:3')).toBe('guì lǜ nǚ');
    expect(numberedToMarked('Bei3 jing1')).toBe('Běi jīng');
  });

  it('odczytuje ton i sylabę', () => {
    expect(parseSyllable('hǎo')).toEqual({ base: 'hao', tone: 3 });
    expect(parseSyllable('ma')).toEqual({ base: 'ma', tone: 5 });
    expect(parseSyllable('lü4')).toEqual({ base: 'lü', tone: 4 });
    expect(parsePinyinText('nǐ hǎo ma？').map((s) => s.tone)).toEqual([3, 3, 5]);
  });
});
