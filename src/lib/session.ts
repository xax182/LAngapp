// Układanie kroków sesji. Czysta logika (bez przeglądarki), testowana w tests/unit.

import type { ExerciseKind, LanguagePack, Phrase } from './types.ts';
import { reviewQueue, type StoredCard } from './srs.ts';

export type Step =
  | { kind: 'shadow'; phrase: Phrase }
  | { kind: 'say'; phrase: Phrase }
  | { kind: 'quick'; phrases: Phrase[] }
  | { kind: 'tones' };

/** Nowe frazy w kolejności lekcji, których jeszcze nie ma w kartach. */
export function nextNewPhrases(pack: LanguagePack, known: Set<string>, count: number): Phrase[] {
  return pack.phrases
    .filter((p) => !known.has(p.id))
    .sort((a, b) => a.lesson - b.lesson)
    .slice(0, count);
}

/**
 * Sesja nauki (20 min): wprowadzenie fraz przez shadowing, a z opóźnieniem jednej frazy
 * przypomnienie „powiedz sam” (przypominanie z pamięci po chwili utrwala lepiej niż od razu).
 */
export function planNewSession(pack: LanguagePack, known: Set<string>, newPerSession: number): Step[] {
  const has = (k: ExerciseKind) => pack.language.exercises.includes(k);
  const fresh = nextNewPhrases(pack, known, newPerSession);
  const steps: Step[] = [];
  if (has('tones')) steps.push({ kind: 'tones' });
  fresh.forEach((p, i) => {
    if (has('shadow')) steps.push({ kind: 'shadow', phrase: p });
    if (i > 0 && has('say')) steps.push({ kind: 'say', phrase: fresh[i - 1] });
  });
  if (fresh.length && has('say')) steps.push({ kind: 'say', phrase: fresh[fresh.length - 1] });
  if (fresh.length >= 3 && has('quick')) steps.push({ kind: 'quick', phrases: fresh });
  return steps;
}

/** Dodatkowa runda, gdy plan się skończył, a czas jeszcze nie: utrwalanie znanych fraz. */
export function extraRound(pack: LanguagePack, cards: StoredCard[], size = 6): Step[] {
  const has = (k: ExerciseKind) => pack.language.exercises.includes(k);
  const ids = reviewQueue(cards.filter((c) => c.lang === pack.language.code))
    .slice(0, size)
    .map((c) => c.phraseId);
  const phrases = ids.map((id) => pack.phrases.find((p) => p.id === id)).filter((p): p is Phrase => !!p);
  if (!phrases.length) return has('tones') ? [{ kind: 'tones' }] : [];
  if (has('quick') && phrases.length >= 3) return [{ kind: 'quick', phrases }];
  return phrases.map((phrase) => ({ kind: 'say' as const, phrase }));
}

/** Sesja powtórki (5 min): „powiedz sam” dla kart według FSRS. */
export function planReviewSession(pack: LanguagePack, cards: StoredCard[], max = 15): Step[] {
  const mine = cards.filter((c) => c.lang === pack.language.code);
  return reviewQueue(mine)
    .slice(0, max)
    .map((c) => pack.phrases.find((p) => p.id === c.phraseId))
    .filter((p): p is Phrase => !!p)
    .map((phrase) => ({ kind: 'say' as const, phrase }));
}
