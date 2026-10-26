// Import startowy mandaryńskiego z paczki npm "tatoeba-sentence-pairs-in-mandarin-chinese-english"
// (eksport par zdań z Tatoeba). Pinyin generowany z CC-CEDICT, oznaczony jako "generated".
// Pełny import (z nagraniami i tłumaczeniami na polski) robi scripts/import-tatoeba.ts.
//
// Uruchom: npm run import:zh

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import type { Phrase } from '../src/lib/types.ts';
import { buildIndex, isSimplified, sentencePinyin } from './lib/cedict.ts';
import { normEn, pickBest, textKey, variantIndex, type Candidate, type CurriculumLesson } from './lib/select.ts';
import { mergeImported, readPhrases, writePhrases } from './lib/phrases-file.ts';

const require = createRequire(import.meta.url);
const pairs = require('tatoeba-sentence-pairs-in-mandarin-chinese-english/sentences.json') as [string, string, string, string][];
const { lessons } = YAML.parse(readFileSync('content/core/curriculum.yaml', 'utf8')) as { lessons: CurriculumLesson[] };

const variants = variantIndex(lessons);
const lessonOf = new Map(lessons.flatMap((l) => l.items.map((it) => [it.key, l.id] as const)));
const idx = buildIndex();

const byKey = new Map<string, Map<string, Candidate>>();
for (const [zid, ztext, eid, etext] of pairs) {
  const key = variants.get(normEn(etext));
  if (!key) continue;
  const m = byKey.get(key) ?? new Map<string, Candidate>();
  const c = m.get(zid) ?? { id: zid, text: ztext, english: [], rejected: !isSimplified(ztext, idx) };
  c.english.push({ id: eid, text: etext });
  m.set(zid, c);
  byKey.set(key, m);
}

const imported: Phrase[] = [];
const used = new Set<string>();
for (const key of lessons.flatMap((l) => l.items.map((i) => i.key))) {
  const m = byKey.get(key);
  const best = m && pickBest([...m.values()], used);
  if (!best) continue;
  used.add(textKey(best.text));
  const py = sentencePinyin(best.text, idx);
  const en = best.english[0];
  imported.push({
    id: `zh-${key}`,
    lesson: lessonOf.get(key)!,
    key,
    original: best.text,
    romanization: py ?? undefined,
    meaning: { en: en.text },
    audio: null,
    source: `Tatoeba, zdanie #${best.id} (tłumaczenie ang. #${en.id}), CC BY 2.0 FR`,
    source_url: `https://tatoeba.org/sentences/show/${best.id}`,
    status: 'niezweryfikowane',
    generated: py ? ['romanization'] : [],
    notes: py ? 'Pinyin wygenerowany z CC-CEDICT (CC BY-SA 4.0); przy znakach o kilku odczytach może być błędny.' : undefined,
  });
}

const path = 'content/zh/phrases.yaml';
const res = mergeImported(readPhrases(path).phrases, imported);
writePhrases(path, { phrases: res.phrases });
const all = lessons.flatMap((l) => l.items.map((i) => i.key));
console.log(`zh: dodano ${res.added}, zaktualizowano ${res.updated}, brak dla ${all.length - imported.length} z ${all.length} kluczy.`);
