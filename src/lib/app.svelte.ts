// Stan aplikacji: ustawienia, treść, karty powtórek, licznik minut.

import * as db from './db.ts';
import type { ContentIndex, Language, LanguagePack, ToneDrill } from './types.ts';
import type { PinyinMap } from './compare.ts';
import { cycleStartFor, localIsoDate, planForDate, type DayPlan } from './rotation.ts';
import { newCard, review, revive, type StoredCard } from './srs.ts';
import type { ModelSize } from './speech/asr.ts';
import type { Grade } from 'ts-fsrs';

export interface Settings {
  cycleStart: string | null;
  modelSize: ModelSize;
  ttsRate: number;
  /** Półtony: Twój typowy poziom głosu (Hz) do gry w tony. */
  toneRefHz: number | null;
}

const DEFAULTS: Settings = { cycleStart: null, modelSize: 'base', ttsRate: 0.85, toneRefHz: null };

const base = import.meta.env.BASE_URL;

class AppState {
  index = $state<ContentIndex | null>(null);
  settings = $state<Settings>({ ...DEFAULTS });
  cards = $state<StoredCard[]>([]);
  /** Sekundy nauki: klucz "data|język|tryb". */
  seconds = $state<Record<string, number>>({});
  error = $state<string | null>(null);
  private packs = new Map<string, Promise<LanguagePack>>();
  private pinyin: Promise<PinyinMap> | null = null;
  private drills: Promise<ToneDrill[]> | null = null;

  async init() {
    try {
      const res = await fetch(`${base}content/index.json`);
      if (!res.ok) throw new Error(`Brak treści (HTTP ${res.status}).`);
      this.index = await res.json();
      const saved = await db.get<Partial<Settings>>('kv', 'settings');
      this.settings = { ...DEFAULTS, ...saved };
      if (!this.settings.cycleStart) {
        this.settings.cycleStart = localIsoDate();
        await this.saveSettings();
      }
      this.cards = (await db.entries<StoredCard>('cards')).map(([, c]) => revive(c));
      this.seconds = Object.fromEntries(await db.entries<number>('minutes'));
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    }
  }

  async saveSettings() {
    await db.put('kv', 'settings', $state.snapshot(this.settings));
  }

  language(code: string): Language | undefined {
    return this.index?.languages.find((l) => l.code === code);
  }

  plan(dateIso = localIsoDate()): DayPlan | null {
    if (!this.index || !this.settings.cycleStart) return null;
    return planForDate(this.index.rotation, this.settings.cycleStart, dateIso);
  }

  async setTodayLanguage(code: string) {
    if (!this.index) return;
    this.settings.cycleStart = cycleStartFor(this.index.rotation, code, localIsoDate());
    await this.saveSettings();
  }

  pack(code: string): Promise<LanguagePack> {
    let p = this.packs.get(code);
    if (!p) {
      p = fetch(`${base}content/${code}.json`).then((r) => {
        if (!r.ok) throw new Error(`Brak pliku treści dla ${code}.`);
        return r.json();
      });
      this.packs.set(code, p);
    }
    return p;
  }

  pinyinMap(): Promise<PinyinMap> {
    this.pinyin ??= fetch(`${base}content/zh-pinyin.json`).then((r) => r.json());
    return this.pinyin;
  }

  toneDrills(): Promise<ToneDrill[]> {
    this.drills ??= fetch(`${base}content/zh-tones.json`).then((r) => r.json());
    return this.drills;
  }

  card(phraseId: string): StoredCard | undefined {
    return this.cards.find((c) => c.phraseId === phraseId);
  }

  async ensureCard(phraseId: string, lang: string): Promise<StoredCard> {
    const existing = this.card(phraseId);
    if (existing) return existing;
    const c = newCard(phraseId, lang);
    this.cards.push(c);
    await db.put('cards', phraseId, $state.snapshot(c));
    return c;
  }

  async grade(phraseId: string, lang: string, grade: Grade, score?: number) {
    const c = await this.ensureCard(phraseId, lang);
    const next = review($state.snapshot(c) as StoredCard, grade, new Date(), score);
    this.cards = this.cards.map((x) => (x.phraseId === phraseId ? next : x));
    await db.put('cards', phraseId, next);
  }

  secondsFor(lang: string, mode: 'new' | 'review', date = localIsoDate()): number {
    return this.seconds[`${date}|${lang}|${mode}`] ?? 0;
  }

  /** Czy cel dnia (20 min nowej nauki) został osiągnięty w danym dniu. */
  dayDone(dateIso: string): boolean {
    const p = this.plan(dateIso);
    return !!p && !!this.index && this.secondsFor(p.learn, 'new', dateIso) >= this.index.rotation.minutesNew * 60;
  }

  /** Ile dni z rzędu (do dziś albo do wczoraj) osiągnięto cel dnia. */
  streak(today = new Date()): number {
    let n = 0;
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (!this.dayDone(localIsoDate(d))) d.setDate(d.getDate() - 1);
    while (this.dayDone(localIsoDate(d)) && n < 3650) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }

  async addSeconds(lang: string, mode: 'new' | 'review', s: number) {
    const key = `${localIsoDate()}|${lang}|${mode}`;
    this.seconds[key] = (this.seconds[key] ?? 0) + s;
    await db.put('minutes', key, this.seconds[key]);
  }
}

export const app = new AppState();
