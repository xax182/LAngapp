import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import { cycleStartFor, daysBetween, planForDate, validateRotation, type RotationConfig } from '../../src/lib/rotation.ts';

const cfg: RotationConfig = YAML.parse(readFileSync('content/languages.yaml', 'utf8')).rotation;

describe('rotacja', () => {
  it('prawdziwa konfiguracja spełnia zasady (bez FR+ES i AR+Suret w jednym dniu)', () => {
    expect(validateRotation(cfg)).toEqual([]);
  });

  it('daje dokładnie plan z dokumentu', () => {
    const start = '2026-01-05';
    const days = Array.from({ length: 7 }, (_, i) => planForDate(cfg, start, `2026-01-${String(5 + i).padStart(2, '0')}`));
    expect(days.map((d) => `${d.learn}/${d.review}`)).toEqual(['fr/ar', 'zh/ru', 'es/aii', 'de/fr', 'ar/zh', 'ru/es', 'aii/de']);
  });

  it('każdy język jest nowy raz w tygodniu i powtarzany raz w tygodniu', () => {
    const plans = Array.from({ length: 7 }, (_, i) => planForDate(cfg, '2026-03-01', `2026-03-${String(i + 1).padStart(2, '0')}`));
    expect(new Set(plans.map((p) => p.learn)).size).toBe(7);
    expect(new Set(plans.map((p) => p.review)).size).toBe(7);
  });

  it('powtórka to język sprzed 3 dni', () => {
    const today = planForDate(cfg, '2026-01-01', '2026-02-10');
    const threeAgo = planForDate(cfg, '2026-01-01', '2026-02-07');
    expect(today.review).toBe(threeAgo.learn);
  });

  it('cykl działa przez zmianę roku i daty przed startem', () => {
    expect(daysBetween('2025-12-30', '2026-01-02')).toBe(3);
    expect(planForDate(cfg, '2026-01-08', '2026-01-01').learn).toBe('fr');
  });

  it('wykrywa złą rotację', () => {
    const bad = { ...cfg, order: ['fr', 'zh', 'de', 'es', 'ar', 'ru', 'aii'] };
    expect(validateRotation(bad).length).toBeGreaterThan(0);
  });

  it('ustawienie języka na dziś', () => {
    const start = cycleStartFor(cfg, 'de', '2026-10-26');
    expect(planForDate(cfg, start, '2026-10-26').learn).toBe('de');
  });
});
