import { describe, expect, it } from 'vitest';
import { classifyTone, contourSemitones, extractPitch } from '../../src/lib/audio/pitch.ts';

const SR = 16000;
/** Syntetyczny „głos”: ton podstawowy według funkcji f(x) + harmoniczne. */
function voice(f: (x: number) => number, sec = 0.5): Float32Array {
  const n = Math.round(sec * SR);
  const out = new Float32Array(n + 4000);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const hz = f(i / n);
    phase += (2 * Math.PI * hz) / SR;
    out[i + 2000] = 0.5 * Math.sin(phase) + 0.2 * Math.sin(2 * phase) + 0.1 * Math.sin(3 * phase);
  }
  return out;
}

const REF = 150; // środek głosu
const st = (s: number) => REF * 2 ** (s / 12);

describe('rozpoznawanie tonów z wysokości głosu', () => {
  it('wykrywa wysokość czystego tonu', () => {
    const frames = extractPitch(voice(() => 200), SR).filter((f) => f.hz);
    const mid = frames[Math.floor(frames.length / 2)].hz!;
    expect(mid).toBeGreaterThan(195);
    expect(mid).toBeLessThan(205);
  });

  it.each([
    [1, (x: number) => st(4 + 0 * x)],
    [2, (x: number) => st(-1 + 6 * x)],
    [3, (x: number) => st(x < 0.6 ? -1 - 5 * (x / 0.6) : -6 + 4 * ((x - 0.6) / 0.4))],
    [4, (x: number) => st(5 - 10 * x)],
  ])('ton %i', (tone, f) => {
    const g = classifyTone(extractPitch(voice(f), SR), REF);
    expect(g.tone).toBe(tone);
  });

  it('niski równy głos to 3. ton (półtrzeci)', () => {
    expect(classifyTone(extractPitch(voice(() => st(-5)), SR), REF).tone).toBe(3);
  });

  it('cisza = brak oceny', () => {
    expect(classifyTone(extractPitch(new Float32Array(8000), SR), REF).tone).toBeNull();
  });

  it('krzywa do wykresu ma środek w zerze', () => {
    const c = contourSemitones(extractPitch(voice(() => 220), SR)).filter((v): v is number => v !== null);
    expect(Math.abs(c[Math.floor(c.length / 2)])).toBeLessThan(0.5);
  });
});
