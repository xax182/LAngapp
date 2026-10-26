import { describe, expect, it } from 'vitest';
import { compareSpeech, normalizeText, suggestGrade } from '../../src/lib/compare.ts';

describe('porównanie mowy', () => {
  it('ignoruje wielkość liter i interpunkcję', () => {
    expect(compareSpeech('Bonjour !', 'bonjour', 'fr').score).toBe(1);
    expect(compareSpeech('¿Cómo estás?', 'cómo estás', 'es').score).toBe(1);
  });

  it('wskazuje brakujące słowa', () => {
    const r = compareSpeech('Ich bin müde.', 'ich müde', 'de');
    expect(r.target.map((t) => t.ok)).toEqual([true, false, true]);
    expect(r.score).toBeCloseTo(2 / 3);
  });

  it('karze dodatkowe słowa', () => {
    expect(compareSpeech('Да', 'да да да да', 'ru').score).toBe(0.25);
  });

  it('chiński: porównuje przez pinyin, więc znaki tradycyjne i uproszczone są równe', () => {
    const map = { 谢: 'xie4', 謝: 'xie4', 你: 'ni3' };
    expect(compareSpeech('谢谢你。', '謝謝你', 'zh', map).score).toBe(1);
  });

  it('arabski: usuwa znaki samogłoskowe i ujednolica alif', () => {
    expect(normalizeText('مَرْحَبا', 'ar')).toBe(normalizeText('مرحبا', 'ar'));
    expect(normalizeText('أنا', 'ar')).toBe('انا');
  });

  it('sugestia oceny', () => {
    expect(suggestGrade(1)).toBe(3);
    expect(suggestGrade(0.8)).toBe(2);
    expect(suggestGrade(0.2)).toBe(1);
  });
});
