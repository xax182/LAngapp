<script lang="ts">
  import { app } from '../lib/app.svelte.ts';
  import * as db from '../lib/db.ts';
  import { voiceFor } from '../lib/speech/tts.ts';
  import type { ModelSize } from '../lib/speech/asr.ts';

  const plan = $derived(app.plan());
  let todayLang = $state(app.plan()?.learn ?? 'fr');
  let message = $state<string | null>(null);

  async function changeToday() {
    await app.setTodayLanguage(todayLang);
    message = 'Zmieniono plan.';
  }
  async function save() {
    await app.saveSettings();
    message = 'Zapisano.';
  }
  async function exportFile() {
    const blob = new Blob([await db.exportProgress()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `poliglota-kopia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }
  async function importFile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      await db.importProgress(await f.text());
      location.reload();
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
  }
</script>

<h1>Ustawienia</h1>
<div class="stack">
  <section class="card stack">
    <h3>Plan</h3>
    <p class="small">Dziś: dzień {plan?.dayNumber}, nowy język: {app.language(plan?.learn ?? '')?.name}.</p>
    <label class="row">
      Dziś uczę się:
      <select bind:value={todayLang}>
        {#each app.index!.rotation.order as c (c)}<option value={c}>{app.language(c)?.name}</option>{/each}
      </select>
      <button onclick={changeToday}>Ustaw</button>
    </label>
    <p class="small muted">Reszta tygodnia przesunie się według stałej kolejności.</p>
  </section>

  <section class="card stack">
    <h3>Rozpoznawanie mowy</h3>
    <label class="row">
      Wielkość modelu:
      <select bind:value={app.settings.modelSize} onchange={save}>
        {#each [['tiny', 'mały (~40 MB, szybki, mniej dokładny)'], ['base', 'średni (~80 MB, zalecany)'], ['small', 'duży (~250 MB, dokładniejszy, wolny na telefonie)']] as [v, l] (v)}
          <option value={v as ModelSize}>{l}</option>
        {/each}
      </select>
    </label>
    <p class="small muted">Zmiana modelu działa po odświeżeniu strony.</p>
  </section>

  <section class="card stack">
    <h3>Głos wzorcowy (syntezator)</h3>
    <label class="row">
      Tempo: <input type="range" min="0.5" max="1.1" step="0.05" bind:value={app.settings.ttsRate} onchange={save} /> {app.settings.ttsRate}
    </label>
    <table class="small">
      <tbody>
        {#each app.index!.languages as l (l.code)}
          {@const v = voiceFor(l.bcp47)}
          <tr><td>{l.name}</td><td>{v ? v.name : '— brak głosu na tym urządzeniu'}</td></tr>
        {/each}
      </tbody>
    </table>
    <p class="small muted">Głosy pochodzą z systemu. W Brave przy ostrej ochronie przed śledzeniem lista głosów może być pusta.</p>
  </section>

  <section class="card stack">
    <h3>Kopia zapasowa</h3>
    <p class="small muted">Postępy są tylko w tej przeglądarce. Zrób kopię, żeby przenieść je na inne urządzenie.</p>
    <div class="row">
      <button onclick={exportFile}>Pobierz kopię</button>
      <label class="button-like">Wczytaj kopię <input type="file" accept="application/json" onchange={importFile} /></label>
    </div>
  </section>
  {#if message}<p class="notice">{message}</p>{/if}
</div>

<style>
  .button-like {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.6rem 1rem;
    cursor: pointer;
  }
  .button-like input {
    display: none;
  }
  td {
    padding: 0.2rem 0.5rem 0.2rem 0;
  }
</style>
