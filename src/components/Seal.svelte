<script lang="ts">
  // Pieczęć języka. Wypełniona = cel dnia osiągnięty; sam kontur = jeszcze nie.
  let { glyph, on = false, size = 40, title = '' }: { glyph: string; on?: boolean; size?: number; title?: string } = $props();
</script>

<span class="seal" class:on style="--s: {size}px" {title} role="img" aria-label="{title}{on ? ' – zaliczone' : ''}">
  <svg viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r="18" />
    <circle cx="20" cy="20" r="14.5" class="inner" />
  </svg>
  <span class="g">{glyph}</span>
  {#if on}<span class="tick" aria-hidden="true">✓</span>{/if}
</span>

<style>
  .seal {
    position: relative;
    display: inline-grid;
    place-items: center;
    width: var(--s);
    height: var(--s);
    color: var(--seal);
    flex: none;
  }
  svg {
    position: absolute;
    inset: 0;
  }
  circle {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
  }
  .inner {
    stroke-width: 0.8;
    opacity: 0.6;
  }
  .on circle:first-child {
    fill: currentColor;
  }
  .on .inner {
    stroke: var(--on-seal);
  }
  .g {
    position: relative;
    font-weight: 700;
    font-size: calc(var(--s) * 0.34);
    line-height: 1;
  }
  .on .g {
    color: var(--on-seal);
  }
  .tick {
    position: absolute;
    right: -2px;
    bottom: -2px;
    font-size: calc(var(--s) * 0.3);
    background: var(--bg-el);
    color: var(--gain);
    border-radius: 999px;
    width: calc(var(--s) * 0.42);
    height: calc(var(--s) * 0.42);
    display: grid;
    place-items: center;
    border: 0.5px solid var(--sep);
  }
</style>
