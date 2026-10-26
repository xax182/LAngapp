<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '../lib/app.svelte.ts';
  import type { LanguagePack } from '../lib/types.ts';
  import { extraRound, planNewSession, planReviewSession, type Step } from '../lib/session.ts';
  import { loadAsr, wasDownloaded } from '../lib/speech/asr.ts';
  import { GRADES } from '../lib/srs.ts';
  import Shadow from './exercises/Shadow.svelte';
  import Say from './exercises/Say.svelte';
  import Quick from './exercises/Quick.svelte';
  import Tones from './exercises/Tones.svelte';
  import Seal from './Seal.svelte';
  import Stamp from './Stamp.svelte';

  let { mode, lang }: { mode: 'new' | 'review'; lang: string } = $props();

  let pack = $state<LanguagePack | null>(null);
  let steps = $state<Step[]>([]);
  let idx = $state(0);
  let error = $state<string | null>(null);
  let stamped = $state(false);
  let showStamp = $state(false);
  let introduced = $state(0);
  let grades = $state<number[]>([]);

  const target = $derived((mode === 'new' ? app.index!.rotation.minutesNew : app.index!.rotation.minutesReview) * 60);
  const spent = $derived(app.secondsFor(lang, mode));
  const goal = $derived(spent >= target);

  onMount(() => {
    // Jeśli cel był już osiągnięty przed wejściem, nie stemplujemy drugi raz.
    stamped = app.secondsFor(lang, mode) >= target;
    void app
      .pack(lang)
      .then((p) => {
        pack = p;
        if (p.language.whisper && wasDownloaded(app.settings.modelSize)) void loadAsr(app.settings.modelSize).catch(() => {});
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
      if (!stamped && app.secondsFor(lang, mode) >= target) {
        stamped = true;
        showStamp = true;
      }
    }, 5000);

    // Skróty: Enter = dalej, R = wzór (przyciski oznaczone data-next / data-ref).
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
      const pick = (sel: string) => [...document.querySelectorAll<HTMLButtonElement>(sel)].filter((b) => !b.disabled).pop();
      if (e.key === 'Enter' && t.tagName !== 'BUTTON') pick('[data-next]')?.click();
      if (e.key.toLowerCase() === 'r') pick('[data-ref]')?.click();
    };
    addEventListener('keydown', onKey);
    return () => {
      clearInterval(timer);
      removeEventListener('keydown', onKey);
    };
  });

  function next(result?: { grade?: number; introduced?: boolean }) {
    if (result?.grade) grades = [...grades, result.grade];
    if (result?.introduced) introduced++;
    if (idx + 1 < steps.length) {
      idx++;
      return;
    }
    if (pack && !goal) {
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
  const gradeCount = (g: number) => grades.filter((x) => x === g).length;
</script>

{#if showStamp && pack}
  <Stamp glyph={pack.language.seal} text="Cel dnia: {target / 60} min" ondone={() => (showStamp = false)} />
{/if}

{#if error}
  <p class="notice">{error}</p>
{:else if pack}
  <div class="bar card">
    <a class="close" href="#/" aria-label="Zakończ i wróć do planu">✕</a>
    <Seal glyph={pack.language.seal} on={goal} size={34} title={pack.language.name} />
    <div class="grow">
      <div class="small title"><strong>{mode === 'new' ? 'Nauka' : 'Powtórka'}</strong> · {pack.language.name}</div>
      <div class="progress" aria-label="Czas sesji" role="progressbar" aria-valuenow={Math.floor(spent / 60)} aria-valuemax={target / 60}><div style="width: {Math.min(100, (spent / target) * 100)}%"></div></div>
    </div>
    <span class="mono small time" class:goal>{mm(spent)}<span class="muted">/{mm(target)}</span></span>
  </div>

  {#if goal && step}
    <div class="goal-note small">
      <span>Cel na dziś osiągnięty. Możesz skończyć albo ćwiczyć dalej.</span>
      <a href="#/">Zakończ</a>
    </div>
  {/if}

  <div class="body">
    {#if step}
      <p class="small muted stepno">Krok {idx + 1} z {steps.length}</p>
      {#key idx}
        <div class="card thick step">
          {#if step.kind === 'shadow'}
            <Shadow phrase={step.phrase} language={pack.language} ondone={() => next({ introduced: true })} />
          {:else if step.kind === 'say'}
            <Say phrase={step.phrase} language={pack.language} ondone={(g) => next({ grade: g })} />
          {:else if step.kind === 'quick'}
            <Quick phrases={step.phrases} language={pack.language} ondone={() => next()} />
          {:else if step.kind === 'tones'}
            <Tones language={pack.language} ondone={() => next()} />
          {/if}
        </div>
      {/key}
      <p class="keys small muted"><kbd>Spacja</kbd> nagraj/stop · <kbd>R</kbd> wzór · <kbd>Enter</kbd> dalej · <kbd>1</kbd>–<kbd>4</kbd> ocena</p>
    {:else}
      <div class="card thick stack summary">
        <Seal glyph={pack.language.seal} on={goal} size={64} title={pack.language.name} />
        <h2>{pack.phrases.length === 0 ? 'Brak fraz' : 'Koniec materiału na dziś'}</h2>
        {#if pack.phrases.length === 0}
          <p class="small muted">Dodaj treść (zakładka Języki).</p>
        {:else}
          <p class="small muted">
            Nowe frazy: <strong>{introduced}</strong> · ocenione: <strong>{grades.length}</strong>
            {#if grades.length}
              ({GRADES.map((g) => `${g.label.toLowerCase()} ${gradeCount(g.grade)}`).join(', ')})
            {/if}
          </p>
          <p class="small muted">Frazy wrócą w powtórkach według algorytmu FSRS.</p>
        {/if}
        <a href="#/"><button class="primary" data-next>Wróć do planu</button></a>
      </div>
    {/if}
  </div>
{:else}
  <p class="muted">Ładowanie…</p>
{/if}

<style>
  .bar {
    position: sticky;
    top: 8px;
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.55rem 0.8rem;
    border-radius: 999px;
  }
  .close {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    text-decoration: none;
    color: var(--label2);
    flex: none;
  }
  .close:hover {
    background: var(--bg-el3);
  }
  .grow {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .time.goal {
    color: var(--gain);
    font-weight: 600;
  }
  .goal-note {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 0.6rem;
    padding: 0.5rem 0.9rem;
    border-radius: 12px;
    background: var(--gain-bg);
    color: var(--gain);
  }
  .goal-note a {
    color: var(--gain);
    font-weight: 600;
  }
  .body {
    margin-top: 1rem;
  }
  .stepno {
    margin: 0 0 0.4rem 0.2rem;
  }
  .step {
    animation: rise var(--t-med) var(--ease);
  }
  .summary {
    align-items: center;
    text-align: center;
  }
  .summary a {
    text-decoration: none;
  }
  .keys {
    text-align: center;
    margin-top: 1rem;
  }
  @media (hover: none) {
    .keys {
      display: none;
    }
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
</style>
