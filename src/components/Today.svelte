<script lang="ts">
  import { app } from '../lib/app.svelte.ts';
  import { localIsoDate } from '../lib/rotation.ts';
  import AsrStatus from './AsrStatus.svelte';

  const plan = $derived(app.plan());
  const rot = $derived(app.index!.rotation);
  const learn = $derived(plan ? app.language(plan.learn) : undefined);
  const rev = $derived(plan ? app.language(plan.review) : undefined);
  const newMin = $derived(plan ? app.secondsFor(plan.learn, 'new') / 60 : 0);
  const revMin = $derived(plan ? app.secondsFor(plan.review, 'review') / 60 : 0);

  const week = $derived.by(() => {
    const out = [];
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
      const p = app.plan(localIsoDate(day));
      if (p) out.push({ date: day, ...p });
    }
    return out;
  });
  const fmt = (d: Date) => d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric' });
  const count = (code: string) => app.index!.counts[code];
  const pct = (v: number, max: number) => Math.min(100, (v / max) * 100);
</script>

{#if plan && learn && rev}
  <h1>Dzień {plan.dayNumber} z {rot.order.length}</h1>
  <p class="muted">{new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

  <div class="stack">
    <section class="card stack">
      <div class="row" style="justify-content: space-between">
        <h2>Nowa nauka: {learn.name}</h2>
        <span class="badge">{Math.floor(newMin)} / {rot.minutesNew} min</span>
      </div>
      <div class="progress" aria-label="Postęp nauki"><div style="width: {pct(newMin, rot.minutesNew)}%"></div></div>
      {#if count(learn.code).phrases === 0}
        <p class="notice">Brak fraz dla tego języka. Zobacz <a href="#/jezyki/{learn.code}">luki w treści</a>.</p>
      {/if}
      <div class="row">
        <a href="#/sesja/nauka/{learn.code}"><button class="primary big" disabled={count(learn.code).phrases === 0}>Start: {rot.minutesNew} min</button></a>
      </div>
    </section>

    <section class="card stack">
      <div class="row" style="justify-content: space-between">
        <h2>Powtórka: {rev.name}</h2>
        <span class="badge">{Math.floor(revMin)} / {rot.minutesReview} min</span>
      </div>
      <p class="small muted">Język sprzed {rot.reviewOffsetDays} dni.</p>
      <div class="progress" aria-label="Postęp powtórki"><div style="width: {pct(revMin, rot.minutesReview)}%"></div></div>
      {#if !app.cards.some((c) => c.lang === rev.code)}
        <p class="small muted">Nic jeszcze nie było ćwiczone w tym języku, więc nie ma czego powtarzać.</p>
      {/if}
      <div class="row">
        <a href="#/sesja/powtorka/{rev.code}"><button class="big" disabled={!app.cards.some((c) => c.lang === rev.code)}>Start: {rot.minutesReview} min</button></a>
      </div>
    </section>

    <AsrStatus />

    <section class="card">
      <h3>Najbliższe 7 dni</h3>
      <table>
        <thead><tr><th>Dzień</th><th>Nowy</th><th>Powtórka</th></tr></thead>
        <tbody>
          {#each week as w (w.date.toISOString())}
            <tr><td>{fmt(w.date)}</td><td>{app.language(w.learn)?.name}</td><td>{app.language(w.review)?.name}</td></tr>
          {/each}
        </tbody>
      </table>
      <p class="small muted">Inny język dziś? Zmień w <a href="#/ustawienia">Ustawieniach</a>.</p>
    </section>
  </div>
{/if}

<style>
  a:has(> button) {
    text-decoration: none;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  th,
  td {
    text-align: left;
    padding: 0.35rem 0.25rem;
    border-bottom: 1px solid var(--border);
  }
  th {
    color: var(--muted);
    font-weight: 600;
  }
</style>
