// Buduje treść dla aplikacji: content/*.yaml -> public/content/*.json.
// Sprawdza każdą frazę schematem (source i status są obowiązkowe) i liczy luki.
// Błąd w danych = przerwanie budowania z czytelnym komunikatem.
//
// Uruchom: npm run content

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import AjvModule from 'ajv';
import YAML from 'yaml';
import type { ContentIndex, Gap, Language, LanguagePack, Phrase } from '../src/lib/types.ts';
import { validateRotation } from '../src/lib/rotation.ts';
import type { CurriculumLesson } from './lib/select.ts';
import { charPinyinMap } from './lib/cedict.ts';

const OUT = 'public/content';
const readYaml = <T>(p: string): T => YAML.parse(readFileSync(p, 'utf8')) as T;

export function buildContent(root = '.'): { index: ContentIndex; packs: LanguagePack[]; errors: string[] } {
  const errors: string[] = [];
  const cfg = readYaml<{ rotation: ContentIndex['rotation']; languages: Language[] }>(`${root}/content/languages.yaml`);
  const { lessons } = readYaml<{ lessons: CurriculumLesson[] }>(`${root}/content/core/curriculum.yaml`);
  const schema = JSON.parse(readFileSync(`${root}/content/schema/phrase.schema.json`, 'utf8'));
  const validate = new (AjvModule as unknown as typeof AjvModule.default)({ allErrors: true }).compile(schema);

  for (const p of validateRotation(cfg.rotation)) errors.push(`Rotacja: ${p}`);
  for (const code of cfg.rotation.order) {
    if (!cfg.languages.some((l) => l.code === code)) errors.push(`Rotacja: brak języka ${code} w liście languages.`);
  }

  const packs: LanguagePack[] = [];
  const counts: ContentIndex['counts'] = {};
  for (const language of cfg.languages) {
    const file = `${root}/content/${language.code}/phrases.yaml`;
    const phrases: Phrase[] = existsSync(file) ? (readYaml<{ phrases?: Phrase[] }>(file)?.phrases ?? []) : [];
    const ids = new Set<string>();
    for (const p of phrases) {
      if (!validate(p as unknown)) {
        const msg = (validate.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ');
        errors.push(`${file}: fraza ${p?.id ?? '(bez id)'}: ${msg}`);
      }
      if (ids.has(p.id)) errors.push(`${file}: powtórzone id ${p.id}`);
      ids.add(p.id);
      if (!p.id.startsWith(`${language.code}-`)) errors.push(`${file}: id ${p.id} musi zaczynać się od "${language.code}-"`);
    }
    const haveKeys = new Set(phrases.map((p) => p.key).filter(Boolean));
    const gaps: Gap[] = lessons.flatMap((l) =>
      l.items.filter((it) => !haveKeys.has(it.key)).map((it) => ({ lesson: l.id, key: it.key, hint: it.match[0] })),
    );
    packs.push({ language, lessons: lessons.map((l) => ({ id: l.id, title: l.title })), phrases, gaps });
    counts[language.code] = {
      phrases: phrases.length,
      verified: phrases.filter((p) => p.status === 'zweryfikowane').length,
      gaps: gaps.length,
    };
  }

  const index: ContentIndex = {
    generatedAt: new Date().toISOString(),
    rotation: cfg.rotation,
    languages: cfg.languages,
    counts,
  };
  return { index, packs, errors };
}

function main() {
  const { index, packs, errors } = buildContent();
  if (errors.length) {
    console.error('Błędy w treści:\n- ' + errors.join('\n- '));
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/index.json`, JSON.stringify(index));
  for (const p of packs) writeFileSync(`${OUT}/${p.language.code}.json`, JSON.stringify(p));
  const drills = readYaml<{ drills: unknown[] }>('content/zh/tone-drills.yaml');
  writeFileSync(`${OUT}/zh-tones.json`, JSON.stringify(drills.drills));
  writeFileSync(`${OUT}/zh-pinyin.json`, JSON.stringify(charPinyinMap()));
  for (const p of packs) {
    const c = index.counts[p.language.code];
    console.log(`${p.language.code}: ${c.phrases} fraz (${c.verified} zweryfikowanych), luki: ${c.gaps}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
