// Wzór dźwiękowy frazy. Kolejność: Twój zapisany wzór (np. od native speakera) > nagranie ze źródła > syntezator.

import * as db from './db.ts';
import type { Language, Phrase } from './types.ts';
import { speak, ttsAvailable } from './speech/tts.ts';

export type RefKind = 'own' | 'audio' | 'tts' | 'none';

export async function referenceKind(phrase: Phrase, lang: Language): Promise<RefKind> {
  if (await db.get<Blob>('recordings', `ref:${phrase.id}`)) return 'own';
  if (phrase.audio?.url) return 'audio';
  if (phrase.original && ttsAvailable(lang.bcp47)) return 'tts';
  return 'none';
}

let current: HTMLAudioElement | null = null;

function playUrl(url: string, rate = 1): Promise<void> {
  current?.pause();
  const a = new Audio(url);
  a.playbackRate = rate;
  current = a;
  return new Promise((resolve) => {
    a.onended = () => resolve();
    a.onerror = () => resolve();
    a.play().catch(() => resolve());
  });
}

export async function playReference(phrase: Phrase, lang: Language, rate = 0.9): Promise<RefKind> {
  const own = await db.get<Blob>('recordings', `ref:${phrase.id}`);
  if (own) {
    await playUrl(URL.createObjectURL(own), rate < 0.8 ? 0.8 : 1);
    return 'own';
  }
  if (phrase.audio?.url) {
    await playUrl(phrase.audio.url, rate < 0.8 ? 0.8 : 1);
    return 'audio';
  }
  if (phrase.original && ttsAvailable(lang.bcp47)) {
    await speak(phrase.original, lang.bcp47, rate);
    return 'tts';
  }
  return 'none';
}

export function playBlobUrl(url: string): Promise<void> {
  return playUrl(url);
}

export async function saveOwnReference(phraseId: string, blob: Blob) {
  await db.put('recordings', `ref:${phraseId}`, blob);
}

export async function deleteOwnReference(phraseId: string) {
  await db.del('recordings', `ref:${phraseId}`);
}

/** Wzór jako plik (do wykresu wysokości). Syntezatora nie da się nagrać, więc wtedy null. */
export async function referenceBlobUrl(phrase: Phrase): Promise<string | null> {
  const own = await db.get<Blob>('recordings', `ref:${phrase.id}`);
  if (own) return URL.createObjectURL(own);
  return phrase.audio?.url ?? null;
}

export const REF_LABEL: Record<RefKind, string> = {
  own: 'Twój zapisany wzór',
  audio: 'nagranie człowieka ze źródła',
  tts: 'syntezator mowy (głos z urządzenia)',
  none: 'brak wzoru',
};
