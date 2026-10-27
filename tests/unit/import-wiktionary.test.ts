// Test importu rozmówek z Wiktionary na sztucznym pliku w formacie kaikki.org.
import { describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import YAML from 'yaml';

describe('import z Wiktionary', () => {
  it('wypełnia luki z programu, resztę rozmówek daje do lekcji 11, nie nadpisuje istniejących', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wikt-'));
    cpSync('content', join(dir, 'content'), { recursive: true });
    writeFileSync(
      join(dir, 'content/aii/phrases.yaml'),
      YAML.stringify({
        phrases: [{ id: 'aii-thank-you', key: 'thank-you', lesson: 2, original: '', romanization: 'x', meaning: { pl: 'dziękuję' }, source: 'moje', status: 'zweryfikowane' }],
      }),
    );
    const rows = [
      { word: 'ܫܠܵܡܵܐ', lang: 'Assyrian Neo-Aramaic', pos: 'intj', senses: [{ glosses: ['hello'], categories: [{ name: 'Assyrian Neo-Aramaic phrasebook' }] }], forms: [{ form: 'šlāmā', tags: ['romanization'] }], sounds: [{ ipa: '/ʃlaːmaː/' }, { audio: 'X.ogg', ogg_url: 'https://upload.wikimedia.org/x.ogg' }] },
      { word: 'ܬܵܘܕܝܼ', lang: 'Assyrian Neo-Aramaic', pos: 'intj', senses: [{ glosses: ['thank you'], categories: ['Assyrian Neo-Aramaic phrasebook'] }] },
      { word: 'ܐܲܝܟܵܐ ܝܼܠܹܗ ܒܹܝܬܵܐ', lang: 'Assyrian Neo-Aramaic', pos: 'phrase', senses: [{ glosses: ['where is the house?'], categories: ['Assyrian Neo-Aramaic phrasebook'] }] },
      { word: 'ܕܐܟܝ ܝܘܬ', lang: 'Assyrian Neo-Aramaic', pos: 'phrase', senses: [{ glosses: ['How are you? (singular masculine)'], categories: ['Assyrian Neo-Aramaic phrasebook'] }] },
      { word: 'ܐܝܕܐ', lang: 'Assyrian Neo-Aramaic', pos: 'phrase', senses: [{ glosses: ['a hand cannot clap by itself'], categories: ['Assyrian Neo-Aramaic proverbs'] }] },
      { word: 'ܟܬ݂ܵܒ݂ܵܐ', lang: 'Assyrian Neo-Aramaic', pos: 'noun', senses: [{ glosses: ['book'] }] },
    ];
    const file = join(dir, 'aii.jsonl');
    writeFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n'));
    execFileSync('node', [resolve('scripts/import-wiktionary.ts'), 'aii'], { cwd: dir, env: { ...process.env, WIKT_FILE_aii: file }, stdio: 'pipe' });

    const out = YAML.parse(readFileSync(join(dir, 'content/aii/phrases.yaml'), 'utf8')).phrases;
    const hello = out.find((p: { key?: string }) => p.key === 'hello');
    expect(hello).toMatchObject({ original: 'ܫܠܵܡܵܐ', romanization: 'šlāmā', ipa: '/ʃlaːmaː/', lesson: 1, status: 'niezweryfikowane' });
    expect(hello.audio.url).toBe('https://upload.wikimedia.org/x.ogg');
    expect(hello.source).toContain('Wiktionary');
    // Zweryfikowana fraza zostaje.
    expect(out.find((p: { key?: string }) => p.key === 'thank-you').source).toBe('moje');
    // Fraza spoza programu -> lekcja 11; zwykłe słowo (nie rozmówki) pominięte.
    expect(out.find((p: { lesson: number }) => p.lesson === 11).meaning.en).toBe('where is the house?');
    // Dopisek w nawiasie nie przeszkadza w dopasowaniu; przysłowie pominięte.
    expect(out.find((p: { key?: string }) => p.key === 'how-are-you').original).toBe('ܕܐܟܝ ܝܘܬ');
    expect(out).toHaveLength(4);
  });
});
