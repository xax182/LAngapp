// Test importera na małych, sztucznych plikach w formacie eksportu Tatoeba.
import { describe, expect, it } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import YAML from 'yaml';

function tarBz2(dir: string, name: string, file: string, rows: string[][]) {
  writeFileSync(join(dir, file), rows.map((r) => r.join('\t')).join('\n') + '\n');
  execFileSync('tar', ['-cjf', name, file], { cwd: dir });
}

describe('import z Tatoeba', () => {
  it('wybiera zdanie z nagraniem, dokłada polskie tłumaczenie, autora i licencję', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tatoeba-'));
    cpSync('content', join(dir, 'content'), { recursive: true });
    const cache = join(dir, '.cache/tatoeba');
    mkdirSync(cache, { recursive: true });
    tarBz2(cache, 'sentences_detailed.tar.bz2', 'sentences_detailed.csv', [
      ['1', 'eng', 'Thank you.', 'ann', '', ''],
      ['2', 'fra', 'Merci.', 'bob', '', ''],
      ['3', 'fra', 'Merci beaucoup !', 'cid', '', ''],
      ['4', 'pol', 'Dziękuję.', 'dora', '', ''],
      ['5', 'deu', 'Danke.', 'eve', '', ''],
      ['6', 'eng', 'Something else.', 'ann', '', ''],
    ]);
    tarBz2(cache, 'links.tar.bz2', 'links.csv', [
      ['1', '2'], ['2', '1'], ['1', '3'], ['3', '1'], ['2', '4'], ['4', '2'], ['1', '5'], ['5', '1'],
    ]);
    tarBz2(cache, 'sentences_with_audio.tar.bz2', 'sentences_with_audio.csv', [['3', '900', 'cid', 'CC BY 4.0', '']]);
    tarBz2(cache, 'transcriptions.tar.bz2', 'transcriptions.csv', [['99', 'cmn', 'Latn', 'x', 'ni3 hao3']]);

    execFileSync('node', [resolve('scripts/import-tatoeba.ts'), 'fr', 'de'], { cwd: dir, stdio: 'pipe' });
    const fr = YAML.parse(readFileSync(join(dir, 'content/fr/phrases.yaml'), 'utf8')).phrases;
    const thanks = fr.find((p: { key: string }) => p.key === 'thank-you');
    // Zdanie z nagraniem wygrywa.
    expect(thanks.original).toBe('Merci beaucoup !');
    expect(thanks.audio).toMatchObject({ url: 'https://tatoeba.org/audio/download/900', author: 'cid', license: 'CC BY 4.0' });
    expect(thanks.source).toContain('Tatoeba #3');
    expect(thanks.source).toContain('cid');
    expect(thanks.status).toBe('niezweryfikowane');

    const de = YAML.parse(readFileSync(join(dir, 'content/de/phrases.yaml'), 'utf8')).phrases;
    expect(de[0]).toMatchObject({ original: 'Danke.', meaning: { en: 'Thank you.' } });
  });
});
