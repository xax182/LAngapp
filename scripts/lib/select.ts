// Wybór zdań z Tatoeba dla programu wspólnego (content/core/curriculum.yaml).
// Wspólne dla importu z npm (mandaryński) i pełnego importu z Tatoeba.

export interface CurriculumItem {
  key: string;
  match: string[];
}
export interface CurriculumLesson {
  id: number;
  title: string;
  items: CurriculumItem[];
}

export interface Candidate {
  id: string;
  text: string;
  /** Zdania angielskie (id + tekst), z którymi zdanie jest połączone w Tatoeba i pasują do klucza. */
  english: { id: string; text: string }[];
  hasAudio?: boolean;
  /** Dodatkowy warunek odrzucenia (np. zapis tradycyjny dla chińskiego). */
  rejected?: boolean;
}

export const textKey = (s: string) => s.replace(/[\p{P}\s]/gu, '');
export const normEn = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** Mapa: znormalizowany wariant angielski -> klucz programu. */
export function variantIndex(lessons: CurriculumLesson[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const l of lessons) for (const it of l.items) for (const v of it.match) map.set(normEn(v), it.key);
  return map;
}

/**
 * Najlepszy kandydat: ma nagranie, jest połączony z wieloma wariantami angielskimi
 * (czyli wielu ludzi uznało go za dobre tłumaczenie), jest krótki.
 */
export function pickBest(cands: Candidate[], used: Set<string> = new Set()): Candidate | undefined {
  const ok = cands.filter((c) => !c.rejected && c.text.trim().length > 0 && !used.has(textKey(c.text)));
  const tooLong = (c: Candidate) => Math.max(0, [...c.text].length - 15);
  const score = (c: Candidate) => (c.hasAudio ? 100 : 0) + c.english.length * 10 - tooLong(c);
  return ok.sort((a, b) => score(b) - score(a) || Number(a.id) - Number(b.id))[0];
}
