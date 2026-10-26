<script lang="ts">
  // Wynik jednej próby: odsłuch A/B, wykres głosu, sprawdzenie rozpoznawaniem mowy.
  import { onMount } from 'svelte';
  import { app } from '../lib/app.svelte.ts';
  import type { Language, Phrase } from '../lib/types.ts';
  import type { Recording } from '../lib/audio/recorder.ts';
  import { loadReference } from '../lib/audio/recorder.ts';
  import { contourSemitones, extractPitch } from '../lib/audio/pitch.ts';
  import { compareSpeech, type CompareResult } from '../lib/compare.ts';
  import { parsePinyinText } from '../lib/pinyin.ts';
  import { onAsrStatus, transcribe, type AsrStatus } from '../lib/speech/asr.ts';
  import { playBlobUrl, playReference, referenceBlobUrl } from '../lib/reference.ts';
  import PitchChart from './PitchChart.svelte';

  let {
    phrase,
    language,
    recording,
    onscore,
  }: { phrase: Phrase; language: Language; recording: Recording; onscore?: (score: number | null) => void } = $props();

  let me = $state<(number | null)[]>([]);
  let ref = $state<(number | null)[]>([]);
  let result = $state<CompareResult | null>(null);
  let checking = $state(false);
  let asrError = $state<string | null>(null);
  let asr = $state<AsrStatus>({ state: 'idle', progress: 0 });

  const tones = $derived(language.code === 'zh' && phrase.romanization ? parsePinyinText(phrase.romanization).map((s) => s.tone) : []);
  const canCheck = $derived(language.asr !== 'brak' && !!language.whisper && !!phrase.original);

  onMount(() => {
    const off = onAsrStatus((s) => (asr = s));
    me = contourSemitones(extractPitch(recording.samples, recording.sampleRate));
    void (async () => {
      const url = await referenceBlobUrl(phrase);
      if (url) {
        const r = await loadReference(url);
        if (r) ref = contourSemitones(extractPitch(r.samples, r.sampleRate));
      }
    })();
    if (canCheck && asr.state === 'ready') void check();
    else if (!canCheck) onscore?.(null);
    return off;
  });

  async function check() {
    checking = true;
    asrError = null;
    try {
      const heard = await transcribe(recording.samples16k, language.whisper!, app.settings.modelSize);
      const map = language.code === 'zh' ? await app.pinyinMap() : undefined;
      result = compareSpeech(phrase.original, heard, language.code, map);
      onscore?.(result.score);
    } catch (e) {
      asrError = e instanceof Error ? e.message : String(e);
      onscore?.(null);
    } finally {
      checking = false;
    }
  }

  async function both() {
    await playReference(phrase, language, app.settings.ttsRate);
    await new Promise((r) => setTimeout(r, 300));
    await playBlobUrl(recording.url);
  }
</script>

<div class="stack">
  <div class="row">
    <button onclick={() => playReference(phrase, language, app.settings.ttsRate)}>▶ Wzór</button>
    <button onclick={() => playBlobUrl(recording.url)}>▶ Ja</button>
    <button onclick={both}>▶ Wzór, potem ja</button>
  </div>

  {#if me.length}
    <PitchChart
      tones={ref.length ? [] : tones}
      series={[...(ref.length ? [{ label: 'wzór', color: 'ref' as const, values: ref }] : []), { label: 'Ty', color: 'me' as const, values: me }]}
    />
    {#if tones.length && !ref.length}
      <p class="small muted">Linia przerywana to schemat tonów z pinyinu (rozłożony równo na sylaby). Porównuj kształt, nie dokładne położenie.</p>
    {/if}
  {:else}
    <p class="small muted">Nie wykryto głosu w nagraniu. Mów bliżej mikrofonu.</p>
  {/if}

  {#if canCheck}
    {#if result}
      <div class="result">
        <div class="tokens" dir={language.dir} lang={language.bcp47}>
          {#each result.target as t, i (i)}<span class:ok={t.ok} class:miss={!t.ok}>{t.token}</span>{language.code === 'zh' ? '' : ' '}{/each}
        </div>
        <p class="small">Rozpoznano: <span dir={language.dir} lang={language.bcp47}>„{result.heard || '—'}”</span> · zgodność {Math.round(result.score * 100)}%</p>
        {#if language.asr === 'słabe'}<p class="small notice">Dla tego języka rozpoznawanie jest słabe. Traktuj wynik jako podpowiedź.</p>{/if}
      </div>
    {:else if checking}
      <p class="small muted">Sprawdzam… {asr.state === 'loading' ? `(pobieranie modelu ${asr.progress}%)` : ''}</p>
    {:else}
      <button onclick={check}>Sprawdź rozpoznawaniem mowy{asr.state !== 'ready' ? ' (pobierze model)' : ''}</button>
    {/if}
    {#if asrError}<p class="notice">Rozpoznawanie nie zadziałało: {asrError}</p>{/if}
  {:else}
    <p class="small notice">Brak automatycznej oceny dla tego języka. Porównaj nagranie ze wzorem uchem i oceń sam.</p>
  {/if}
</div>

<style>
  .tokens {
    font-size: 1.5rem;
    line-height: 1.6;
  }
  .ok {
    color: var(--ok);
  }
  .miss {
    color: var(--bad);
    text-decoration: underline wavy;
  }
</style>
