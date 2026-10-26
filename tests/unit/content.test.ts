import { describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildContent } from '../../scripts/build-content.ts';
import { mergeImported } from '../../scripts/lib/phrases-file.ts';
import type { Phrase } from '../../src/lib/types.ts';

describe('treść', () => {
  it('prawdziwe pliki treści przechodzą walidację', () => {
    const { errors, packs } = buildContent('.');
    expect(errors).toEqual([]);
    expect(packs.map((p) => p.language.code).sort()).toEqual(['aii', 'ar', 'de', 'es', 'fr', 'ru', 'zh']);
  });

  it('każda fraza ma źródło i status', () => {
    for (const p of buildContent('.').packs.flatMap((x) => x.phrases)) {
      expect(p.source.length).toBeGreaterThan(3);
      expect(['zweryfikowane', 'niezweryfikowane']).toContain(p.status);
    }
  });

  it('fraza bez źródła jest odrzucana', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pol-'));
    cpSync('content', join(dir, 'content'), { recursive: true });
    writeFileSync(
      join(dir, 'content/fr/phrases.yaml'),
      'phrases:\n  - id: fr-x\n    lesson: 1\n    original: Bonjour\n    meaning: { en: Hello }\n    status: zweryfikowane\n',
    );
    const { errors } = buildContent(dir);
    expect(errors.join('\n')).toMatch(/source/);
  });

  it('Suret bez pisma wymaga romanizacji', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pol-'));
    cpSync('content', join(dir, 'content'), { recursive: true });
    writeFileSync(
      join(dir, 'content/aii/phrases.yaml'),
      'phrases:\n  - id: aii-x\n    lesson: 1\n    original: ""\n    meaning: { pl: Cześć }\n    source: test\n    status: niezweryfikowane\n',
    );
    expect(buildContent(dir).errors.join('\n')).toMatch(/romanization/);
  });

  it('import nie nadpisuje fraz zweryfikowanych', () => {
    const base: Phrase = { id: 'fr-hello', key: 'hello', lesson: 1, original: 'Salut', meaning: { en: 'Hi' }, source: 's', status: 'zweryfikowane' };
    const incoming: Phrase = { ...base, original: 'Bonjour', status: 'niezweryfikowane' };
    expect(mergeImported([base], [incoming]).phrases[0].original).toBe('Salut');
    const unverified = { ...base, status: 'niezweryfikowane' as const };
    expect(mergeImported([unverified], [incoming]).phrases[0].original).toBe('Bonjour');
  });
});
