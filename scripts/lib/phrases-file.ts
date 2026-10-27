// Odczyt i zapis content/<język>/phrases.yaml z zasadą: import nigdy nie nadpisuje pracy człowieka.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import YAML from 'yaml';
import type { Phrase } from '../../src/lib/types.ts';

export interface PhrasesFile {
  phrases: Phrase[];
}

const HEADER = `# Frazy do nauki. Każda fraza MUSI mieć "source" i "status".
# status: zweryfikowane | niezweryfikowane
# Importer nigdy nie zmienia fraz ze statusem "zweryfikowane" ani z "locked: true".
# Brak frazy dla klucza z programu = luka, widoczna w aplikacji.
`;

export function readPhrases(path: string): PhrasesFile {
  if (!existsSync(path)) return { phrases: [] };
  const data = YAML.parse(readFileSync(path, 'utf8')) as PhrasesFile | null;
  return { phrases: data?.phrases ?? [] };
}

export function writePhrases(path: string, file: PhrasesFile) {
  mkdirSync(dirname(path), { recursive: true });
  const sorted = [...file.phrases].sort((a, b) => a.lesson - b.lesson || a.id.localeCompare(b.id));
  writeFileSync(path, HEADER + YAML.stringify({ phrases: sorted }, { lineWidth: 0 }));
}

/** Dokłada lub podmienia frazy z importu; frazy chronione zostają bez zmian. replace: false = tylko dokłada brakujące. */
export function mergeImported(
  existing: Phrase[],
  imported: Phrase[],
  { replace = true }: { replace?: boolean } = {},
): { phrases: Phrase[]; added: number; updated: number } {
  const byKey = new Map(existing.map((p) => [p.key ?? p.id, p]));
  let added = 0;
  let updated = 0;
  for (const p of imported) {
    const k = p.key ?? p.id;
    const old = byKey.get(k);
    const protectedPhrase = old && (old.status === 'zweryfikowane' || (old as Phrase & { locked?: boolean }).locked);
    if (!old) {
      byKey.set(k, p);
      added++;
    } else if (replace && !protectedPhrase && JSON.stringify(old) !== JSON.stringify(p)) {
      byKey.set(k, p);
      updated++;
    }
  }
  return { phrases: [...byKey.values()], added, updated };
}
