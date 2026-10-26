<script lang="ts">
  import { onDestroy } from 'svelte';
  import { startRecording, type ActiveRecording, type Recording } from '../lib/audio/recorder.ts';

  let {
    onrecorded,
    maxSec = 10,
    label = 'Nagraj',
    autoStart = false,
  }: { onrecorded: (r: Recording) => void; maxSec?: number; label?: string; autoStart?: boolean } = $props();

  let active = $state<ActiveRecording | null>(null);
  let level = $state(0);
  let elapsed = $state(0);
  let busy = $state(false);
  let error = $state<string | null>(null);
  let raf = 0;
  let t0 = 0;
  let autoStop: ReturnType<typeof setTimeout> | undefined;

  async function start() {
    error = null;
    try {
      active = await startRecording(maxSec + 1);
      t0 = performance.now();
      const tick = () => {
        if (!active) return;
        level = active.level();
        elapsed = (performance.now() - t0) / 1000;
        raf = requestAnimationFrame(tick);
      };
      tick();
      autoStop = setTimeout(stop, maxSec * 1000);
    } catch (e) {
      error =
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Brak zgody na mikrofon. Zezwól w ustawieniach przeglądarki (ikona kłódki przy adresie).'
          : e instanceof Error
            ? e.message
            : String(e);
      active = null;
    }
  }

  async function stop() {
    clearTimeout(autoStop);
    if (!active || busy) return;
    busy = true;
    cancelAnimationFrame(raf);
    const a = active;
    active = null;
    try {
      onrecorded(await a.stop());
    } catch (e) {
      error = `Nie udało się odczytać nagrania: ${e instanceof Error ? e.message : e}`;
    } finally {
      busy = false;
      level = 0;
    }
  }

  $effect(() => {
    if (autoStart) void start();
  });

  // Spacja = nagraj / zatrzymaj.
  $effect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.repeat || (e.target as HTMLElement).matches('input, select, textarea, button')) return;
      e.preventDefault();
      if (active) void stop();
      else if (!busy) void start();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  onDestroy(() => {
    cancelAnimationFrame(raf);
    clearTimeout(autoStop);
    void active?.stop().catch(() => {});
  });
</script>

<div class="rec">
  {#if active}
    <button class="mic on" onclick={stop} aria-label="Zatrzymaj nagrywanie" style="--lvl: {level}">
      <span class="ring" aria-hidden="true"></span>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" /></svg>
      <span>Stop · <span class="mono">{Math.max(0, maxSec - elapsed).toFixed(0)} s</span></span>
    </button>
  {:else}
    <button class="mic" onclick={start} disabled={busy}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.8" />
        <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
      <span>{busy ? 'Analizuję…' : label}</span>
    </button>
  {/if}
  {#if error}<p class="notice">{error}</p>{/if}
</div>

<style>
  .rec {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
  .mic {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 1rem;
    font-weight: 600;
    padding: 0.75rem 1.4rem 0.75rem 1.1rem;
    min-height: 52px;
    background: var(--seal);
    color: var(--on-seal);
    border-color: transparent;
    box-shadow: 0 4px 14px color-mix(in srgb, var(--seal) 35%, transparent);
  }
  .mic:hover:not(:disabled) {
    background: var(--seal);
    filter: brightness(1.05);
  }
  .mic.on {
    background: var(--bg-el);
    color: var(--seal);
    border: 1.5px solid var(--seal);
  }
  .ring {
    position: absolute;
    inset: -4px;
    border-radius: 999px;
    border: 2px solid var(--seal);
    opacity: calc(0.25 + var(--lvl) * 0.75);
    transform: scale(calc(1 + var(--lvl) * 0.08));
    transition: transform 0.08s linear, opacity 0.08s linear;
    pointer-events: none;
  }
</style>
