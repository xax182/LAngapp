<script lang="ts">
  // „Powiedz sam”: widzisz znaczenie, mówisz z pamięci, potem sprawdzasz i oceniasz (FSRS).
  import { app } from '../../lib/app.svelte.ts';
  import type { Language, Phrase } from '../../lib/types.ts';
  import type { Recording } from '../../lib/audio/recorder.ts';
  import { suggestGrade } from '../../lib/compare.ts';
  import { GRADES } from '../../lib/srs.ts';
  import { playReference } from '../../lib/reference.ts';
  import type { Grade } from 'ts-fsrs';
  import PhraseView from '../PhraseView.svelte';
  import Recorder from '../Recorder.svelte';
  import Attempt from '../Attempt.svelte';

  let { phrase, language, ondone }: { phrase: Phrase; language: Language; ondone: (grade?: number) => void } = $props();

  let recording = $state<Recording | null>(null);
  let revealed = $state(false);
  let score = $state<number | null>(null);
  let hint = $state(false);
  const suggested = $derived(score === null ? null : suggestGrade(score));

  async function grade(g: Grade) {
    await app.grade(phrase.id, language.code, g, score ?? undefined);
    ondone(g);
  }

  // Klawisze 1–4 = ocena (po odsłonięciu odpowiedzi).
  $effect(() => {
    if (!revealed) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 4 && !(e.target as HTMLElement).matches('input, select, textarea')) void grade(n as Grade);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });
</script>

<div class="stack">
  <span class="badge">Powiedz sam</span>
  <p class="small muted">Jak to powiesz {language.inLanguage}?</p>
  <div class="prompt">
    {phrase.meaning.pl ?? ''}{#if phrase.meaning.en}<span class="muted" lang="en">{phrase.meaning.pl ? ' · ' : ''}{phrase.meaning.en}</span>{/if}
  </div>
  {#if hint && !revealed}<p class="small" dir={language.dir}>Podpowiedź: {(phrase.romanization || phrase.original).split(/\s+/)[0]}…</p>{/if}

  {#if !recording}
    <div class="row">
      <Recorder label="Mów" onrecorded={(r) => ((recording = r), (revealed = true))} />
      {#if !hint && (phrase.romanization || phrase.original)}<button onclick={() => (hint = true)}>Podpowiedź</button>{/if}
      <button onclick={() => (revealed = true)}>Nie wiem, pokaż</button>
    </div>
  {/if}

  {#if revealed}
    <section class="card stack">
      <PhraseView {phrase} {language} />
      {#if recording}
        <Attempt {phrase} {language} {recording} onscore={(s) => (score = s)} />
      {:else}
        <button data-ref onclick={() => playReference(phrase, language, app.settings.ttsRate)}>▶ Wzór</button>
      {/if}
    </section>
    <div class="stack">
      <strong>Jak poszło?</strong>
      <div class="row">
        {#each GRADES as g (g.grade)}
          <button class:primary={suggested === g.grade} aria-pressed={suggested === g.grade} onclick={() => grade(g.grade)}><kbd>{g.grade}</kbd> {g.label}</button>
        {/each}
      </div>
      {#if suggested}<p class="small muted">Podświetlona ocena to sugestia z rozpoznawania mowy. Decydujesz Ty.</p>{/if}
    </div>
  {/if}
</div>

<style>
  .prompt {
    font-size: 1.5rem;
    font-weight: 600;
  }
</style>
