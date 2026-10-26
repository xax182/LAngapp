// Typy danych treści. Te same typy opisują pliki w content/ (YAML) i public/content/ (JSON).

export type Status = 'zweryfikowane' | 'niezweryfikowane';

/** Jak wiarygodna jest automatyczna ocena dla danego języka. */
export type AsrSupport = 'dobre' | 'słabe' | 'brak';

export interface AudioRef {
  url: string;
  author: string;
  license: string;
  source_url?: string;
}

export interface Phrase {
  id: string;
  lesson: number;
  /** Klucz z content/core/curriculum.yaml, jeśli fraza z programu wspólnego. */
  key?: string;
  /** Oryginał w piśmie danego języka. Może być pusty (np. Suret bez zweryfikowanego pisma). */
  original: string;
  /** Pinyin z tonami (zh), romanizacja (ar, aii). */
  romanization?: string;
  ipa?: string;
  meaning: { en?: string; pl?: string };
  audio?: AudioRef | null;
  /** Skąd fraza pochodzi (opis + licencja). */
  source: string;
  source_url?: string;
  status: Status;
  /** Pola wygenerowane automatycznie (np. "romanization", "ipa"), a nie wzięte ze źródła. */
  generated?: string[];
  notes?: string;
}

export interface Language {
  code: string;
  name: string;
  /** Znak na pieczęci języka (1–2 litery). */
  seal: string;
  /** Np. „po francusku”, do poleceń w ćwiczeniach. */
  inLanguage: string;
  /** Kod BCP-47 dla syntezy mowy i rozpoznawania w przeglądarce. */
  bcp47: string;
  /** Nazwa języka dla Whispera albo null, jeśli Whisper go nie zna. */
  whisper: string | null;
  asr: AsrSupport;
  dir: 'ltr' | 'rtl';
  /** Opis granic oceny wymowy, pokazywany w aplikacji. */
  limits: string;
  /** Uwagi o odmianie/dialekcie. */
  variety?: string;
  romanizationLabel?: string;
  /** Rodzaje ćwiczeń dostępne w tym języku. */
  exercises: ExerciseKind[];
}

export type ExerciseKind = 'shadow' | 'say' | 'quick' | 'tones';

export interface Gap {
  lesson: number;
  key: string;
  hint: string;
}

export interface LanguagePack {
  language: Language;
  lessons: { id: number; title: string }[];
  phrases: Phrase[];
  gaps: Gap[];
}

export interface ToneDrill {
  hanzi: string;
  pinyin: string;
  tone: number;
  meaning: string;
  source: string;
}

export interface ContentIndex {
  generatedAt: string;
  rotation: {
    order: string[];
    reviewOffsetDays: number;
    forbiddenPairs: [string, string][];
    minutesNew: number;
    minutesReview: number;
    newPerSession: number;
  };
  languages: Language[];
  counts: Record<string, { phrases: number; verified: number; gaps: number }>;
}
