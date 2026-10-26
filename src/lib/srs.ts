// Powtórki rozłożone w czasie: algorytm FSRS (biblioteka ts-fsrs, MIT).

import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs';

const scheduler = fsrs({ enable_fuzz: true });

export interface StoredCard {
  phraseId: string;
  lang: string;
  card: Card;
  /** Ile razy ćwiczona. */
  reps: number;
  lastScore?: number;
}

export const GRADES: { grade: Grade; label: string; hint: string }[] = [
  { grade: Rating.Again, label: 'Nie umiem', hint: 'wróci za chwilę' },
  { grade: Rating.Hard, label: 'Trudno', hint: '' },
  { grade: Rating.Good, label: 'Dobrze', hint: '' },
  { grade: Rating.Easy, label: 'Łatwo', hint: '' },
];

export function newCard(phraseId: string, lang: string, now = new Date()): StoredCard {
  return { phraseId, lang, card: createEmptyCard(now), reps: 0 };
}

/** Karty z IndexedDB mają daty jako Date albo tekst (po imporcie z pliku). */
export function revive(c: StoredCard): StoredCard {
  const card = { ...c.card, due: new Date(c.card.due) } as Card;
  if (card.last_review) card.last_review = new Date(card.last_review);
  return { ...c, card };
}

export function review(c: StoredCard, grade: Grade, now = new Date(), score?: number): StoredCard {
  const { card } = scheduler.next(revive(c).card, now, grade);
  return { ...c, card, reps: c.reps + 1, lastScore: score };
}

export function isDue(c: StoredCard, now = new Date()): boolean {
  return new Date(c.card.due).getTime() <= now.getTime();
}

/** Kolejka powtórek: najpierw zaległe (najstarsze), potem najsłabiej zapamiętane. */
export function reviewQueue(cards: StoredCard[], now = new Date()): StoredCard[] {
  const due = cards.filter((c) => isDue(c, now)).sort((a, b) => +new Date(a.card.due) - +new Date(b.card.due));
  const rest = cards.filter((c) => !isDue(c, now)).sort((a, b) => a.card.stability - b.card.stability);
  return [...due, ...rest];
}
