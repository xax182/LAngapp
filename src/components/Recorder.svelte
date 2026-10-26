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

  onDestroy(() => {
    cancelAnimationFrame(raf);
    clearTimeout(autoStop);
    void active?.stop().catch(() => {});
  });
</script>

<div class="rec">
  {#if active}
    <button class="mic on" onclick={stop} aria-label="Zatrzymaj nagrywanie">■ Stop ({Math.max(0, maxSec - elapsed).toFixed(0)} s)</button>
    <div class="meter" aria-hidden="true"><div style="width: {level * 100}%"></div></div>
  {:else}
    <button class="mic primary" onclick={start} disabled={busy}>{busy ? 'Analizuję…' : `● ${label}`}</button>
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
    font-size: 1.1rem;
    padding: 0.8rem 1.4rem;
    border-radius: 999px;
  }
  .mic.on {
    background: var(--bad);
    color: #fff;
    border-color: var(--bad);
  }
  .meter {
    width: 200px;
    height: 8px;
    background: var(--surface-2);
    border-radius: 999px;
    overflow: hidden;
  }
  .meter > div {
    height: 100%;
    background: var(--ok);
  }
</style>
