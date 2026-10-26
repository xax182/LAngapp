<script lang="ts">
  // Stempel na zakończenie celu dnia (rzadko, tylko przy ważnym momencie) + kilka spadających liści.
  import { onMount } from 'svelte';
  import { chime, motionAllowed } from '../lib/look.svelte.ts';
  import Seal from './Seal.svelte';

  let { glyph, text, ondone }: { glyph: string; text: string; ondone?: () => void } = $props();
  let show = $state(true);

  onMount(() => {
    chime('stamp');
    const t = setTimeout(() => {
      show = false;
      ondone?.();
    }, motionAllowed() ? 2200 : 1200);
    return () => clearTimeout(t);
  });
</script>

{#if show}
  <div class="overlay" role="status">
    <div class="stamp"><Seal {glyph} on size={120} title={text} /></div>
    <p class="caption">{text}</p>
    {#each [0, 1, 2, 3, 4] as i (i)}
      <span class="leaf" style="--i: {i}" aria-hidden="true">
        <svg viewBox="0 0 20 28" width="18" height="26"><path d="M10 26C2 18 4 6 16 2c2 12-1 19-6 24z" fill="none" stroke="currentColor" stroke-width="1.4" /></svg>
      </span>
    {/each}
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 0.8rem;
    pointer-events: none;
    background: rgba(var(--glass-rgb), 0.55);
    -webkit-backdrop-filter: blur(6px);
    backdrop-filter: blur(6px);
  }
  .stamp {
    animation: kr-stamp 1.3s var(--ease) both;
  }
  .caption {
    font-weight: 600;
    margin: 0;
    padding: 0.4rem 1rem;
    border-radius: 999px;
    background: var(--mat-thick);
    border: 0.5px solid var(--sep);
    box-shadow: var(--sh-s);
    animation: fade 0.5s 0.5s both;
  }
  .leaf {
    position: absolute;
    top: 30%;
    left: calc(38% + var(--i) * 6%);
    color: var(--gain);
    opacity: 0;
    animation: kr-leaf 2s calc(0.35s + var(--i) * 0.12s) ease-in both;
  }
  @keyframes kr-stamp {
    0% {
      transform: scale(1.9) rotate(-14deg);
      opacity: 0;
    }
    45% {
      transform: scale(0.94) rotate(-3deg);
      opacity: 1;
    }
    60% {
      transform: scale(1.03) rotate(-4deg);
    }
    100% {
      transform: scale(1) rotate(-4deg);
      opacity: 1;
    }
  }
  @keyframes kr-leaf {
    0% {
      opacity: 0;
      transform: translate(0, 0) rotate(0);
    }
    15% {
      opacity: 0.9;
    }
    100% {
      opacity: 0;
      transform: translate(calc((var(--i) - 2) * 30px), 260px) rotate(160deg);
    }
  }
  @keyframes fade {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }
</style>
