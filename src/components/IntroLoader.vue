<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { finishIntro } from '@/composables/useIntro'
import { profile } from '@/data/profile'

const progress = ref(0)
const leaving = ref(false)
const gone = ref(false)
const count = computed(() => String(Math.round(progress.value)).padStart(3, '0'))

let frame = 0
const timers: number[] = []

function whenLoaded() {
  const load = new Promise<void>((resolve) =>
    document.readyState === 'complete' ? resolve() : window.addEventListener('load', () => resolve(), { once: true }),
  )
  const fonts = document.fonts?.ready ?? Promise.resolve()
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 4000))
  return Promise.race([Promise.all([load, fonts]), timeout])
}

function leave() {
  leaving.value = true
  // Le dégradé recouvre l'écran à mi-course : on lance le site à ce moment-là
  timers.push(window.setTimeout(finishIntro, 650))
  timers.push(window.setTimeout(() => (gone.value = true), 1500))
}

onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finishIntro()
    gone.value = true
    return
  }

  let ready = false
  whenLoaded().then(() => (ready = true))

  const MIN_TIME = 1600
  const start = performance.now()
  const tick = (now: number) => {
    const t = Math.min((now - start) / MIN_TIME, 1)
    const target = ready ? 100 * t : 88 * (1 - Math.pow(1 - t, 3))
    progress.value += (target - progress.value) * 0.14
    if (ready && t === 1 && progress.value > 99.4) {
      progress.value = 100
      leave()
      return
    }
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  timers.forEach(clearTimeout)
})
</script>

<template>
  <div v-if="!gone" class="intro" :class="{ leaving }" aria-hidden="true">
    <div class="screen" :style="{ '--p': progress }">
      <div class="row top">
        <span>{{ profile.firstName }} {{ profile.middleName }} {{ profile.lastName }}</span>
        <span>Portfolio — ©{{ new Date().getFullYear() }}</span>
      </div>

      <div class="word" :data-text="profile.middleName.toUpperCase()">
        <span v-for="(letter, i) in profile.middleName.toUpperCase()" :key="i" :style="{ '--i': i }">{{ letter }}</span>
      </div>

      <div class="row bottom">
        <span class="count">{{ count }}<small>%</small></span>
        <span class="role">Développeur <em>&amp;</em> Formateur</span>
      </div>
      <div class="bar"><span></span></div>
    </div>
    <div class="sweep"></div>
  </div>
</template>

<style scoped>
.intro {
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: none;
}

.screen {
  position: absolute;
  inset: 0;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background:
    radial-gradient(120% 60% at 50% calc(130% - var(--p) * 1%), color-mix(in srgb, var(--lime) 35%, transparent), transparent 60%),
    var(--navy-deep);
  color: #eef3e4;
  overflow: hidden;
}

@media (min-width: 768px) {
  .screen {
    padding: 40px 48px;
  }
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(238, 243, 228, 0.65);
}

.word {
  position: relative;
  align-self: center;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(7rem, 34vw, 26rem);
  line-height: 0.8;
  letter-spacing: -0.06em;
  /* Sans crénage, le texte plein de ::after se cale exactement sur les lettres détourées */
  font-kerning: none;
  color: transparent;
  -webkit-text-stroke: 1.5px rgba(238, 243, 228, 0.22);
}

@media (max-width: 520px) {
  .top span:last-child {
    display: none;
  }
}

.word span {
  display: inline-block;
  animation: rise 1s var(--ease-out) both;
  animation-delay: calc(var(--i) * 90ms);
}

/* Le dégradé qui remplit les lettres au rythme du chargement */
.word::after {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, var(--lime) 0%, #7fe0b4 45%, var(--blue) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-stroke: 0;
  clip-path: inset(calc(100% - var(--p) * 1%) 0 0 0);
}

@keyframes rise {
  from {
    transform: translateY(40%) rotate(8deg);
    opacity: 0;
  }
}

.count {
  font-family: var(--font-display);
  font-size: clamp(3rem, 11vw, 7.5rem);
  font-weight: 700;
  line-height: 0.8;
  letter-spacing: -0.04em;
  color: #eef3e4;
}

.count small {
  font-size: 0.35em;
  color: var(--lime);
  margin-left: 4px;
}

.role {
  text-align: right;
}

.role em {
  font-family: var(--font-serif);
  font-size: 1.6em;
  color: var(--lime);
  text-transform: none;
}

.bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.08);
}

.bar span {
  display: block;
  height: 100%;
  width: calc(var(--p) * 1%);
  background: var(--gradient);
}

/* Sortie : un rideau dégradé balaie l'écran de bas en haut */
.sweep {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, var(--lime) 0%, #58d6a6 40%, var(--blue) 75%, var(--navy) 100%);
  clip-path: inset(100% 0 0 0);
}

.leaving .sweep {
  animation: sweep 1.5s var(--ease-in-out) forwards;
}

.leaving .screen {
  animation: hide 1.5s steps(1) forwards;
}

@keyframes sweep {
  0% {
    clip-path: inset(100% 0 0 0);
  }
  45% {
    clip-path: inset(0 0 0 0);
  }
  100% {
    clip-path: inset(0 0 100% 0);
  }
}

@keyframes hide {
  0%,
  44% {
    opacity: 1;
  }
  45%,
  100% {
    opacity: 0;
  }
}
</style>
