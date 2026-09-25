<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Compétences reprises du CV
const words = ['Laravel', 'Vue.js', 'Flutter', 'Kotlin', 'React.js', 'Tailwind CSS', 'Livewire', 'Node.js', 'PostgreSQL', 'MySQL', 'Figma']
const words2 = ['Formation IT', 'Fintech', 'Web & mobile', 'Jetpack Compose', 'Ateliers pratiques', 'Projets concrets']

const root = ref<HTMLElement | null>(null)
const trackA = ref<HTMLElement | null>(null)
const trackB = ref<HTMLElement | null>(null)

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

  for (const [track, sign] of [
    [trackA.value, -1],
    [trackB.value, 1],
  ] as const) {
    if (!track) continue
    const half = track.scrollWidth / 2
    const x = (((offset * sign) % half) + half) % half
    track.style.transform = `translate3d(${-x}px, 0, 0)`
  }
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
  <section ref="root" class="marquee" aria-label="Technologies et savoir-faire">
    <div class="band back" aria-hidden="true">
      <div ref="trackB" class="track">
        <template v-for="n in 4" :key="n">
          <span v-for="w in words2" :key="`${n}-${w}`" class="item outline">{{ w }} <i>✳</i></span>
        </template>
      </div>
    </div>
    <div class="band front">
      <div ref="trackA" class="track">
        <template v-for="n in 4" :key="n">
          <span v-for="w in words" :key="`${n}-${w}`" class="item" :aria-hidden="n > 1">{{ w }} <i>✦</i></span>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.marquee {
  position: relative;
  padding: 72px 0;
  overflow: hidden;
}

.band {
  overflow: hidden;
  padding: 18px 0;
  width: 110%;
  margin-left: -5%;
}

.front {
  position: relative;
  z-index: 1;
  background: var(--lime);
  color: var(--navy-deep);
  transform: rotate(-2.5deg);
}

.back {
  position: absolute;
  top: 50%;
  left: 0;
  background: var(--blue);
  transform: translateY(-50%) rotate(3deg);
}

.track {
  display: flex;
  width: max-content;
  will-change: transform;
}

.item {
  display: inline-flex;
  align-items: center;
  gap: 28px;
  padding-right: 28px;
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 4vw, 2.8rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  white-space: nowrap;
  text-transform: uppercase;
}

.item i {
  font-style: normal;
  font-size: 0.7em;
}

.outline {
  color: transparent;
  -webkit-text-stroke: 1.2px #eef3e4;
}

.outline i {
  color: var(--lime);
  -webkit-text-stroke: 0;
}
</style>
