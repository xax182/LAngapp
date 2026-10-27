// Pełny import fraz z eksportów Tatoeba (https://tatoeba.org/downloads), dla wszystkich języków.
// Dla każdego klucza z content/core/curriculum.yaml szuka zdania w danym języku, które jest
// tłumaczeniem jednego z angielskich wariantów. Dokłada: autora, licencję, nagranie (jeśli jest),
// tłumaczenie na polski (jeśli jest), pinyin z Tatoeba (zh) i IPA z eSpeak NG (jeśli zainstalowany).
//
// Potrzebuje internetu i ok. 1 GB miejsca. Uruchamiany przez GitHub Actions (przycisk „Import Tatoeba”)
// albo lokalnie: npm run import:tatoeba [-- fr de]

import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import YAML from 'yaml';
import type { Phrase } from '../src/lib/types.ts';
import { numberedToMarked } from '../src/lib/pinyin.ts';
import { normEn, pickBest, textKey, variantIndex, type Candidate, type CurriculumLesson } from './lib/select.ts';
import { mergeImported, readPhrases, writePhrases } from './lib/phrases-file.ts';
import { buildIndex, isSimplified, sentencePinyin } from './lib/cedict.ts';

const BASE = 'https://downloads.tatoeba.org/exports';
const CACHE = '.cache/tatoeba';

/** Nasze kody -> kody Tatoeba. Lewantyński: Tatoeba używa apc (lewantyński) i dawniej ajp (południowy). */
const LANGS: Record<string, string[]> = {
  fr: ['fra'],
  zh: ['cmn'],
  es: ['spa'],
  de: ['deu'],
  ar: ['apc', 'ajp'],
  ru: ['rus'],
  aii: ['aii'],
};
/** Zdanie musi być zapisane pismem danego języka (w Tatoeba trafiają się np. angielskie „Bye!”). */
const SCRIPT: Record<string, RegExp> = {
  zh: /\p{Script=Han}/u,
  ar: /\p{Script=Arabic}/u,
  ru: /\p{Script=Cyrillic}/u,
  aii: /\p{Script=Syriac}|\p{Script=Latin}/u,
};
const ESPEAK_VOICE: Record<string, string> = { fr: 'fr', es: 'es', de: 'de', ru: 'ru' };

const wanted = process.argv.slice(2).filter((a) => LANGS[a]);
const targets = wanted.length ? wanted : Object.keys(LANGS);
const tatoebaToOurs = new Map(targets.flatMap((c) => LANGS[c].map((t) => [t, c] as const)));

