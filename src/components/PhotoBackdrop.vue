<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { profile } from '@/data/profile'
import { introDone } from '@/composables/useIntro'

// Portrait en fond fixe : bien visible dans le hero, il s'efface au fil du scroll
// pour ne laisser qu'une présence discrète derrière le reste du site.
const root = ref<HTMLElement | null>(null)
let ticking = false

function update() {
  ticking = false
  const progress = Math.min(window.scrollY / (window.innerHeight * 0.9), 1)
  root.value?.style.setProperty('--p', progress.toFixed(3))
}

function onScroll() {
  if (!ticking) {
    ticking = true
    requestAnimationFrame(update)
  }
}

onMounted(() => {
  update()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <div v-if="profile.backdrop" ref="root" class="backdrop" :class="{ in: introDone }" aria-hidden="true">
    <div class="frame">
      <img :src="profile.backdrop" alt="" />
    </div>
    <div class="shade"></div>
    <p class="caption">
      <span>{{ profile.firstName }} {{ profile.middleName }} {{ profile.lastName }}</span>
      <span>{{ profile.location }}</span>
    </p>

    <!-- Bichromie : noir → marine, blanc → gris bleuté (sombre) ou papier (clair) -->
    <svg width="0" height="0" class="defs">
      <filter id="backdrop-dark" color-interpolation-filters="sRGB">
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0.012 0.2 0.7" />
          <feFuncG type="table" tableValues="0.035 0.26 0.76" />
          <feFuncB type="table" tableValues="0.09 0.42 0.86" />
        </feComponentTransfer>
      </filter>
      <filter id="backdrop-light" color-interpolation-filters="sRGB">
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0.04 0.95" />
          <feFuncG type="table" tableValues="0.12 0.957" />
          <feFuncB type="table" tableValues="0.27 0.918" />
        </feComponentTransfer>
      </filter>
    </svg>
  </div>
</template>

<style scoped>
.backdrop {
  --p: 0;
  --max: 0.95;
  --min: 0.1;
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

:root[data-theme='light'] .backdrop {
  --max: 0.85;
  --min: 0.12;
}

.defs {
  position: absolute;
}

/* Sur grand écran : portrait calé à droite, fondu vers le texte à gauche */
.frame {
  position: absolute;
  top: 0;
  /* Sur les écrans moyens, on pousse le portrait vers la droite pour dégager le texte */
  right: clamp(-140px, calc((100vw - 1400px) * 0.5), 0px);
  height: 100%;
  aspect-ratio: 3 / 4;
  opacity: calc(var(--max) - (var(--max) - var(--min)) * var(--p));
  transform: translateY(calc(var(--p) * -4%)) scale(calc(1 + var(--p) * 0.06));
  transform-origin: 70% 30%;
  filter: blur(calc(var(--p) * 5px));
  -webkit-mask-image:
    linear-gradient(to right, transparent 0%, #000 48%),
    linear-gradient(to bottom, #000 62%, transparent 100%);
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(to right, transparent 0%, #000 48%),
    linear-gradient(to bottom, #000 62%, transparent 100%);
  mask-composite: intersect;
}

.frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 30% 70%;
  filter: url(#backdrop-dark) contrast(1.08);
  opacity: 0;
  transform: scale(1.14);
  transition:
    opacity 1.8s var(--ease-out),
    transform 2.8s var(--ease-out);
}

:root[data-theme='light'] .frame img {
  filter: url(#backdrop-light) contrast(1.05);
}

/* Entrée : fondu + léger dézoom une fois l'intro terminée */
.in .frame img {
  opacity: 1;
  transform: none;
}

.shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to bottom, color-mix(in srgb, var(--bg) 55%, transparent) 0, transparent 18%),
    radial-gradient(ellipse 70% 90% at 78% 45%, transparent 40%, color-mix(in srgb, var(--bg) 45%, transparent) 100%);
}

.caption {
  position: absolute;
  right: 28px;
  bottom: 32px;
  display: grid;
  justify-items: end;
  gap: 2px;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-muted);
  opacity: calc(1 - var(--p) * 2.5);
  writing-mode: vertical-rl;
  rotate: 180deg;
}

.caption span:first-child {
  color: var(--accent);
}

/* Sur mobile et tablette en portrait : photo plein cadre, plus discrète derrière le texte */
@media (max-width: 759px), (max-aspect-ratio: 4/5) {
  .backdrop {
    --max: 0.42;
    --min: 0.08;
  }
  .frame {
    inset: 0;
    height: auto;
    aspect-ratio: auto;
    -webkit-mask-image: linear-gradient(to bottom, #000 45%, transparent 95%);
    mask-image: linear-gradient(to bottom, #000 45%, transparent 95%);
  }
  .frame img {
    object-position: 28% 30%;
  }
  .caption {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .frame img {
    opacity: 1;
    transform: none;
  }
}
</style>
