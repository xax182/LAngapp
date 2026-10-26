<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from './lib/app.svelte.ts';
  import { applyLook, look } from './lib/look.svelte.ts';
  import Backdrop from './components/Backdrop.svelte';
  import Today from './components/Today.svelte';
  import Session from './components/Session.svelte';
  import LanguageView from './components/LanguageView.svelte';
  import Settings from './components/Settings.svelte';
  import Limits from './components/Limits.svelte';

  // Prosta nawigacja przez #adres, żeby działało na GitHub Pages bez serwera.
  let hash = $state(location.hash || '#/');
  onMount(() => {
    void app.init();
    const on = () => {
      hash = location.hash || '#/';
      scrollTo({ top: 0 });
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  });

  // Każda zmiana wyglądu od razu trafia na stronę.
  $effect(() => {
    void [look.theme, look.accent, look.glass, look.fx, look.sounds];
    applyLook();
  });

  const route = $derived(hash.replace(/^#\/?/, '').split('/'));
  const tabs = [
    { href: '#/', label: 'Dziś', match: '' },
    { href: '#/jezyki', label: 'Języki', match: 'jezyki' },
    { href: '#/ocena', label: 'Ocena', match: 'ocena' },
    { href: '#/ustawienia', label: 'Ustawienia', match: 'ustawienia' },
  ];
  const inSession = $derived(route[0] === 'sesja');
</script>

<Backdrop />

<div class="shell">
  {#if !inSession}
    <header>
      <a class="logo" href="#/">
        <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
          <circle cx="16" cy="16" r="14" fill="none" stroke="var(--seal)" stroke-width="1.6" />
          <path d="M8 19c3-7 5-7 7 0s4 7 6 0 3-5 4-6" fill="none" stroke="var(--seal)" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        Poliglota
      </a>
      <nav aria-label="Główne">
        {#each tabs as t (t.href)}
          <a href={t.href} aria-current={route[0] === t.match ? 'page' : undefined}>{t.label}</a>
        {/each}
      </nav>
    </header>
  {/if}

  <main>
    {#if app.error}
      <div class="card"><h2>Coś poszło nie tak</h2><p>{app.error}</p></div>
    {:else if !app.index}
      <p class="muted">Ładowanie…</p>
    {:else if inSession && route[1] && route[2]}
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
</div>

<style>
  .shell {
    position: relative;
    z-index: 1;
  }
  header {
    position: sticky;
    top: 0;
    z-index: 5;
    padding: 0.6rem 16px;
    display: flex;
    gap: 0.75rem 1rem;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    background: var(--mat);
    -webkit-backdrop-filter: var(--blur);
    backdrop-filter: var(--blur);
    border-bottom: 0.5px solid var(--sep);
  }
  .logo {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    text-decoration: none;
    color: var(--label);
  }
  nav {
    display: flex;
    gap: 2px;
    padding: 3px;
    border-radius: 999px;
    background: var(--bg-el3);
    border: 0.5px solid var(--sep);
    overflow-x: auto;
    max-width: 100%;
  }
  nav a {
    padding: 0.4rem 0.85rem;
    border-radius: 999px;
    text-decoration: none;
    color: var(--label2);
    font-size: 0.88rem;
    font-weight: 500;
    white-space: nowrap;
    transition: background var(--t-fast) var(--ease);
  }
  nav a[aria-current='page'] {
    background: var(--bg-el);
    color: var(--label);
    font-weight: 600;
    box-shadow: var(--sh-s);
  }
  main {
    max-width: 760px;
    margin: 0 auto;
    padding: 1.4rem 16px 5rem;
  }
</style>
