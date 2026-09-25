<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import SplitText from './SplitText.vue'
import { profile } from '@/data/profile'
import { introDone } from '@/composables/useIntro'
import { openCv } from '@/composables/useCv'

// Effet machine à écrire sur les mots de profile.rotating
const typed = ref('')
let timer = 0

function startTyping() {
  let word = 0
  let char = 0
  let deleting = false
  const step = () => {
    const current = profile.rotating[word] ?? ''
    char += deleting ? -1 : 1
    typed.value = current.slice(0, char)
    let delay = deleting ? 40 : 80
    if (!deleting && char === current.length) {
      deleting = true
      delay = 1800
    } else if (deleting && char === 0) {
      deleting = false
      word = (word + 1) % profile.rotating.length
      delay = 300
    }
    timer = window.setTimeout(step, delay)
  }
  step()
}

watch(
  introDone,
  (done) => {
    if (!done) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) typed.value = profile.rotating[0] ?? ''
    else timer = window.setTimeout(startTyping, 900)
  },
  { immediate: true },
)
onBeforeUnmount(() => clearTimeout(timer))

// Halo qui suit la souris dans le hero
const hero = ref<HTMLElement | null>(null)
function onHeroMove(e: PointerEvent) {
  const r = hero.value?.getBoundingClientRect()
  if (!r) return
  hero.value?.style.setProperty('--hx', `${e.clientX - r.left}px`)
  hero.value?.style.setProperty('--hy', `${e.clientY - r.top}px`)
}
</script>

<template>
  <!-- Le portrait de fond est rendu par PhotoBackdrop (fixe, derrière tout le site) -->
  <section id="top" ref="hero" class="hero" @pointermove="onHeroMove">
    <div class="hero-bg" aria-hidden="true">
      <div class="container cols"><i></i><i></i><i></i><i></i></div>
    </div>

    <div class="container">
      <div class="intro">
        <span v-if="profile.available" class="status" v-reveal>
          <span class="dot"></span>
          Disponible — missions &amp; formations
        </span>

        <p class="hello" v-reveal="80">
          Salut, moi c'est <strong>{{ profile.firstName }} {{ profile.middleName }} {{ profile.lastName }}</strong>
        </p>

        <h1>
          <span class="line" v-reveal.split="120">
            <SplitText :text="profile.headline[0] ?? ''" by="char" :stagger="32" />
          </span>
          <span class="line" v-reveal.split="420">
            <span class="amp serif">&amp;</span>
            <span class="serif accent"><SplitText :text="profile.headline[1] ?? ''" by="char" :stagger="32" :offset="1" /></span>
          </span>
        </h1>

        <p class="typed" v-reveal="600">
          <span class="prompt">~/ryu $</span> je construis
          <span class="word">{{ typed }}</span><span class="caret"></span>
        </p>

        <p class="pitch" v-reveal.blur="700">{{ profile.pitch }}</p>

        <div class="ctas" v-reveal="820">
          <a v-magnetic href="#projets" class="btn btn-primary">
            Voir mes réalisations <AppIcon name="arrow" :size="18" />
          </a>
          <button v-if="profile.cvUrl" v-magnetic type="button" class="btn btn-ghost" @click="openCv">
            <AppIcon name="file" :size="18" /> Mon CV
          </button>
          <a v-magnetic href="#jeu" class="btn btn-ghost">🎮 Petite pause ?</a>
        </div>
      </div>
    </div>

    <a href="#apropos" class="scroll-cue" aria-label="Défiler vers la suite">
      <span>Défiler</span><i></i>
    </a>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  padding: 128px 0 96px;
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    560px circle at var(--hx, 72%) var(--hy, 35%),
    color-mix(in srgb, var(--lime) 9%, transparent),
    transparent 65%
  );
  mask-image: linear-gradient(to bottom, #000 60%, transparent);
  pointer-events: none;
}

.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.cols {
  height: 100%;
  display: flex;
  justify-content: space-between;
}

.cols i {
  width: 1px;
  height: 100%;
  background: linear-gradient(transparent, var(--border) 20%, var(--border) 80%, transparent);
}

.intro {
  position: relative;
  display: grid;
  gap: 22px;
  justify-items: start;
  max-width: 720px;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px 7px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 55%, transparent);
  backdrop-filter: blur(8px);
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--lime);
  box-shadow: 0 0 0 0 var(--lime);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  70% {
    box-shadow: 0 0 0 10px transparent;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

.hello {
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.hello strong {
  color: var(--text);
  font-weight: 500;
}

h1 {
  font-size: clamp(3rem, 9.4vw, 7.6rem);
  font-weight: 800;
  line-height: 0.92;
  letter-spacing: -0.05em;
}

.line {
  display: block;
}

.amp {
  color: var(--text-muted);
  margin-right: 0.12em;
}

h1 .serif {
  font-weight: 400;
  letter-spacing: -0.02em;
}

.accent {
  color: var(--accent);
}

.typed {
  font-family: var(--font-mono);
  font-size: clamp(0.95rem, 2vw, 1.1rem);
  color: var(--text-muted);
  min-height: 1.6em;
}

.prompt {
  color: var(--accent);
}

.word {
  color: var(--text);
  background: color-mix(in srgb, var(--lime) 18%, transparent);
  padding: 0 4px;
}

.word:empty {
  padding: 0;
}

.caret {
  display: inline-block;
  width: 9px;
  height: 1.15em;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: var(--lime);
  animation: blink 1s steps(1) infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.pitch {
  max-width: 540px;
  font-size: 1.125rem;
  color: var(--text-muted);
}

.ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.ctas .btn-ghost {
  background: color-mix(in srgb, var(--bg) 45%, transparent);
  backdrop-filter: blur(8px);
}

.scroll-cue {
  position: absolute;
  left: 50%;
  bottom: 18px;
  translate: -50% 0;
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-muted);
}

@media (min-width: 960px) and (min-height: 700px) {
  .scroll-cue {
    display: flex;
  }
}

.scroll-cue i {
  width: 1px;
  height: 36px;
  background: var(--border);
  overflow: hidden;
  position: relative;
}

.scroll-cue i::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--lime);
  animation: drip 1.8s var(--ease-in-out) infinite;
}

@keyframes drip {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(100%);
  }
}
</style>
