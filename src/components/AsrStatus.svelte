<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '../lib/app.svelte.ts';
  import { loadAsr, onAsrStatus, type AsrStatus } from '../lib/speech/asr.ts';

  let s = $state<AsrStatus>({ state: 'idle', progress: 0 });
  onMount(() => onAsrStatus((v) => (s = v)));
  const sizeMb = { tiny: 40, base: 80, small: 250 } as const;
</script>

<section class="card stack">
  <h3>Rozpoznawanie mowy (Whisper, na Twoim urządzeniu)</h3>
  {#if s.state === 'ready'}
    <p class="small"><span class="badge ok">gotowe</span> Działa lokalnie ({s.device === 'webgpu' ? 'karta graficzna' : 'procesor'}).</p>
  {:else if s.state === 'loading'}
    <p class="small">Pobieranie modelu… {s.progress}%</p>
    <div class="progress"><div style="width: {s.progress}%"></div></div>
  {:else if s.state === 'error'}
    <p class="small"><span class="badge bad">błąd</span> {s.message}</p>
    <button onclick={() => loadAsr(app.settings.modelSize).catch(() => {})}>Spróbuj ponownie</button>
  {:else}
    <p class="small muted">
      Model „{app.settings.modelSize}” to ok. {sizeMb[app.settings.modelSize]} MB, pobierany raz. Bez niego ćwiczenia działają, ale bez
      automatycznego sprawdzania.
    </p>
    <button onclick={() => loadAsr(app.settings.modelSize).catch(() => {})}>Pobierz model</button>
  {/if}
</section>
