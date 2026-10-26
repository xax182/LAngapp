<script lang="ts">
  import { app } from '../lib/app.svelte.ts';
  const label = { dobre: 'ok', słabe: 'warn', brak: 'bad' } as const;
</script>

<h1>Granice oceny wymowy</h1>
<p>Aplikacja sprawdza wymowę na trzy sposoby. Żaden nie zastąpi native speakera.</p>
<ol>
  <li><strong>Rozpoznawanie mowy</strong> (Whisper, lokalnie): czy z Twojej wymowy da się odczytać właściwe zdanie. To zrozumiałość, nie akcent.</li>
  <li><strong>Wykres głosu</strong>: wysokość i rytm Twojego głosu obok wzoru. Pokazuje kształt, nie wystawia oceny (poza grą w tony).</li>
  <li><strong>Odsłuch A/B</strong>: wzór, potem Ty. Oceniasz sam.</li>
</ol>

<div class="stack">
  {#each app.index!.languages as l (l.code)}
    <section class="card stack">
      <div class="row"><strong>{l.name}</strong> <span class="badge {label[l.asr]}">rozpoznawanie: {l.asr}</span></div>
      <p class="small">{l.limits}</p>
    </section>
  {/each}
</div>

<h2 style="margin-top: 1.5rem">Treść</h2>
<p class="small">
  Frazy pochodzą z Tatoeba (CC BY 2.0 FR) i mają numer zdania. Oznaczenie <span class="badge warn">⚠ niezweryfikowane</span> znaczy, że nikt ich
  jeszcze nie sprawdził. Pinyin i IPA oznaczone „generowane” są tworzone automatycznie i mogą mieć błędy.
</p>
