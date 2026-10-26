<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '../lib/app.svelte.ts';
  import type { LanguagePack } from '../lib/types.ts';
  import { extraRound, planNewSession, planReviewSession, type Step } from '../lib/session.ts';
  import Shadow from './exercises/Shadow.svelte';
  import Say from './exercises/Say.svelte';
  import Quick from './exercises/Quick.svelte';
  import Tones from './exercises/Tones.svelte';

  let { mode, lang }: { mode: 'new' | 'review'; lang: string } = $props();

  let pack = $state<LanguagePack | null>(null);
  let steps = $state<Step[]>([]);
  let idx = $state(0);
  let error = $state<string | null>(null);
  let overtime = $state(false);
  let dismissedOvertime = $state(false);

  const target = $derived((mode === 'new' ? app.index!.rotation.minutesNew : app.index!.rotation.minutesReview) * 60);
  const spent = $derived(app.secondsFor(lang, mode));

  onMount(() => {
    void app
      .pack(lang)
      .then((p) => {
        pack = p;
        const known = new Set(app.cards.map((c) => c.phraseId));
        steps =
          mode === 'new'
            ? planNewSession(p, known, app.index!.rotation.newPerSession)
            : planReviewSession(p, $state.snapshot(app.cards));
        if (!steps.length) steps = extraRound(p, $state.snapshot(app.cards));
      })
      .catch((e) => (error = e.message));

    // Liczymy tylko czas, gdy karta jest widoczna.
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void app.addSeconds(lang, mode, 5);
      if (app.secondsFor(lang, mode) >= target) overtime = true;
    }, 5000);
    return () => clearInterval(timer);
  });

  function next() {
    if (idx + 1 < steps.length) {
      idx++;
      return;
    }
    if (pack && app.secondsFor(lang, mode) < target) {
      const more = extraRound(pack, $state.snapshot(app.cards));
      if (more.length) {
        steps = [...steps, ...more];
        idx++;
        return;
      }
    }
    idx = steps.length;
  }

  const step = $derived(steps[idx]);
  const mm = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
</script>

{#if error}
  <p class="notice">{error}</p>
{:else if pack}
  <div class="top row">
    <a href="#/">← Plan dnia</a>
    <strong>{mode === 'new' ? 'Nauka' : 'Powtórka'}: {pack.language.name}</strong>
    <span class="badge">{mm(spent)} / {mm(target)}</span>
  </div>
  <div class="progress"><div style="width: {Math.min(100, (spent / target) * 100)}%"></div></div>

  {#if overtime && !dismissedOvertime}
    <div class="card stack done">
      <strong>Czas minął ({target / 60} min). Dobra robota!</strong>
      <div class="row">
        <a href="#/"><button class="primary">Zakończ</button></a>
        <button onclick={() => (dismissedOvertime = true)}>Jeszcze chwilę</button>
      </div>
    </div>
  {/if}

  <div class="body">
    {#if step}
      {#key idx}
        {#if step.kind === 'shadow'}
          <Shadow phrase={step.phrase} language={pack.language} ondone={next} />
        {:else if step.kind === 'say'}
          <Say phrase={step.phrase} language={pack.language} ondone={next} />
        {:else if step.kind === 'quick'}
          <Quick phrases={step.phrases} language={pack.language} ondone={next} />
        {:else if step.kind === 'tones'}
          <Tones language={pack.language} ondone={next} />
        {/if}
      {/key}
    {:else}
      <div class="card stack">
        <strong>Na dziś koniec materiału w tym języku.</strong>
        <p class="small muted">
          {pack.phrases.length === 0
            ? 'Brak fraz. Dodaj treść (zobacz zakładkę Języki).'
            : 'Wszystkie frazy są już wprowadzone. Wrócą w powtórkach.'}
        </p>
        <a href="#/"><button>Wróć do planu</button></a>
      </div>
    {/if}
  </div>
{:else}
  <p class="muted">Ładowanie…</p>
{/if}

<style>
  .top {
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }
  .body {
    margin-top: 1rem;
  }
  .done {
    margin-top: 1rem;
    border-color: var(--ok);
  }
  a:has(> button) {
    text-decoration: none;
  }
</style>
