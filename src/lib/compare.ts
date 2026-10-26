// Porównanie tego, co rozpoznało rozpoznawanie mowy, z frazą docelową.

export interface TokenMatch {
  token: string;
  ok: boolean;
}

export interface CompareResult {
  /** 0..1, odsetek zgodnych elementów. */
  score: number;
  /** Elementy frazy docelowej z oznaczeniem, czy zostały rozpoznane. */
  target: TokenMatch[];
  heard: string;
}

/** Odwzorowanie znaku chińskiego na sylaby pinyin z cyfrą tonu (np. "hao3"). */
export type PinyinMap = Record<string, string>;

export function normalizeText(text: string, lang: string): string {
  let t = text.normalize('NFKC').toLowerCase();
  if (lang === 'ar') {
    t = t
      .replace(/[ً-ْٰـ]/g, '') // harakat, tatwil
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه');
  }
  if (lang === 'ru') t = t.replace(/ё/g, 'е');
  if (lang === 'aii') t = t.replace(/[ܰ-݊]/g, ''); // znaki samogłoskowe pisma syryjskiego
  return t
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Podział na elementy porównania: słowa, a dla chińskiego sylaby (bez tonu). */
export function tokenize(text: string, lang: string, pinyinMap?: PinyinMap): string[] {
  const norm = normalizeText(text, lang);
  if (lang === 'zh') {
    const out: string[] = [];
    for (const ch of norm.replace(/\s/g, '')) {
      const py = pinyinMap?.[ch];
      out.push(py ? py.replace(/[1-5]$/, '') : ch);
    }
    return out;
  }
  return norm ? norm.split(' ') : [];
}

/** Dopasowanie kolejności (najdłuższy wspólny podciąg): które elementy celu pojawiły się w odpowiedzi. */
export function alignTokens(target: string[], heard: string[]): boolean[] {
  const n = target.length;
  const m = heard.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = target[i] === heard[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ok = new Array(n).fill(false);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (target[i] === heard[j]) {
      ok[i] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return ok;
}

export function compareSpeech(
  targetText: string,
  heardText: string,
  lang: string,
  pinyinMap?: PinyinMap,
): CompareResult {
  const target = tokenize(targetText, lang, pinyinMap);
  const heard = tokenize(heardText, lang, pinyinMap);
  const ok = alignTokens(target, heard);
  const hits = ok.filter(Boolean).length;
  // Kara za dodatkowe słowa, żeby długa „zgadywanka” nie dostała pełnej oceny.
  const denom = Math.max(target.length, heard.length, 1);
  const displayTokens = lang === 'zh' ? [...normalizeText(targetText, lang).replace(/\s/g, '')] : target;
  return {
    score: hits / denom,
    target: displayTokens.map((token, i) => ({ token, ok: ok[i] ?? false })),
    heard: heardText,
  };
}

/** Sugerowana ocena (1–4 jak w FSRS) na podstawie wyniku porównania. */
export function suggestGrade(score: number): 1 | 2 | 3 | 4 {
  if (score >= 0.95) return 3;
  if (score >= 0.7) return 2;
  return 1;
}
