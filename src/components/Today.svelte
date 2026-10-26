<script lang="ts">
  import { app } from '../lib/app.svelte.ts';
  import { daysBetween, localIsoDate } from '../lib/rotation.ts';
  import AsrStatus from './AsrStatus.svelte';
  import Seal from './Seal.svelte';

  const todayIso = localIsoDate();
  const plan = $derived(app.plan());
  const rot = $derived(app.index!.rotation);
  const learn = $derived(plan ? app.language(plan.learn) : undefined);
  const rev = $derived(plan ? app.language(plan.review) : undefined);
  const newMin = $derived(plan ? app.secondsFor(plan.learn, 'new') / 60 : 0);
  const revMin = $derived(plan ? app.secondsFor(plan.review, 'review') / 60 : 0);
  const streak = $derived(app.streak());
  const hasReview = $derived(!!rev && app.cards.some((c) => c.lang === rev.code));

  // Bieżący tydzień cyklu: od dnia 1 do dnia 7.
  const week = $derived.by(() => {
    if (!plan) return [];
    const today = new Date();
    return Array.from({ length: rot.order.length }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (plan.dayNumber - 1) + i);
      const iso = localIsoDate(d);
      const p = app.plan(iso)!;
      return { iso, date: d, ...p, done: app.dayDone(iso), isToday: iso === todayIso, past: daysBetween(iso, todayIso) > 0 };
    });
  });
  const fmt = (d: Date) => d.toLocaleDateString('pl-PL', { weekday: 'short' });
  const count = (code: string) => app.index!.counts[code];
  const pct = (v: number, max: number) => Math.min(100, (v / max) * 100);
  const due = $derived(rev ? app.cards.filter((c) => c.lang === rev.code && new Date(c.card.due) <= new Date()).length : 0);
</script>

{#if plan && learn && rev}
  <section class="hero">
    <p class="muted small">{new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
    <h1>Dzień {plan.dayNumber} z {rot.order.length}</h1>
    {#if streak > 0}<p class="small streak">{streak} {streak === 1 ? 'dzień' : 'dni'} z rzędu</p>{/if}
  </section>

  <section class="week card" aria-label="Tydzień cyklu">
    {#each week as w (w.iso)}
      {@const l = app.language(w.learn)!}
      <a class="day" class:today={w.isToday} href={w.isToday ? `#/sesja/nauka/${l.code}` : `#/jezyki/${l.code}`} title="{fmt(w.date)}: {l.name}">
        <Seal glyph={l.seal} on={w.done} size={38} title={l.name} />
        <span class="small">{fmt(w.date)}</span>
      </a>
    {/each}
  </section>

  <div class="stack">
    <section class="card main stack">
      <div class="row head">
        <Seal glyph={learn.seal} on={newMin >= rot.minutesNew} size={52} title={learn.name} />
        <div class="grow">
          <p class="small muted label">Nowa nauka</p>
          <h2>{learn.name}</h2>
        </div>
        <span class="mono small">{Math.floor(newMin)}/{rot.minutesNew} min</span>
      </div>
      <div class="progress" aria-label="Postęp nauki" role="progressbar" aria-valuenow={Math.floor(newMin)} aria-valuemax={rot.minutesNew}>
        <div style="width: {pct(newMin, rot.minutesNew)}%"></div>
      </div>
      {#if count(learn.code).phrases === 0}
        <p class="notice">Brak fraz w tym języku. Zobacz <a href="#/jezyki/{learn.code}">luki w treści</a>.</p>
      {:else}
        <p class="small muted">{count(learn.code).phrases} fraz w programie · shadowing, mówienie z pamięci, gry.</p>
      {/if}
      <a class="cta" href="#/sesja/nauka/{learn.code}" aria-disabled={count(learn.code).phrases === 0}>
        <button class="primary big" disabled={count(learn.code).phrases === 0}>
          {newMin >= rot.minutesNew ? 'Ucz się dalej' : newMin > 0 ? 'Kontynuuj' : `Zacznij · ${rot.minutesNew} min`}
        </button>
      </a>
    </section>

    <section class="card stack">
      <div class="row head">
        <Seal glyph={rev.seal} on={revMin >= rot.minutesReview} size={40} title={rev.name} />
        <div class="grow">
          <p class="small muted label">Powtórka · język sprzed {rot.reviewOffsetDays} dni</p>
          <h3>{rev.name}</h3>
        </div>
        <span class="mono small">{Math.floor(revMin)}/{rot.minutesReview} min</span>
      </div>
      <div class="progress" aria-label="Postęp powtórki" role="progressbar" aria-valuenow={Math.floor(revMin)} aria-valuemax={rot.minutesReview}><div style="width: {pct(revMin, rot.minutesReview)}%"></div></div>
      {#if hasReview}
        <p class="small muted">{due > 0 ? `${due} ${due === 1 ? 'fraza czeka' : 'fraz czeka'} na powtórkę.` : 'Nic zaległego, powtórzysz najsłabsze frazy.'}</p>
        <a class="cta" href="#/sesja/powtorka/{rev.code}"><button>Powtórka · {rot.minutesReview} min</button></a>
      {:else}
        <p class="small muted">Nic jeszcze nie było ćwiczone w tym języku, więc nie ma czego powtarzać.</p>
      {/if}
    </section>

    <AsrStatus />
  </div>
{/if}

<style>
  .hero {
    margin: 0.4rem 0 1rem;
  }
  .hero h1 {
    font-size: 2rem;
    margin: 0;
  }
  .hero p {
    margin: 0;
  }
  .streak {
    color: var(--seal);
    font-weight: 600;
    margin-top: 0.2rem !important;
  }
  .week {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.25rem;
    padding: 0.7rem 0.4rem;
    margin-bottom: 1rem;
  }
  .day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    text-decoration: none;
    color: var(--label2);
    border-radius: 12px;
    padding: 0.35rem 0;
  }
  .day.today {
    background: var(--bg-el3);
    color: var(--label);
    font-weight: 600;
  }
  .head {
    flex-wrap: nowrap;
    gap: 0.8rem;
  }
  .grow {
    flex: 1;
    min-width: 0;
  }
  .grow h2,
  .grow h3 {
    margin: 0;
  }
  .label {
    margin: 0 0 0.1rem;
  }
  .main {
    box-shadow: var(--sh-l);
  }
  .cta {
    text-decoration: none;
    align-self: flex-start;
  }
  .cta[aria-disabled='true'] {
    pointer-events: none;
  }
  @media (max-width: 420px) {
    .day .small {
      font-size: 0.72rem;
    }
  }
</style>
