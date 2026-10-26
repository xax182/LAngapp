// Wygląd: motyw, akcent, szkło, efekty, dźwięki. Zapamiętywane w tej przeglądarce (localStorage).

export type Theme = 'auto' | 'krem' | 'noc';
export type Accent = 'indygo' | 'cynober' | 'matcha' | 'sakura' | 'zloto';

export interface Look {
  theme: Theme;
  accent: Accent;
  glass: number; // 0.5..0.95 = nieprzezroczystość szkła
  fx: boolean; // animacje tła i stempla
  sounds: boolean; // ciche dźwięki
}

const KEY = 'poliglota-look';
const DEFAULTS: Look = { theme: 'auto', accent: 'indygo', glass: 0.74, fx: true, sounds: false };

export const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: 'indygo', label: 'Indygo', swatch: '#2f4c8a' },
  { id: 'cynober', label: 'Cynober', swatch: '#c8432a' },
  { id: 'matcha', label: 'Matcha', swatch: '#5f8a38' },
  { id: 'sakura', label: 'Sakura', swatch: '#d0779b' },
  { id: 'zloto', label: 'Złoto', swatch: '#b8872a' },
];

function load(): Look {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export const look = $state<Look>(load());

export function applyLook() {
  const root = document.documentElement;
  if (look.theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = look.theme;
  root.dataset.accent = look.accent;
  root.dataset.fx = look.fx ? 'on' : 'off';
  root.style.setProperty('--glass-a', String(look.glass));
  try {
    localStorage.setItem(KEY, JSON.stringify(look));
  } catch {
    /* prywatne okno: działa bez zapamiętania */
  }
}

/** Czy efekty mogą się ruszać (przełącznik + ustawienie systemu). */
export function motionAllowed(): boolean {
  return look.fx && !matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let ac: AudioContext | null = null;
/** Cichy dźwięk (WebAudio): stempel = niski stuk, dzwonek = czysty ton, tik = krótki klik. */
export function chime(kind: 'stamp' | 'bell' | 'tick') {
  if (!look.sounds) return;
  try {
    ac ??= new AudioContext();
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const spec = { stamp: [110, 0.18, 0.22], bell: [880, 0.08, 0.9], tick: [1600, 0.04, 0.05] }[kind];
    osc.type = kind === 'stamp' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(spec[0], t);
    if (kind === 'stamp') osc.frequency.exponentialRampToValueAtTime(55, t + spec[2]);
    gain.gain.setValueAtTime(spec[1], t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + spec[2]);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + spec[2] + 0.02);
  } catch {
    /* brak dźwięku nie przeszkadza */
  }
}
