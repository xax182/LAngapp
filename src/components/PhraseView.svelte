<script lang="ts">
  import type { Language, Phrase } from '../lib/types.ts';

  let {
    phrase,
    language,
    showOriginal = true,
    compact = false,
  }: { phrase: Phrase; language: Language; showOriginal?: boolean; compact?: boolean } = $props();

  const gen = (f: string) => phrase.generated?.includes(f);
</script>

<div class="phrase" class:compact>
  <div class="meaning">
    {#if phrase.meaning.pl}<span>{phrase.meaning.pl}</span>{/if}
    {#if phrase.meaning.en}<span class="muted" lang="en">{phrase.meaning.pl ? ' · ' : ''}{phrase.meaning.en}</span>{/if}
  </div>
  {#if showOriginal}
    {#if phrase.original}
      <div class="original" dir={language.dir} lang={language.bcp47}>{phrase.original}</div>
    {/if}
    {#if phrase.romanization}
      <div class="roman">
        {phrase.romanization}
        {#if gen('romanization')}<span class="badge" title="Wygenerowane automatycznie, nie ze źródła">generowane</span>{/if}
      </div>
    {/if}
    {#if phrase.ipa}
      <div class="ipa muted">/{phrase.ipa.replace(/^\/|\/$/g, '')}/ {#if gen('ipa')}<span class="badge">generowane</span>{/if}</div>
    {/if}
  {/if}
  <div class="row meta">
    {#if phrase.status === 'zweryfikowane'}
      <span class="badge ok">zweryfikowane</span>
    {:else}
      <span class="badge warn" title="Nikt jeszcze nie sprawdził tej frazy">⚠ niezweryfikowane</span>
    {/if}
    {#if !compact}
      <span class="small muted">
        Źródło:
        {#if phrase.source_url}<a href={phrase.source_url} target="_blank" rel="noopener">{phrase.source}</a>{:else}{phrase.source}{/if}
      </span>
    {/if}
  </div>
  {#if !compact && phrase.notes}<p class="small muted">{phrase.notes}</p>{/if}
</div>

<style>
  .phrase {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .meaning {
    font-size: 1rem;
  }
  .original {
    font-size: 2rem;
    font-weight: 600;
    line-height: 1.3;
  }
  .compact .original {
    font-size: 1.3rem;
  }
  .roman {
    font-size: 1.25rem;
  }
  .compact .roman {
    font-size: 1rem;
  }
  .meta {
    gap: 0.4rem;
  }
</style>
