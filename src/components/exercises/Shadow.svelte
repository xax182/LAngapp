<script lang="ts">
  // Shadowing: słuchasz wzoru i mówisz razem z nim / zaraz po nim, potem nagrywasz się i porównujesz.
  import { onMount } from 'svelte';
  import { app } from '../../lib/app.svelte.ts';
  import type { Language, Phrase } from '../../lib/types.ts';
  import type { Recording } from '../../lib/audio/recorder.ts';
  import { playReference, REF_LABEL, referenceKind, type RefKind } from '../../lib/reference.ts';
  import PhraseView from '../PhraseView.svelte';
  import Recorder from '../Recorder.svelte';
  import Attempt from '../Attempt.svelte';

  let { phrase, language, ondone }: { phrase: Phrase; language: Language; ondone: () => void } = $props();

  let kind = $state<RefKind>('none');
  let reps = $state(0);
  let looping = $state(false);
  let recording = $state<Recording | null>(null);
  let attempt = $state(0);

  onMount(() => {
    void referenceKind(phrase, language).then((k) => {
      kind = k;
      if (k !== 'none') void playReference(phrase, language, app.settings.ttsRate);
    });
    return () => (looping = false);
  });

  /** Pętla: wzór, przerwa na Twoje powtórzenie, wzór… 3 razy. */
  async function loop() {
    looping = true;
    for (let i = 0; i < 3 && looping; i++) {
      await playReference(phrase, language, app.settings.ttsRate);
      reps++;
      await new Promise((r) => setTimeout(r, 2200 + phrase.original.length * 60));
    }
    looping = false;
  }

  function finish() {
    looping = false;
    void app.ensureCard(phrase.id, language.code);
    ondone();
  }
</script>

<div class="stack">
  <span class="badge">Powtórz za mną</span>
  <PhraseView {phrase} {language} />

  {#if kind === 'none'}
    <p class="notice">Brak wzoru dźwiękowego dla tej frazy. Możesz go nagrać (np. od native speakera) w zakładce Języki.</p>
  {:else}
    <p class="small muted">Wzór: {REF_LABEL[kind]}.{kind === 'tts' && language.code === 'ar' ? ' Syntezator czyta raczej po standardowemu, nie po palestyńsku.' : ''}</p>
  {/if}

  <section class="card stack">
    <strong>1. Słuchaj i mów na głos razem ze wzorem</strong>
    <div class="row">
      <button onclick={() => playReference(phrase, language, app.settings.ttsRate)} disabled={kind === 'none'}>▶ Odtwórz</button>
      <button onclick={() => playReference(phrase, language, 0.6)} disabled={kind === 'none'}>▶ Wolno</button>
      <button onclick={loop} disabled={kind === 'none' || looping}>{looping ? 'Mów po każdym odtworzeniu…' : '↻ 3× z przerwą na powtórzenie'}</button>
    </div>
    {#if reps}<p class="small muted">Powtórzeń: {reps}</p>{/if}
  </section>

  <section class="card stack">
    <strong>2. Nagraj siebie i porównaj</strong>
    {#key attempt}
      <Recorder label="Nagraj siebie" onrecorded={(r) => (recording = r)} />
    {/key}
    {#if recording}
      {#key recording}
        <Attempt {phrase} {language} {recording} />
      {/key}
      <div class="row">
        <button onclick={() => { recording = null; attempt++; }}>Jeszcze raz</button>
      </div>
    {/if}
  </section>

  <div class="row">
    <button class="primary big" onclick={finish}>Dalej →</button>
  </div>
</div>
