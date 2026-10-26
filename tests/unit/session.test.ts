import { describe, expect, it } from 'vitest';
import { planNewSession, planReviewSession, extraRound } from '../../src/lib/session.ts';
import { newCard, review, reviewQueue } from '../../src/lib/srs.ts';
import { Rating } from 'ts-fsrs';
import type { LanguagePack, Phrase } from '../../src/lib/types.ts';

const ph = (i: number, lesson = 1): Phrase => ({
  id: `fr-p${i}`,
  lesson,
  original: `phrase ${i}`,
  meaning: { en: `p${i}` },
  source: 'test',
  status: 'niezweryfikowane',
});
const pack = (exercises: LanguagePack['language']['exercises'], phrases: Phrase[]): LanguagePack => ({
  language: { code: 'fr', name: 'fr', inLanguage: 'po francusku', bcp47: 'fr-FR', whisper: 'french', asr: 'dobre', dir: 'ltr', limits: '', exercises },
  lessons: [{ id: 1, title: 'a' }],
  phrases,
  gaps: [],
});

describe('plan sesji', () => {
  it('nowe frazy: shadowing, a „powiedz sam” z opóźnieniem o jedną frazę, na końcu gra', () => {
    const steps = planNewSession(pack(['shadow', 'say', 'quick'], [ph(1), ph(2), ph(3), ph(4)]), new Set(), 3);
    expect(steps.map((s) => s.kind + ('phrase' in s ? s.phrase.id.slice(-1) : ''))).toEqual([
      'shadow1', 'shadow2', 'say1', 'shadow3', 'say2', 'say3', 'quick',
    ]);
  });

  it('pomija znane frazy i bierze najpierw wcześniejsze lekcje', () => {
    const steps = planNewSession(pack(['shadow'], [ph(3, 2), ph(1, 1), ph(2, 1)]), new Set(['fr-p1']), 5);
    expect(steps.map((s) => ('phrase' in s ? s.phrase.id : ''))).toEqual(['fr-p2', 'fr-p3']);
  });

  it('Suret (bez rozpoznawania) nie dostaje gry na czas', () => {
    const steps = planNewSession(pack(['shadow', 'say'], [ph(1), ph(2), ph(3)]), new Set(), 3);
    expect(steps.some((s) => s.kind === 'quick')).toBe(false);
  });

  it('powtórka bierze najpierw zaległe karty', () => {
    const now = new Date('2026-01-10');
    const a = review(newCard('fr-p1', 'fr', new Date('2026-01-01')), Rating.Good, new Date('2026-01-01'));
    const b = newCard('fr-p2', 'fr', new Date('2026-01-09'));
    const c = review(newCard('fr-p3', 'fr', now), Rating.Easy, now);
    const q = reviewQueue([c, b, a], now).map((x) => x.phraseId);
    expect(q.indexOf('fr-p3')).toBe(2);
    const steps = planReviewSession(pack(['say'], [ph(1), ph(2), ph(3)]), [c, b, a]);
    expect(steps).toHaveLength(3);
  });

  it('runda dodatkowa bez kart nie wywala się', () => {
    expect(extraRound(pack(['say'], [ph(1)]), [])).toEqual([]);
  });
});
