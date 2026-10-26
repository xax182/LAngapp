<script lang="ts">
  import { toneTemplate } from '../lib/audio/pitch.ts';

  interface Series {
    label: string;
    color: 'ref' | 'me';
    values: (number | null)[];
  }
  let { series = [], tones = [], height = 140 }: { series?: Series[]; tones?: number[]; height?: number } = $props();

  let canvas: HTMLCanvasElement;
  let width = $state(600);

  $effect(() => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const g = canvas.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(canvas);
    const col = (name: string) => css.getPropertyValue(name).trim();
    g.clearRect(0, 0, width, height);

    const lo = -9;
    const hi = 9;
    const y = (st: number) => height - ((Math.max(lo, Math.min(hi, st)) - lo) / (hi - lo)) * height;

    g.strokeStyle = col('--border');
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, y(0));
    g.lineTo(width, y(0));
    g.stroke();

    // Wzór tonów: każda sylaba dostaje równy kawałek szerokości.
    if (tones.length) {
      const w = width / tones.length;
      g.setLineDash([6, 5]);
      g.strokeStyle = col('--ref-line');
      g.lineWidth = 3;
      tones.forEach((t, i) => {
        const pts = toneTemplate(t);
        g.beginPath();
        pts.forEach((v, j) => {
          const x = i * w + w * 0.1 + (j / (pts.length - 1)) * w * 0.8;
          if (j === 0) g.moveTo(x, y(v));
          else g.lineTo(x, y(v));
        });
        g.stroke();
      });
      g.setLineDash([]);
    }

    for (const s of series) {
      if (!s.values.length) continue;
      g.strokeStyle = col(s.color === 'ref' ? '--ref-line' : '--me-line');
      g.lineWidth = 3;
      g.beginPath();
      let pen = false;
      s.values.forEach((v, i) => {
        const x = (i / Math.max(1, s.values.length - 1)) * width;
        if (v === null) {
          pen = false;
          return;
        }
        if (!pen) g.moveTo(x, y(v));
        else g.lineTo(x, y(v));
        pen = true;
      });
      g.stroke();
    }
  });
</script>

<div class="chart" bind:clientWidth={width}>
  <canvas bind:this={canvas} style="width: 100%; height: {height}px" aria-label="Wykres wysokości głosu"></canvas>
  <div class="legend small muted">
    {#if tones.length}<span><i class="dash ref"></i> wzór tonów</span>{/if}
    {#each series as s (s.label)}<span><i class="line {s.color}"></i> {s.label}</span>{/each}
    <span>wyżej = wyższy głos</span>
  </div>
</div>

<style>
  .chart {
    background: var(--surface-2);
    border-radius: 10px;
    padding: 0.5rem;
  }
  canvas {
    display: block;
  }
  .legend {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: 0.25rem;
  }
  i {
    display: inline-block;
    width: 18px;
    height: 0;
    vertical-align: middle;
    border-top: 3px solid;
  }
  i.ref {
    border-color: var(--ref-line);
  }
  i.me {
    border-color: var(--me-line);
  }
  i.dash {
    border-top-style: dashed;
  }
</style>
