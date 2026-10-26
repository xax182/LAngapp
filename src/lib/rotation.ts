// Plan dnia: który język jest dziś nowy, a który idzie na powtórkę.
// Czysta logika, bez przeglądarki, żeby dało się ją testować.

export interface RotationConfig {
  /** Kolejność języków w cyklu (kody), np. ["fr","zh",...]. */
  order: string[];
  /** Powtórka = język sprzed tylu dni. */
  reviewOffsetDays: number;
  /** Pary, których nie wolno łączyć w jednym dniu (nauka + powtórka). */
  forbiddenPairs: [string, string][];
}

export interface DayPlan {
  dayNumber: number; // 1..order.length
  learn: string;
  review: string;
}

/** Liczba dni kalendarzowych między dwiema datami w formacie RRRR-MM-DD. */
export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.UTC(...parseIso(fromIso));
  const b = Date.UTC(...parseIso(toIso));
  return Math.round((b - a) / 86_400_000);
}

function parseIso(iso: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Zła data: ${iso}`);
  return [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
}

/** Dzisiejsza data lokalna jako RRRR-MM-DD. */
export function localIsoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

export function planForDate(cfg: RotationConfig, cycleStartIso: string, dateIso: string): DayPlan {
  const n = cfg.order.length;
  const idx = mod(daysBetween(cycleStartIso, dateIso), n);
  return {
    dayNumber: idx + 1,
    learn: cfg.order[idx],
    review: cfg.order[mod(idx - cfg.reviewOffsetDays, n)],
  };
}

/** Zwraca listę naruszeń reguły (pusta = rotacja poprawna). */
export function validateRotation(cfg: RotationConfig): string[] {
  const problems: string[] = [];
  const n = cfg.order.length;
  for (let i = 0; i < n; i++) {
    const learn = cfg.order[i];
    const review = cfg.order[mod(i - cfg.reviewOffsetDays, n)];
    if (learn === review) problems.push(`Dzień ${i + 1}: ten sam język do nauki i powtórki (${learn}).`);
    for (const [a, b] of cfg.forbiddenPairs) {
      if ((learn === a && review === b) || (learn === b && review === a)) {
        problems.push(`Dzień ${i + 1}: zakazana para ${a} + ${b}.`);
      }
    }
  }
  return problems;
}

/** Data startu cyklu tak, żeby podany język był nowy w podanym dniu. */
export function cycleStartFor(cfg: RotationConfig, learnLang: string, dateIso: string): string {
  const idx = cfg.order.indexOf(learnLang);
  if (idx < 0) throw new Error(`Nieznany język: ${learnLang}`);
  const [y, m, d] = parseIso(dateIso);
  const t = new Date(Date.UTC(y, m, d - idx));
  return t.toISOString().slice(0, 10);
}
