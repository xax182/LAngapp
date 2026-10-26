// Krzywa wysokości głosu i rozpoznawanie tonów mandaryńskich.
// Liczenie wysokości (autokorelacja) robi biblioteka pitchy; tu jest obróbka i klasyfikacja.

import { PitchDetector } from 'pitchy';

export interface PitchFrame {
  t: number; // sekundy
  hz: number | null; // null = cisza / brak głosu
}

const MIN_HZ = 60;
const MAX_HZ = 600;

export function extractPitch(samples: Float32Array, sampleRate: number, hopSec = 0.01): PitchFrame[] {
  const win = 2048 <= samples.length ? (sampleRate > 24000 ? 2048 : 1024) : samples.length;
  if (win < 256) return [];
  const detector = PitchDetector.forFloat32Array(win);
  detector.minVolumeDecibels = -45;
  const hop = Math.max(1, Math.round(hopSec * sampleRate));
  const frames: PitchFrame[] = [];
  for (let start = 0; start + win <= samples.length; start += hop) {
    const [hz, clarity] = detector.findPitch(samples.subarray(start, start + win), sampleRate);
    const good = clarity > 0.85 && hz >= MIN_HZ && hz <= MAX_HZ;
    frames.push({ t: (start + win / 2) / sampleRate, hz: good ? hz : null });
  }
  return frames;
}

export const hzToSemitones = (hz: number, refHz: number) => 12 * Math.log2(hz / refHz);

export function median(values: number[]): number {
  if (!values.length) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Filtr medianowy usuwa pojedyncze błędne skoki wysokości (np. o oktawę). */
export function smooth(values: number[], k = 5): number[] {
  const h = k >> 1;
  return values.map((_, i) => median(values.slice(Math.max(0, i - h), i + h + 1)));
}

/** Najdłuższy ciągły odcinek z głosem (dopuszcza krótkie przerwy). */
export function longestVoicedRun(frames: PitchFrame[], maxGap = 3): PitchFrame[] {
  let best: PitchFrame[] = [];
  let cur: PitchFrame[] = [];
  let gap = 0;
  for (const f of frames) {
    if (f.hz !== null) {
      cur.push(f);
      gap = 0;
    } else if (cur.length) {
      gap++;
      if (gap > maxGap) {
        if (cur.length > best.length) best = cur;
        cur = [];
        gap = 0;
      }
    }
  }
  if (cur.length > best.length) best = cur;
  return best;
}

export interface ToneGuess {
  tone: 1 | 2 | 3 | 4 | null;
  confident: boolean;
  /** Przebieg w półtonach względem Twojego poziomu odniesienia (do wykresu). */
  contour: number[];
  reason: string;
}

/**
 * Rozpoznaje ton pojedynczej sylaby.
 * refHz = Twój typowy poziom głosu (mediana z kalibracji). Bez niego nie da się odróżnić
 * wysokiego równego (1) od niskiego równego (3).
 */
export function classifyTone(frames: PitchFrame[], refHz: number): ToneGuess {
  const run = longestVoicedRun(frames);
  if (run.length < 8) {
    return { tone: null, confident: false, contour: [], reason: 'Za krótki dźwięk albo za cicho.' };
  }
  const st = smooth(run.map((f) => hzToSemitones(f.hz as number, refHz)), 5);
  // Brzegi sylaby są niestabilne; odcinamy po 10%.
  const cut = Math.floor(st.length * 0.1);
  const c = st.slice(cut, st.length - cut || undefined);
  const n = c.length;
  const part = Math.max(1, Math.floor(n * 0.2));
  const start = median(c.slice(0, part));
  const end = median(c.slice(n - part));
  let minI = 0;
  c.forEach((v, i) => {
    if (v < c[minI]) minI = i;
  });
  const minV = c[minI];
  const minPos = minI / (n - 1);
  const range = Math.max(...c) - minV;
  const level = median(c);
  const rise = end - start;

  if (range < 2) {
    if (level > -1.5) return { tone: 1, confident: level > 0, contour: c, reason: 'Równo i wysoko.' };
    return { tone: 3, confident: level < -3, contour: c, reason: 'Równo i nisko (często tak brzmi 3. ton).' };
  }
  if (minPos > 0.25 && minPos < 0.8 && start - minV > 1.5 && end - minV > 1.5 && (level < 1 || minV < -2)) {
    return { tone: 3, confident: start - minV > 2.5 && end - minV > 2.5, contour: c, reason: 'Spada, a potem rośnie.' };
  }
  if (rise > 2.5) return { tone: 2, confident: rise > 4, contour: c, reason: 'Rośnie.' };
  if (rise < -3) return { tone: 4, confident: rise < -5, contour: c, reason: 'Wyraźnie spada.' };
  if (rise < -1.5 && level < -2) return { tone: 3, confident: false, contour: c, reason: 'Nisko i lekko w dół.' };
  return { tone: null, confident: false, contour: c, reason: 'Kształt niejednoznaczny.' };
}

/** Schematyczny kształt tonu (w półtonach względem poziomu odniesienia), do rysowania wzoru. */
export function toneTemplate(tone: number, points = 20): number[] {
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const x = i / (points - 1);
    switch (tone) {
      case 1:
        out.push(4);
        break;
      case 2:
        out.push(-1 + 5 * x);
        break;
      case 3:
        out.push(x < 0.6 ? -1 - 5 * (x / 0.6) : -6 + 3 * ((x - 0.6) / 0.4));
        break;
      case 4:
        out.push(5 - 9 * x);
        break;
      default:
        out.push(0);
    }
  }
  return out;
}

/**
 * Krzywa do wykresu: półtony względem mediany głosu w nagraniu, z obciętą ciszą na początku i końcu.
 * Dzięki temu męski i kobiecy głos dają porównywalny kształt.
 */
export function contourSemitones(frames: PitchFrame[], refHz?: number): (number | null)[] {
  const first = frames.findIndex((f) => f.hz !== null);
  if (first < 0) return [];
  let last = frames.length - 1;
  while (frames[last].hz === null) last--;
  const part = frames.slice(first, last + 1);
  const ref = refHz ?? median(part.filter((f) => f.hz !== null).map((f) => f.hz as number));
  const raw = part.map((f) => (f.hz === null ? null : hzToSemitones(f.hz, ref)));
  // Wygładzanie tylko w obrębie odcinków z głosem.
  const out: (number | null)[] = [...raw];
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === null) continue;
    const win = raw.slice(Math.max(0, i - 2), i + 3).filter((v): v is number => v !== null);
    out[i] = median(win);
  }
  return out;
}