async function download(name: string): Promise<string> {
  mkdirSync(CACHE, { recursive: true });
  const path = `${CACHE}/${name}`;
  if (existsSync(path)) return path;
  console.log(`Pobieram ${name}...`);
  const res = await fetch(`${BASE}/${name}`);
  if (!res.ok || !res.body) throw new Error(`Nie udało się pobrać ${name}: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(path));
  return path;
}

/** Czyta wiersze TSV z archiwum .tar.bz2 bez rozpakowywania na dysk. */
async function* rows(archive: string, expectedCols: number): AsyncGenerator<string[]> {
  const tar = spawn('tar', ['-xjOf', archive]);
  const rl = createInterface({ input: tar.stdout, crlfDelay: Infinity });
  let checked = false;
  for await (const line of rl) {
    const cols = line.split('\t');
    if (!checked) {
      if (cols.length < expectedCols) {
        throw new Error(`${archive}: oczekiwano ${expectedCols} kolumn, jest ${cols.length}. Format eksportu się zmienił?`);
      }
      checked = true;
    }
    yield cols;
  }
}

interface Sent {
  lang: string;
  text: string;
  owner: string;
}

async function main() {
  const { lessons } = YAML.parse(readFileSync('content/core/curriculum.yaml', 'utf8')) as { lessons: CurriculumLesson[] };
  const variants = variantIndex(lessons);
  const lessonOf = new Map(lessons.flatMap((l) => l.items.map((it) => [it.key, l.id] as const)));
  const keys = lessons.flatMap((l) => l.items.map((i) => i.key));

  const sentencesTar = await download('sentences_detailed.tar.bz2');
  const linksTar = await download('links.tar.bz2');
  const audioTar = await download('sentences_with_audio.tar.bz2');
  const transTar = await download('transcriptions.tar.bz2');

  // 1. Angielskie zdania pasujące do wariantów z programu.
  const eng = new Map<string, { key: string; text: string }>();
  for await (const [id, lang, text] of rows(sentencesTar, 4)) {
    if (lang !== 'eng') continue;
    const key = variants.get(normEn(text));
    if (key) eng.set(id, { key, text });
  }
  console.log(`Angielskich zdań z programu: ${eng.size}`);

  // 2. Co jest połączone z tymi zdaniami.
  const linkedToEng = new Map<string, string[]>();
  for await (const [a, b] of rows(linksTar, 2)) {
    if (eng.has(a)) linkedToEng.set(b, [...(linkedToEng.get(b) ?? []), a]);
  }

  // 3. Teksty kandydatów w językach docelowych.
  const cand = new Map<string, Sent>();
  for await (const [id, lang, text, owner] of rows(sentencesTar, 4)) {
    if (linkedToEng.has(id) && tatoebaToOurs.has(lang)) cand.set(id, { lang, text, owner });
  }
  console.log(`Kandydatów: ${cand.size}`);

  // 4. Tłumaczenia kandydatów na polski.
  const linkedToCand = new Map<string, string[]>();
  for await (const [a, b] of rows(linksTar, 2)) {
    if (cand.has(a)) linkedToCand.set(b, [...(linkedToCand.get(b) ?? []), a]);
  }
  const polOf = new Map<string, { id: string; text: string; owner: string }>();
  for await (const [id, lang, text, owner] of rows(sentencesTar, 4)) {
    if (lang !== 'pol' || !linkedToCand.has(id)) continue;
    for (const c of linkedToCand.get(id)!) if (!polOf.has(c)) polOf.set(c, { id, text, owner });
  }

  // 5. Nagrania i transkrypcje.
  const audio = new Map<string, { audioId: string; user: string; license: string; attribution: string }>();
  for await (const [sid, audioId, user, license, attribution] of rows(audioTar, 4)) {
    if (cand.has(sid) && !audio.has(sid)) audio.set(sid, { audioId, user, license: license || 'brak licencji (tylko tatoeba.org)', attribution: attribution ?? '' });
  }
  const translit = new Map<string, string>();
  for await (const [sid, lang, script, , text] of rows(transTar, 5)) {
    if (lang === 'cmn' && script === 'Latn' && cand.has(sid)) translit.set(sid, text.replace(/([a-zA-Zü:]+?)([1-5])/g, (_, b: string, t: string) => numberedToMarked(b + t)));
  }

  const hasEspeak = spawnSync('espeak-ng', ['--version']).status === 0;
  const ipa = (text: string, code: string) => {
    if (!hasEspeak || !ESPEAK_VOICE[code]) return undefined;
    const r = spawnSync('espeak-ng', ['-q', '--ipa', '-v', ESPEAK_VOICE[code], text], { encoding: 'utf8' });
    return r.status === 0 ? r.stdout.trim().replace(/\s+/g, ' ') : undefined;
  };

  // Pinyin: sylaby rozdzielone spacją z CC-CEDICT (spójny zapis, potrzebny do wykresu tonów);
  // transkrypcja z Tatoeba tylko awaryjnie.
  const cedict = targets.includes('zh') ? buildIndex() : null;

  // 6. Wybór i zapis per język.
  for (const code of targets) {
    const byKey = new Map<string, Candidate[]>();
    for (const [id, s] of cand) {
      if (tatoebaToOurs.get(s.lang) !== code) continue;
      const engIds = linkedToEng.get(id)!;
      const groups = new Map<string, { id: string; text: string }[]>();
      for (const e of engIds) {
        const info = eng.get(e)!;
        groups.set(info.key, [...(groups.get(info.key) ?? []), { id: e, text: info.text }]);
      }
      for (const [key, english] of groups) {
        const wrongScript = SCRIPT[code] ? !SCRIPT[code].test(s.text) : false;
        const traditional = code === 'zh' && cedict ? !isSimplified(s.text, cedict) : false;
        byKey.set(key, [
          ...(byKey.get(key) ?? []),
          { id, text: s.text, english, hasAudio: audio.has(id), rejected: wrongScript || traditional },
        ]);
      }
    }

    const used = new Set<string>();
    const imported: Phrase[] = [];
    for (const key of keys) {
      const best = pickBest(byKey.get(key) ?? [], used);
      if (!best) continue;
      used.add(textKey(best.text));
      const s = cand.get(best.id)!;
      const a = audio.get(best.id);
      const pl = polOf.get(best.id);
      const generated: string[] = [];
      const phonetic = ipa(best.text, code);
      if (phonetic) generated.push('ipa');
      const fromCedict = code === 'zh' && cedict ? sentencePinyin(best.text, cedict) : null;
      const roman = code === 'zh' ? (fromCedict ?? translit.get(best.id)) : undefined;
      if (fromCedict) generated.push('romanization');
      imported.push({
        id: `${code}-${key}`,
        lesson: lessonOf.get(key)!,
        key,
        original: best.text,
        ...(roman ? { romanization: roman } : {}),
        ...(phonetic ? { ipa: phonetic } : {}),
        meaning: { en: best.english[0].text, ...(pl ? { pl: pl.text } : {}) },
        audio: a
          ? {
              url: `https://tatoeba.org/audio/download/${a.audioId}`,
              author: a.user,
              license: a.license,
              ...(a.attribution ? { source_url: a.attribution } : {}),
            }
          : null,
        source: `Tatoeba #${best.id}, autor: ${s.owner || 'nieznany'}, CC BY 2.0 FR` + (pl ? `; polskie tłumaczenie #${pl.id} (${pl.owner})` : ''),
        source_url: `https://tatoeba.org/sentences/show/${best.id}`,
        status: 'niezweryfikowane',
        ...(generated.length ? { generated } : {}),
        ...(code === 'ar' ? { notes: `Kod Tatoeba: ${s.lang}. Sprawdź, czy to dialekt palestyński.` } : {}),
        ...(phonetic ? { notes: 'IPA wygenerowane przez eSpeak NG (przybliżenie).' } : {}),
        ...(fromCedict ? { notes: 'Pinyin wygenerowany z CC-CEDICT (CC BY-SA 4.0); przy znakach o kilku odczytach może być błędny.' } : {}),
      });
    }
    const path = `content/${code}/phrases.yaml`;
    const res = mergeImported(readPhrases(path).phrases, imported);
    writePhrases(path, { phrases: res.phrases });
    console.log(`${code}: dodano ${res.added}, zaktualizowano ${res.updated}, luki: ${keys.length - imported.length}/${keys.length}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
