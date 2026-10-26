// Zestawy do gry w tony: te same sylaby w 4 tonach (np. mā má mǎ mà).
// Znaki wybrane ręcznie jako znane pary minimalne; skrypt sprawdza każdy odczyt w CC-CEDICT
// i bierze znaczenie ze słownika. Jeśli znak nie ma podanego odczytu, skrypt przerywa.
//
// Uruchom: npm run build:tones

import { writeFileSync } from 'node:fs';
import YAML from 'yaml';
import { loadCedict } from './lib/cedict.ts';
import { numberedSyllableToMarked } from '../src/lib/pinyin.ts';

const SETS: Record<string, [string, string, string, string]> = {
  ma: ['妈', '麻', '马', '骂'],
  ba: ['八', '拔', '把', '爸'],
  yi: ['一', '姨', '椅', '意'],
  wu: ['屋', '无', '五', '雾'],
  tang: ['汤', '糖', '躺', '烫'],
  shi: ['诗', '十', '使', '是'],
  tu: ['突', '图', '土', '兔'],
  ji: ['鸡', '急', '几', '记'],
};

const cedict = loadCedict();
const drills: object[] = [];
const errors: string[] = [];
for (const [base, chars] of Object.entries(SETS)) {
  chars.forEach((ch, i) => {
    const tone = i + 1;
    const want = `${base}${tone}`;
    const noise = /^(surname|(old )?variant|abbr\.|see |used in|CL:)/i;
    const e = cedict
      .filter((x) => x.simplified === ch && x.pinyin.toLowerCase() === want)
      .map((x) => ({ ...x, english: x.english.filter((d) => !noise.test(d)) }))
      .sort((a, b) => Number(/^[A-Z]/.test(a.pinyin)) - Number(/^[A-Z]/.test(b.pinyin)) || b.english.length - a.english.length)[0];
    if (!e || !e.english.length) {
      errors.push(`${ch}: brak odczytu ${want} w CC-CEDICT`);
      return;
    }
    drills.push({
      hanzi: ch,
      pinyin: numberedSyllableToMarked(want),
      tone,
      meaning: e.english.slice(0, 2).join('; '),
      source: 'CC-CEDICT (MDBG), CC BY-SA 4.0',
    });
  });
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
writeFileSync(
  'content/zh/tone-drills.yaml',
  '# Wygenerowane przez scripts/build-tone-drills.ts z CC-CEDICT. Nie edytuj ręcznie.\n' +
    YAML.stringify({ drills }, { lineWidth: 0 }),
);
console.log(`Zapisano ${drills.length} sylab.`);
