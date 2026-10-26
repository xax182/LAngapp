// Pomocnicze funkcje CC-CEDICT (CC BY-SA 4.0, MDBG): pinyin dla zdań i mapa znak -> pinyin.

import { readFileSync } from 'node:fs';
import { numberedToMarked } from '../../src/lib/pinyin.ts';

interface Entry {
  traditional: string;
  simplified: string;
  pinyin: string;
  english: string[];
}

let cache: Entry[] | null = null;
export function loadCedict(): Entry[] {
  if (!cache) cache = JSON.parse(readFileSync(new URL('../../node_modules/cedict-json/cedict.json', import.meta.url), 'utf8')) as Entry[];
  return cache;
}

const isHan = (ch: string) => /\p{Script=Han}/u.test(ch);

/** Wpisy nazw własnych i odmian rzadkich zaczynają się wielką literą w pinyinie; pomijamy je, gdy jest inny odczyt. */
function better(a: Entry, b: Entry): Entry {
  const proper = (e: Entry) => /^[A-Z]/.test(e.pinyin);
  const variant = (e: Entry) => e.english.some((x) => /^(old variant|variant|surname|see )/i.test(x));
  const bad = (e: Entry) => Number(proper(e)) * 2 + Number(variant(e));
  return bad(b) < bad(a) ? b : a;
}

export interface CedictIndex {
  words: Map<string, Entry>;
  simplifiedChars: Set<string>;
  traditionalOnly: Set<string>;
  maxLen: number;
}

export function buildIndex(): CedictIndex {
  const words = new Map<string, Entry>();
  const simplifiedChars = new Set<string>();
  const traditionalChars = new Set<string>();
  let maxLen = 1;
  for (const e of loadCedict()) {
    const prev = words.get(e.simplified);
    words.set(e.simplified, prev ? better(prev, e) : e);
    maxLen = Math.max(maxLen, [...e.simplified].length);
    for (const ch of e.simplified) simplifiedChars.add(ch);
    for (const ch of e.traditional) traditionalChars.add(ch);
  }
  const traditionalOnly = new Set([...traditionalChars].filter((c) => !simplifiedChars.has(c)));
  return { words, simplifiedChars, traditionalOnly, maxLen: Math.min(maxLen, 6) };
}

/** Czy zdanie jest zapisane znakami uproszczonymi (dla nauki mówienia wybieramy uproszczone). */
export function isSimplified(text: string, idx: CedictIndex): boolean {
  for (const ch of text) if (isHan(ch) && idx.traditionalOnly.has(ch)) return false;
  return true;
}

/**
 * Najczęstszy odczyt znaków, które stoją samodzielnie i mają kilka odczytów w CC-CEDICT
 * (słownik nie podaje częstości). Dotyczy tylko znaków poza dłuższym słowem.
 */
const COMMON_READING: Record<string, string> = {
  的: 'de5', 了: 'le5', 么: 'me5', 着: 'zhe5', 吗: 'ma5', 呢: 'ne5', 吧: 'ba5', 得: 'de5',
  个: 'ge4', 们: 'men5', 和: 'he2', 都: 'dou1', 还: 'hai2', 好: 'hao3', 要: 'yao4',
  会: 'hui4', 为: 'wei4', 只: 'zhi3', 没: 'mei2', 看: 'kan4', 干: 'gan4', 少: 'shao3',
  长: 'chang2', 说: 'shuo1', 累: 'lei4', 几: 'ji3', 啊: 'a5', 嘛: 'ma5', 呀: 'ya5', 哪: 'na3', 行: 'xing2', 觉: 'jue2', 乐: 'le4', 便: 'bian4', 重: 'zhong4', 种: 'zhong3',
};

/**
 * Pinyin dla zdania: dzielenie na słowa metodą najdłuższego dopasowania w CC-CEDICT.
 * Wynik jest „wygenerowany”: przy znakach o kilku odczytach może się mylić.
 * Zwraca null, jeśli jakiś znak nie jest w słowniku.
 */
export function sentencePinyin(text: string, idx: CedictIndex): string | null {
  const chars = [...text];
  const words: string[] = [];
  let i = 0;
  while (i < chars.length) {
    if (!isHan(chars[i])) {
      i++;
      continue;
    }
    let found: Entry | undefined;
    let len = 0;
    for (let l = Math.min(idx.maxLen, chars.length - i); l >= 1; l--) {
      const w = chars.slice(i, i + l).join('');
      const e = idx.words.get(w);
      if (e) {
        found = e;
        len = l;
        break;
      }
    }
    if (!found) return null;
    if (len === 1 && COMMON_READING[chars[i]]) found = { ...found, pinyin: COMMON_READING[chars[i]] };
    words.push(numberedToMarked(found.pinyin.toLowerCase().replace(/u:/g, 'ü')));
    i += len;
  }
  return words.join(' ');
}

/** Mapa znak (uproszczony i tradycyjny) -> pinyin z cyfrą, do porównywania wyników rozpoznawania mowy. */
export function charPinyinMap(): Record<string, string> {
  const map: Record<string, string> = {};
  const best = new Map<string, Entry>();
  for (const e of loadCedict()) {
    if ([...e.simplified].length !== 1) continue;
    for (const ch of new Set([e.simplified, e.traditional])) {
      const prev = best.get(ch);
      best.set(ch, prev ? better(prev, e) : e);
    }
  }
  for (const [ch, e] of best) map[ch] = (COMMON_READING[ch] ?? e.pinyin).toLowerCase().replace(/u:/g, 'ü');
  return map;
}
