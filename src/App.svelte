<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from './lib/app.svelte.ts';
  import Today from './components/Today.svelte';
  import Session from './components/Session.svelte';
  import LanguageView from './components/LanguageView.svelte';
  import Settings from './components/Settings.svelte';
  import Limits from './components/Limits.svelte';

  // Prosta nawigacja przez #adres, żeby działało na GitHub Pages bez serwera.
  let hash = $state(location.hash || '#/');
  onMount(() => {
    void app.init();
    const on = () => (hash = location.hash || '#/');
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  });

  const route = $derived(hash.replace(/^#\/?/, '').split('/'));
  const tabs = [
    { href: '#/', label: 'Dziś', match: '' },
    { href: '#/jezyki', label: 'Języki', match: 'jezyki' },
    { href: '#/ocena', label: 'Ocena', match: 'ocena' },
    { href: '#/ustawienia', label: 'Ustawienia', match: 'ustawienia' },
  ];
</script>

<header>
  <a class="logo" href="#/">Poliglota</a>
  <nav aria-label="Główne">
    {#each tabs as t (t.href)}
      <a href={t.href} aria-current={route[0] === t.match ? 'page' : undefined}>{t.label}</a>
    {/each}
  </nav>
</header>

<main>
  {#if app.error}
    <div class="card"><h2>Coś poszło nie tak</h2><p>{app.error}</p></div>
  {:else if !app.index}
    <p class="muted">Ładowanie…</p>
  {:else if route[0] === 'sesja' && route[1] && route[2]}
    {#key hash}
      <Session mode={route[1] === 'powtorka' ? 'review' : 'new'} lang={route[2]} />
    {/key}
  {:else if route[0] === 'jezyki'}
    <LanguageView code={route[1] ?? null} />
  {:else if route[0] === 'ustawienia'}
    <Settings />
  {:else if route[0] === 'ocena'}
    <Limits />
  {:else}
    <Today />
  {/if}
</main>

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 5;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    padding: 0.5rem 16px;
    display: flex;
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .logo {
    font-weight: 800;
    text-decoration: none;
    color: var(--text);
  }
  nav {
    display: flex;
    gap: 0.25rem;
    overflow-x: auto;
  }
  nav a {
    padding: 0.5rem 0.7rem;
    border-radius: 8px;
    text-decoration: none;
    color: var(--muted);
    white-space: nowrap;
  }
  nav a[aria-current='page'] {
    background: var(--surface-2);
    color: var(--text);
    font-weight: 600;
  }
  main {
    max-width: 760px;
    margin: 0 auto;
    padding: 1rem 16px 4rem;
  }
</style>
