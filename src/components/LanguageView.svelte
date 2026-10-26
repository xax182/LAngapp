<script lang="ts">
  import { app } from '../lib/app.svelte.ts';
  import type { LanguagePack, Phrase } from '../lib/types.ts';
  import type { Recording } from '../lib/audio/recorder.ts';
  import { deleteOwnReference, playReference, saveOwnReference } from '../lib/reference.ts';
  import * as db from '../lib/db.ts';
  import PhraseView from './PhraseView.svelte';
  import Recorder from './Recorder.svelte';

  let { code }: { code: string | null } = $props();

  let pack = $state<LanguagePack | null>(null);
  let ownRefs = $state<Set<string>>(new Set());
  let recordingFor = $state<string | null>(null);

  $effect(() => {
    pack = null;
    if (!code) return;
    void app.pack(code).then(async (p) => {
      pack = p;
      const keys = (await db.entries<Blob>('recordings')).map(([k]) => k);
      ownRefs = new Set(keys.filter((k) => k.startsWith('ref:')).map((k) => k.slice(4)));
    });
  });

  async function saveRef(p: Phrase, r: Recording) {
    await saveOwnReference(p.id, r.blob);
    ownRefs = new Set([...ownRefs, p.id]);
    recordingFor = null;
  }
  async function removeRef(p: Phrase) {
    await deleteOwnReference(p.id);
    ownRefs = new Set([...ownRefs].filter((x) => x !== p.id));
  }
  const counts = $derived(app.index!.counts);
  const learned = (pid: string) => !!app.card(pid);
</script>

{#if !code}
  <h1>Języki</h1>
  <div class="stack">
    {#each app.index!.languages as l (l.code)}
      <a class="card lang" href="#/jezyki/{l.code}">
        <strong>{l.name}</strong>
        <span class="small muted">
          {counts[l.code].phrases} fraz · {counts[l.code].verified} zweryfikowanych · luki: {counts[l.code].gaps}
        </span>
      </a>
    {/each}
  </div>
{:else if pack}
  <a href="#/jezyki">← Języki</a>
  <h1>{pack.language.name}</h1>
  {#if pack.language.variety}<p class="small muted">{pack.language.variety}</p>{/if}
  <p class="small">
    Fraz: {pack.phrases.length}, zweryfikowanych: {pack.phrases.filter((p) => p.status === 'zweryfikowane').length}, luk: {pack.gaps.length}.
    Ćwiczone: {pack.phrases.filter((p) => learned(p.id)).length}.
  </p>

  {#each pack.lessons as lesson (lesson.id)}
    {@const phrases = pack.phrases.filter((p) => p.lesson === lesson.id)}
    {@const gaps = pack.gaps.filter((g) => g.lesson === lesson.id)}
    <section class="lesson">
      <h2>Lekcja {lesson.id}: {lesson.title}</h2>
      <div class="stack">
        {#each phrases as p (p.id)}
          <div class="card stack">
            <PhraseView phrase={p} language={pack.language} />
            <div class="row">
              <button onclick={() => playReference(p, pack!.language, app.settings.ttsRate)}>▶ Wzór</button>
              {#if ownRefs.has(p.id)}
                <span class="badge ok">masz własny wzór</span>
                <button class="small" onclick={() => removeRef(p)}>Usuń mój wzór</button>
              {:else if recordingFor === p.id}
                <Recorder label="Nagraj wzór" onrecorded={(r) => saveRef(p, r)} />
              {:else}
                <button class="small" onclick={() => (recordingFor = p.id)}>Nagraj wzór (np. native speaker)</button>
              {/if}
              {#if learned(p.id)}<span class="badge">ćwiczona</span>{/if}
            </div>
          </div>
        {/each}
        {#if gaps.length}
          <div class="gaps small">
            <strong>Luki ({gaps.length}):</strong>
            {#each gaps as g (g.key)}<span class="badge warn">„{g.hint}”</span>{/each}
            <p class="muted">Brak zdania ze sprawdzonego źródła. Dodaj je w pliku <code>content/{pack.language.code}/phrases.yaml</code>.</p>
          </div>
        {/if}
      </div>
    </section>
  {/each}
{:else}
  <p class="muted">Ładowanie…</p>
{/if}

<style>
  .lang {
    display: flex;
    flex-direction: column;
    text-decoration: none;
    color: inherit;
  }
  .lesson {
    margin-top: 1.5rem;
  }
  .gaps {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
  }
  .gaps p {
    width: 100%;
    margin: 0.25rem 0 0;
  }
</style>
