<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '../lib/app.svelte.ts';
  import { loadAsr, onAsrStatus, type AsrStatus } from '../lib/speech/asr.ts';

  let s = $state<AsrStatus>({ state: 'idle', progress: 0 });
  onMount(() => onAsrStatus((v) => (s = v)));
  const sizeMb = { tiny: 40, base: 80, small: 250 } as const;
</script>

<section class="card asr" aria-live="polite">
  <div class="row">
    <span class="dot" class:ready={s.state === 'ready'} class:err={s.state === 'error'} aria-hidden="true"></span>
    <div class="grow">
      <strong class="small">Sprawdzanie wymowy</strong>
      <p class="small muted">
        {#if s.state === 'ready'}
          Gotowe · działa na Twoim urządzeniu ({s.device === 'webgpu' ? 'karta graficzna' : 'procesor'}).
        {:else if s.state === 'loading'}
          Pobieranie modelu… {s.progress}%
        {:else if s.state === 'error'}
          {s.message}
        {:else}
          Model Whisper ok. {sizeMb[app.settings.modelSize]} MB, pobierany raz. Bez niego ćwiczenia działają, ale bez automatycznej oceny.
        {/if}
      </p>
    </div>
    {#if s.state === 'idle' || s.state === 'error'}
      <button onclick={() => loadAsr(app.settings.modelSize).catch(() => {})}>{s.state === 'error' ? 'Ponów' : 'Pobierz'}</button>
    {/if}
  </div>
  {#if s.state === 'loading'}<div class="progress" role="progressbar" aria-label="Pobieranie modelu" aria-valuenow={s.progress} aria-valuemax={100}><div style="width: {s.progress}%"></div></div>{/if}
</section>

<style>
  .asr {
    padding: 0.8rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .row {
    flex-wrap: nowrap;
  }
  .grow {
    flex: 1;
    min-width: 0;
  }
  .grow p {
    margin: 0.1rem 0 0;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    border: 1.5px solid var(--label3);
    flex: none;
  }
  .dot.ready {
    background: var(--gain);
    border-color: var(--gain);
  }
  .dot.err {
    background: var(--loss);
    border-color: var(--loss);
  }
</style>
