<script lang="ts">
  // Gra w tony: (1) słuchanie – rozpoznaj ton, (2) mówienie – aplikacja mierzy wysokość głosu.
  import { onMount } from 'svelte';
  import { app } from '../../lib/app.svelte.ts';
  import type { Language, ToneDrill } from '../../lib/types.ts';
  import type { Recording } from '../../lib/audio/recorder.ts';
  import { classifyTone, extractPitch, median, longestVoicedRun, type ToneGuess } from '../../lib/audio/pitch.ts';
  import { TONE_NAMES } from '../../lib/pinyin.ts';
  import { speak, ttsAvailable } from '../../lib/speech/tts.ts';
  import Recorder from '../Recorder.svelte';
  import PitchChart from '../PitchChart.svelte';
  import { toneTemplate } from '../../lib/audio/pitch.ts';

  let { language, ondone }: { language: Language; ondone: () => void } = $props();

  const ROUND = 6;
  let drills = $state<ToneDrill[]>([]);
  let mode = $state<'menu' | 'listen' | 'speak' | 'calibrate'>('menu');
  let items = $state<ToneDrill[]>([]);
  let i = $state(0);
  let correct = $state(0);
  let answer = $state<number | null>(null);
  let guess = $state<ToneGuess | null>(null);
  let attempt = $state(0);
  const tts = $derived(ttsAvailable(language.bcp47));

  onMount(async () => {
    drills = await app.toneDrills();
  });

  const pick = () => [...drills].sort(() => Math.random() - 0.5).slice(0, ROUND);

  function start(m: 'listen' | 'speak') {
    if (m === 'speak' && !app.settings.toneRefHz) {
      mode = 'calibrate';
      return;
    }
    items = pick();
    i = 0;
    correct = 0;
    answer = null;
    guess = null;
    mode = m;
    if (m === 'listen') void say();
  }

  const say = () => speak(items[i].hanzi, language.bcp47, 0.8);

  function choose(t: number) {
    if (answer !== null) return;
    answer = t;
    if (t === items[i].tone) correct++;
  }

  function onSpeak(r: Recording) {
    guess = classifyTone(extractPitch(r.samples, r.sampleRate), app.settings.toneRefHz!);
    answer = guess.tone ?? 0;
    if (guess.tone === items[i].tone) correct++;
  }

  async function calibrate(r: Recording) {
    // Kalibracja: Twój 1. ton (wysoki, równy) ≈ 4 półtony nad Twoim środkiem głosu.
    const run = longestVoicedRun(extractPitch(r.samples, r.sampleRate));
    if (run.length < 8) return;
    const t1 = median(run.map((f) => f.hz as number));
    app.settings.toneRefHz = t1 / 2 ** (4 / 12);
    await app.saveSettings();
    start('speak');
  }

  function next() {
    answer = null;
    guess = null;
    attempt++;
    if (i + 1 >= items.length) mode = 'menu';
    else {
      i++;
      if (mode === 'listen') void say();
    }
  }
</script>

<div class="stack">
  <span class="badge">Gra: tony</span>
  {#if mode === 'menu'}
    {#if items.length && i + 1 >= items.length}<p><strong>Wynik: {correct} / {items.length}</strong></p>{/if}
    <p>Pary minimalne (np. mā má mǎ mà). Krótko i często: to najszybsza droga do tonów.</p>
    <div class="row">
      <button class="primary" onclick={() => start('listen')} disabled={!tts || !drills.length}>Słuchaj: jaki to ton?</button>
      <button class="primary" onclick={() => start('speak')} disabled={!drills.length}>Mów: trafiasz w ton?</button>
      <button data-next onclick={ondone}>Dalej →</button>
    </div>
    {#if !tts}<p class="small notice">Brak chińskiego głosu syntezatora na tym urządzeniu, więc gra w słuchanie jest wyłączona.</p>{/if}
    {#if app.settings.toneRefHz}
      <button class="small" onclick={() => (mode = 'calibrate')}>Skalibruj głos ponownie</button>
    {/if}
  {:else if mode === 'calibrate'}
    <p>Kalibracja: powiedz <strong>mā</strong> (1. ton) wysoko i równo, ok. 1 sekundy.</p>
    <Recorder label="Nagraj mā" maxSec={3} onrecorded={calibrate} />
    <button onclick={() => (mode = 'menu')}>Wróć</button>
  {:else}
    {@const d = items[i]}
    <p class="small muted">{i + 1} / {items.length} · trafione: {correct}</p>
    {#if mode === 'listen'}
      <div class="big">{answer === null ? '?' : `${d.hanzi} ${d.pinyin}`}</div>
      <button data-ref onclick={say}>▶ Jeszcze raz</button>
      <div class="tones">
        {#each [1, 2, 3, 4] as t (t)}
          <button
            class:good={answer !== null && t === d.tone}
            class:wrong={answer === t && t !== d.tone}
            onclick={() => choose(t)}
          >
            <svg viewBox="0 0 40 24" width="40" height="24" aria-hidden="true"><polyline points={toneTemplate(t, 8).map((v, j) => `${(j / 7) * 40},${12 - v * 1.6}`).join(' ')} fill="none" stroke="currentColor" stroke-width="2.5" /></svg>
            {TONE_NAMES[t]}
          </button>
        {/each}
      </div>
    {:else}
      <div class="big">{d.hanzi} <span>{d.pinyin}</span></div>
      <p class="small muted">{TONE_NAMES[d.tone]} · {d.meaning}</p>
      {#if answer === null}
        {#key attempt}<Recorder label="Powiedz" maxSec={3} onrecorded={onSpeak} />{/key}
      {:else if guess}
        <PitchChart tones={[d.tone]} series={[{ label: 'Ty', color: 'me', values: guess.contour }]} />
        <p>
          {#if guess.tone === d.tone}<span class="badge ok">trafiony</span>
          {:else if guess.tone === null}<span class="badge warn">nie wiem</span>
          {:else}<span class="badge bad">brzmi jak ton {guess.tone}</span>{/if}
          {guess.reason} {!guess.confident && guess.tone ? '(pomiar niepewny)' : ''}
        </p>
        <button onclick={() => { answer = null; guess = null; attempt++; }}>Spróbuj jeszcze raz</button>
      {/if}
    {/if}
    {#if answer !== null}<button class="primary" data-next onclick={next}>Dalej →</button>{/if}
  {/if}
</div>

<style>
  .big {
    font-size: 2.6rem;
    font-weight: 700;
  }
  .big span {
    font-size: 1.6rem;
    font-weight: 500;
  }
  .tones {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
  }
  .tones button {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    text-align: left;
  }
  .good {
    background: var(--ok-bg);
    border-color: var(--ok);
  }
  .wrong {
    background: var(--bad-bg);
    border-color: var(--bad);
  }
</style>
