// Pinyin: zamiana zapisu z cyframi (ni3 hao3) na znaki tonów (nǐ hǎo) i odczyt tonów.

const MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

const MARKED_TO_BASE: Record<string, [string, number]> = {};
for (const [base, list] of Object.entries(MARKS)) {
  list.forEach((ch, i) => {
    MARKED_TO_BASE[ch] = [base, i + 1];
    MARKED_TO_BASE[ch.toUpperCase()] = [base.toUpperCase(), i + 1];
  });
}

/** Jedna sylaba z cyfrą tonu, np. "lu:4" / "lv4" / "nu:3" / "ma5" -> "lǜ", "ma". */
export function numberedSyllableToMarked(syl: string): string {
  const m = /^([a-zA-Zü:]+?)([1-5])?$/.exec(syl.replace(/u:|v/g, 'ü').replace(/U:|V/g, 'Ü'));
  if (!m) return syl;
  const body = m[1];
  const tone = m[2] ? Number(m[2]) : 5;
  if (tone === 5) return body;
  const lower = body.toLowerCase();
  // Zasada: a lub e dostaje znak; w "ou" znak na o; inaczej ostatnia samogłoska.
  let pos = lower.search(/[ae]/);
  if (pos < 0) pos = lower.indexOf('ou');
  if (pos < 0) {
    for (let i = lower.length - 1; i >= 0; i--) {
      if ('aeiouü'.includes(lower[i])) {
        pos = i;
        break;
      }
    }
  }
  if (pos < 0) return body;
  const v = lower[pos];
  let mark = MARKS[v][tone - 1];
  if (body[pos] !== v) mark = mark.toUpperCase();
  return body.slice(0, pos) + mark + body.slice(pos + 1);
}

/** "ni3 hao3" -> "nǐ hǎo" */
export function numberedToMarked(text: string): string {
  return text
    .split(/(\s+)/)
    .map((part) => (/^\s+$/.test(part) ? part : numberedSyllableToMarked(part)))
    .join('');
}

export interface Syllable {
  /** Sylaba bez tonu, małymi literami, np. "hao". */
  base: string;
  /** 1–4, 5 = ton neutralny. */
  tone: number;
}

/** Odczyt sylaby zapisanej ze znakiem tonu lub cyfrą. */
export function parseSyllable(syl: string): Syllable {
  const num = /([1-5])$/.exec(syl);
  if (num) return { base: syl.slice(0, -1).toLowerCase().replace(/u:|v/g, 'ü'), tone: Number(num[1]) };
  let tone = 5;
  let base = '';
  for (const ch of syl) {
    const hit = MARKED_TO_BASE[ch];
    if (hit) {
      base += hit[0];
      tone = hit[1];
    } else base += ch;
  }
  return { base: base.toLowerCase(), tone };
}

/** Sylaby ze zdania w pinyinie (znaki tonów lub cyfry); interpunkcja pominięta. */
export function parsePinyinText(text: string): Syllable[] {
  return text
    .normalize('NFC')
    .split(/[^\p{L}\p{M}0-9:]+/u)
    .filter(Boolean)
    .map(parseSyllable);
}

export const TONE_NAMES: Record<number, string> = {
  1: '1. wysoki, równy',
  2: '2. wznoszący',
  3: '3. opadająco-wznoszący (niski)',
  4: '4. opadający',
  5: 'neutralny',
};
