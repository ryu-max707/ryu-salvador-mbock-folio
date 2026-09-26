<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { techRows, type Tech } from '@/data/techs'
import { useTheme } from '@/composables/useTheme'

const { theme } = useTheme()
const [rowA = [], rowB = []] = techRows

const root = ref<HTMLElement | null>(null)
// Rangée 0 défile vers la gauche, rangée 1 vers la droite
const tracks: (HTMLElement | null)[] = []

// Luminance relative d'une couleur de marque (0 = noir, 1 = blanc)
function luminance(hex: string) {
  const weights = [0.2126, 0.7152, 0.0722]
  return weights.reduce((sum, w, i) => {
    const c = parseInt(hex.slice(i * 2, i * 2 + 2), 16) / 255
    return sum + w * (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  }, 0)
}

// Couleur de marque, éclaircie ou assombrie si elle manque de contraste avec le fond
function colorOf(tech: Tech) {
  const brand = `#${tech.hex}`
  const l = luminance(tech.hex)
  if (theme.value === 'dark') {
    if (l < 0.02) return 'var(--text)'
    if (l < 0.2) return `color-mix(in oklab, ${brand} 55%, white)`
  } else if (l > 0.45) {
    return `color-mix(in oklab, ${brand} 70%, black)`
  }
  return brand
}

let offset = 0
let velocity = 0
let direction = 1
let lastY = 0
let frame = 0
let running = false
let observer: IntersectionObserver | null = null

// Défilement continu, accéléré (et inversé) par la vitesse du scroll
function loop() {
  const y = window.scrollY
  const delta = y - lastY
  lastY = y
  if (delta !== 0) direction = delta > 0 ? 1 : -1
  velocity += (Math.abs(delta) * 0.25 - velocity) * 0.1
  offset += (0.6 + velocity) * direction

  tracks.forEach((track, i) => {
    if (!track) return
    const sign = i === 0 ? -1 : 1
    const half = track.scrollWidth / 2
    const x = (((offset * sign) % half) + half) % half
    track.style.transform = `translate3d(${-x}px, 0, 0)`
  })
  if (running) frame = requestAnimationFrame(loop)
}

onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !root.value) return
  lastY = window.scrollY
  observer = new IntersectionObserver(([entry]) => {
    running = !!entry?.isIntersecting
    cancelAnimationFrame(frame)
    if (running) frame = requestAnimationFrame(loop)
  })
  observer.observe(root.value)
})

onBeforeUnmount(() => {
  running = false
  cancelAnimationFrame(frame)
  observer?.disconnect()
})
</script>

<template>
  <section ref="root" class="marquee" aria-label="Technologies maîtrisées">
    <div v-for="(row, r) in [rowA, rowB]" :key="r" class="band">
      <div :ref="(el) => (tracks[r] = el as HTMLElement | null)" class="track">
        <!-- 4 copies pour une boucle sans couture ; seule la 1re est lue par les lecteurs d'écran -->
        <template v-for="n in 4" :key="n">
          <span
            v-for="tech in row"
            :key="`${n}-${tech.name}`"
            class="tech"
            :title="tech.name"
            :role="n === 1 ? 'img' : undefined"
            :aria-label="n === 1 ? tech.name : undefined"
            :aria-hidden="n > 1 || undefined"
            :style="{ color: colorOf(tech) }"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="tech.path" /></svg>
          </span>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Deux rangées de logos, sans fond, qui défilent en sens opposés */
.marquee {
  padding: 48px 0;
  overflow: hidden;
  display: grid;
  gap: 28px;
}

.band {
  overflow: hidden;
  /* Les logos apparaissent et disparaissent en fondu sur les bords */
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
}

.track {
  display: flex;
  align-items: center;
  width: max-content;
  will-change: transform;
}

.tech {
  display: inline-grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin-right: 72px;
  flex-shrink: 0;
  transition: scale 0.35s var(--ease-out), filter 0.35s;
}

.tech svg {
  width: 100%;
  height: 100%;
  fill: currentColor;
}

.tech:hover {
  scale: 1.18;
  filter: drop-shadow(0 0 14px currentColor);
}

@media (max-width: 600px) {
  .marquee {
    gap: 20px;
    padding: 36px 0;
  }
  .tech {
    width: 38px;
    height: 38px;
    margin-right: 48px;
  }
}
</style>
