<script lang="ts">
  // Tło: ciepły blask, papierowy gradient i rysunek liniowy (chmury, gałąź z liśćmi, huśtawka).
  // Tylko kontury, bez wypełnień. pointer-events: none – nigdy nie przeszkadza w klikaniu.
</script>

<div class="bg" aria-hidden="true">
  <div class="wash"></div>
  <svg class="art" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
    <g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <!-- chmury -->
      <g class="cloud c1">
        <path d="M120 150c8-22 40-26 52-8 10-18 44-16 50 6 22 0 30 22 14 32H112c-18-4-14-28 8-30z" />
        <path d="M150 168h60" opacity=".6" />
      </g>
      <g class="cloud c2">
        <path d="M820 110c10-26 50-30 64-8 12-20 52-16 58 10 26 2 34 26 14 38H808c-22-6-16-34 12-40z" />
        <path d="M856 132h80" opacity=".6" />
      </g>
      <!-- gałąź -->
      <path d="M1210 230c-90 6-170 26-250 70-50 28-96 44-150 50" />
      <path d="M980 284c-10-26 2-48 26-60" />
      <!-- liście na gałęzi -->
      <path d="M900 318c-18-18-12-40 10-46 6 22-2 38-10 46z" />
      <path d="M1040 252c4-24 26-34 46-22-14 18-30 24-46 22z" />
      <path d="M860 336c-24-4-34-24-24-44 18 12 24 28 24 44z" />
      <!-- huśtawka -->
      <g class="swing">
        <path d="M940 296v230M1010 262v252" />
        <path d="M922 528h108" />
        <path d="M926 536h100" opacity=".55" />
      </g>
      <!-- trawa / horyzont -->
      <path d="M0 720c160-18 320-22 480-12s320 18 480 4 200-10 240-8" opacity=".55" />
      <path d="M90 720c4-14 10-22 18-26M110 718c0-12 4-20 10-24M640 716c4-12 10-20 18-22" opacity=".55" />
    </g>
    <!-- spadające liście -->
    <g class="leaves" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
      <path class="leaf l1" d="M0 0c-10-10-6-22 6-26 3 12-1 21-6 26z" />
      <path class="leaf l2" d="M0 0c-10-10-6-22 6-26 3 12-1 21-6 26z" />
      <path class="leaf l3" d="M0 0c-10-10-6-22 6-26 3 12-1 21-6 26z" />
    </g>
  </svg>
</div>

<style>
  .bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }
  .wash {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(1100px 700px at 100% -10%, var(--sun), transparent 60%),
      linear-gradient(180deg, var(--bg) 0%, var(--bg-el3) 100%);
  }
  .art {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    color: var(--art);
    opacity: 0.3;
  }
  :global(:root[data-theme='noc']) .art {
    opacity: 0.15;
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme='krem'])) .art {
      opacity: 0.15;
    }
  }
  .swing {
    transform-origin: 975px 270px;
    animation: swing 7s ease-in-out infinite;
  }
  .cloud {
    animation: drift 40s ease-in-out infinite alternate;
  }
  .c2 {
    animation-duration: 55s;
    animation-direction: alternate-reverse;
  }
  .leaf {
    opacity: 0;
    animation: fall 9s linear infinite;
  }
  .l1 {
    --x: 900px;
    animation-delay: 0s;
  }
  .l2 {
    --x: 1010px;
    animation-delay: 3s;
  }
  .l3 {
    --x: 860px;
    animation-delay: 6s;
  }
  @keyframes swing {
    0%,
    100% {
      transform: rotate(-4deg);
    }
    50% {
      transform: rotate(4deg);
    }
  }
  @keyframes drift {
    to {
      transform: translateX(40px);
    }
  }
  @keyframes fall {
    0% {
      opacity: 0;
      transform: translate(var(--x), 300px) rotate(0);
    }
    10% {
      opacity: 1;
    }
    85% {
      opacity: 0.8;
    }
    100% {
      opacity: 0;
      transform: translate(calc(var(--x) - 120px), 760px) rotate(220deg);
    }
  }
  @media (max-width: 640px) {
    .art {
      opacity: 0.22;
    }
  }
</style>
