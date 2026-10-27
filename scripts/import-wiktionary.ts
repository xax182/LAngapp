// Import rozmówek z Wiktionary (dane z kaikki.org / wiktextract, licencja CC BY-SA 3.0 + GFDL).
// Dla Suret i lewantyńskiego, gdzie Tatoeba ma mało zdań. Bierze hasła z kategorii „phrasebook”
// (rozmówki) i frazy: pismo, romanizację, IPA, nagranie z Wikimedia Commons, znaczenie po angielsku.
// Hasło pasujące do klucza programu wypełnia lukę (nie nadpisuje istniejących fraz);
// pozostałe trafiają do lekcji 11 „Rozmówki dodatkowe”.
//
// Uruchamiany przez GitHub Actions (przycisk „Import Wiktionary”) albo lokalnie:
// npm run import:wiktionary [-- aii ar]
// Plik JSONL można też podać ręcznie: WIKT_FILE_aii=sciezka.jsonl

import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import YAML from 'yaml';
import type { Phrase } from '../src/lib/types.ts';
import type { CurriculumLesson } from './lib/select.ts';
import { mergeImported, readPhrases, writePhrases } from './lib/phrases-file.ts';

const CACHE = '.cache/wiktionary';
const EXTRA_LESSON = 11;

/** Nasze kody -> nazwy języków w Wiktionary (kaikki.org), w kolejności prób. */
const LANGS: Record<string, string[]> = {
  aii: ['Assyrian Neo-Aramaic'],
  ar: ['South Levantine Arabic', 'Levantine Arabic', 'North Levantine Arabic'],
};

interface WiktEntry {
  word: string;
  lang?: string;
  pos?: string;
  senses?: { glosses?: string[]; tags?: string[]; categories?: (string | { name: string })[] }[];
  sounds?: { ipa?: string; audio?: string; ogg_url?: string; mp3_url?: string; tags?: string[] }[];
  forms?: { form: string; tags?: string[] }[];
  categories?: (string | { name: string })[];
}

const loose = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}' ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const catNames = (e: WiktEntry): string[] =>
  [...(e.categories ?? []), ...(e.senses ?? []).flatMap((s) => s.categories ?? [])].map((c) =>
    typeof c === 'string' ? c : c.name,
  );

async function getJsonl(code: string): Promise<{ path: string; langName: string } | null> {
  const manual = process.env[`WIKT_FILE_${code}`];
  if (manual) return { path: manual, langName: LANGS[code][0] };
  mkdirSync(CACHE, { recursive: true });
  for (const name of LANGS[code]) {
    const path = `${CACHE}/${name.replace(/\s/g, '')}.jsonl`;
    if (existsSync(path)) return { path, langName: name };
    const urls = [
      `https://kaikki.org/dictionary/${encodeURIComponent(name)}/kaikki.org-dictionary-${name.replace(/[\s-]/g, '')}.jsonl`,
      `https://kaikki.org/dictionary/${encodeURIComponent(name)}/kaikki.org-dictionary-${name.replace(/\s/g, '')}.jsonl`,
    ];
    for (const url of urls) {
      const res = await fetch(url).catch(() => null);
      if (res?.ok && res.body) {
        console.log(`Pobrano ${url}`);
        await pipeline(Readable.fromWeb(res.body as never), createWriteStream(path));
        return { path, langName: name };
      }
    }
  }
  return null;
}

export function toPhrase(e: WiktEntry, code: string, key: string | null, lesson: number, langName: string): Phrase | null {
  const gloss = e.senses?.flatMap((s) => s.glosses ?? [])[0];
  if (!gloss || !e.word) return null;
  const roman = e.forms?.find((f) => f.tags?.includes('romanization'))?.form;
  const ipa = e.sounds?.find((s) => s.ipa)?.ipa;
  const audio = e.sounds?.find((s) => s.ogg_url || s.mp3_url);
  const pageUrl = `https://en.wiktionary.org/wiki/${encodeURIComponent(e.word.replace(/ /g, '_'))}#${encodeURIComponent(langName.replace(/ /g, '_'))}`;
  const tags = new Set((e.senses ?? []).flatMap((s) => s.tags ?? []).concat(e.sounds?.flatMap((s) => s.tags ?? []) ?? []));
  const dialect = [...tags].filter((t) => /palestin|jordan|leban|syria|urmi|iraq|nineveh/i.test(t));
  const slug = loose(gloss).replace(/ /g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'fraza';
  const notes = [
    'Z rozmówek Wiktionary; sprawdź z native speakerem.',
    dialect.length ? `Oznaczenia odmiany: ${dialect.join(', ')}.` : code === 'ar' ? 'Wiktionary nie podaje, czy to odmiana palestyńska.' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return {
    id: key ? `${code}-${key}` : `${code}-wikt-${slug}`,
    lesson,
    ...(key ? { key } : {}),
    original: e.word,
    ...(roman ? { romanization: roman } : {}),
    ...(ipa ? { ipa } : {}),
    meaning: { en: gloss },
    audio: audio
      ? {
          url: (audio.mp3_url ?? audio.ogg_url)!,
          author: 'Wikimedia Commons (autor na stronie pliku)',
          license: 'zob. stronę pliku w Wikimedia Commons',
          ...(audio.audio ? { source_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(audio.audio)}` } : {}),
        }
      : null,
    source: `Wiktionary, hasło „${e.word}” (${langName}), CC BY-SA 3.0, przez kaikki.org`,
    source_url: pageUrl,
    status: 'niezweryfikowane',
    notes,
  };
}

async function main() {
  const { lessons } = YAML.parse(readFileSync('content/core/curriculum.yaml', 'utf8')) as { lessons: CurriculumLesson[] };
  const byGloss = new Map<string, { key: string; lesson: number }>();
  for (const l of lessons) for (const it of l.items) for (const v of it.match) byGloss.set(loose(v), { key: it.key, lesson: l.id });

  const wanted = process.argv.slice(2).filter((a) => LANGS[a]);
  for (const code of wanted.length ? wanted : Object.keys(LANGS)) {
    const src = await getJsonl(code);
    if (!src) {
      console.log(`${code}: nie udało się pobrać danych z kaikki.org.`);
      continue;
    }
    const out: Phrase[] = [];
    const usedKeys = new Set<string>();
    const usedIds = new Set<string>();
    const rl = createInterface({ input: createReadStream(src.path), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      const e = JSON.parse(line) as WiktEntry;
      const cats = catNames(e);
      const phrasebook = cats.some((c) => /phrasebook/i.test(c));
      if (!phrasebook && e.pos !== 'phrase') continue;
      const glosses = (e.senses ?? []).flatMap((s) => s.glosses ?? []);
      const hit = glosses.map((g) => byGloss.get(loose(g))).find((h) => h && !usedKeys.has(h.key));
      if (!hit && !phrasebook) continue; // dodatkowe bierzemy tylko z rozmówek
      const p = toPhrase(e, code, hit?.key ?? null, hit?.lesson ?? EXTRA_LESSON, src.langName);
      if (!p || usedIds.has(p.id)) continue;
      usedIds.add(p.id);
      if (hit) usedKeys.add(hit.key);
      out.push(p);
    }
    const path = `content/${code}/phrases.yaml`;
    const res = mergeImported(readPhrases(path).phrases, out, { replace: false });
    writePhrases(path, { phrases: res.phrases });
    console.log(`${code}: z Wiktionary ${out.length} fraz (${usedKeys.size} wypełnia luki), dodano ${res.added}.`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
