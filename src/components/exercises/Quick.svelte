<script lang="ts">
  // Gra „Szybka odpowiedź”: widzisz znaczenie, masz kilka sekund, mówisz. Punkty za zgodność i tempo.
  import { app } from '../../lib/app.svelte.ts';
  import * as db from '../../lib/db.ts';
  import type { Language, Phrase } from '../../lib/types.ts';
  import type { Recording } from '../../lib/audio/recorder.ts';
  import { compareSpeech } from '../../lib/compare.ts';
  import { transcribe, loadAsr } from '../../lib/speech/asr.ts';
  import { playReference } from '../../lib/reference.ts';
  import PhraseView from '../PhraseView.svelte';
  import Recorder from '../Recorder.svelte';

  let { phrases, language, ondone }: { phrases: Phrase[]; language: Language; ondone: () => void } = $props();

  const SECONDS = 6;
  const order = $derived([...phrases].sort(() => Math.random() - 0.5));
  let i = $state(0);
  let started = $state(false);
  let points = $state(0);
  let last = $state<{ phrase: Phrase; heard: string; score: number; gained: number } | null>(null);
  let busy = $state(false);
  let best = $state(0);
  let error = $state<string | null>(null);
  const key = $derived(`quick-best:${language.code}`);

  $effect(() => {
    void db.get<number>('kv', key).then((v) => (best = v ?? 0));
  });

  async function begin() {
    error = null;
    busy = true;
    try {
      await loadAsr(app.settings.modelSize);
      started = true;
    } catch (e) {
      error = `Gra potrzebuje rozpoznawania mowy: ${e instanceof Error ? e.message : e}`;
    } finally {
      busy = false;
    }
  }

  async function onrec(r: Recording) {
    const phrase = order[i];
    busy = true;
    try {
      const heard = await transcribe(r.samples16k, language.whisper!, app.settings.modelSize);
      const map = language.code === 'zh' ? await app.pinyinMap() : undefined;
      const { score } = compareSpeech(phrase.original, heard, language.code, map);
      const speedBonus = Math.max(0, (SECONDS - r.durationSec) / SECONDS);
      const gained = Math.round(score * 100 + (score > 0.7 ? speedBonus * 30 : 0));
      points += gained;
      last = { phrase, heard, score, gained };
    } finally {
      busy = false;
    }
  }

  async function next() {
    last = null;
    if (i + 1 >= order.length) {
      if (points > best) await db.put('kv', key, points);
      ondone();
    } else i++;
  }
</script>

<div class="stack">
  <span class="badge">Gra: szybka odpowiedź</span>
  {#if !started}
    <p>Widzisz znaczenie i od razu mówisz frazę. {SECONDS} sekund na odpowiedź. {order.length} fraz.</p>
    <p class="small muted">Rekord: {best} pkt</p>
    <div class="row">
      <button class="primary big" onclick={begin} disabled={busy}>{busy ? 'Ładuję rozpoznawanie…' : 'Graj'}</button>
      <button data-next onclick={ondone}>Pomiń</button>
    </div>
    {#if error}<p class="notice">{error}</p>{/if}
  {:else}
    <div class="row" style="justify-content: space-between">
      <span class="small muted">{i + 1} / {order.length}</span>
      <strong>{points} pkt</strong>
    </div>
    {#if last}
      <section class="card stack">
        <strong>{last.score >= 0.95 ? 'Świetnie!' : last.score >= 0.7 ? 'Prawie!' : 'Jeszcze nie.'} +{last.gained}</strong>
        <PhraseView phrase={last.phrase} {language} compact />
        <p class="small">Rozpoznano: „{last.heard || '—'}”</p>
        <div class="row">
          <button data-ref onclick={() => playReference(last!.phrase, language, app.settings.ttsRate)}>▶ Wzór</button>
          <button class="primary" data-next onclick={next}>Dalej →</button>
        </div>
      </section>
    {:else}
      <div class="prompt">{order[i].meaning.pl ?? order[i].meaning.en}</div>
      {#if busy}
        <p class="muted">Sprawdzam…</p>
      {:else}
        {#key i}
          <Recorder label="Mów" maxSec={SECONDS} autoStart onrecorded={onrec} />
        {/key}
      {/if}
    {/if}
  {/if}
</div>

<style>
  .prompt {
    font-size: 1.6rem;
    font-weight: 700;
  }
</style>
