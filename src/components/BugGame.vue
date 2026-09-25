<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, shallowRef, triggerRef } from 'vue'
import SectionHeading from './SectionHeading.vue'

type Kind = 'bug' | 'critical' | 'feature'

interface Entity {
  id: number
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  dead: boolean
  dying: number
}

interface Pop {
  id: number
  x: number
  y: number
  text: string
  tone: 'good' | 'bad' | 'critical'
}

const DURATION = 30
const HUD_HEIGHT = 64
const RADIUS = 26
const BEST_KEY = 'ryu-bug-hunt-best'

const labels: Record<Kind, string> = { bug: 'Bug', critical: 'Bug critique', feature: 'Feature (ne pas toucher)' }

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function saveBest(value: number) {
  try {
    localStorage.setItem(BEST_KEY, String(value))
  } catch {
    /* stockage indisponible */
  }
}

const arena = ref<HTMLElement | null>(null)
const phase = ref<'idle' | 'countdown' | 'playing' | 'over'>('idle')
const countdown = ref(3)
const score = ref(0)
const streak = ref(0)
const timeLeft = ref(DURATION)
const best = ref(readBest())
const newBest = ref(false)
const shake = ref(false)
const stats = reactive({ hits: 0, clicks: 0, features: 0, escaped: 0 })
const entities = shallowRef<Entity[]>([])
const pops = ref<Pop[]>([])

const multiplier = computed(() => Math.min(1 + Math.floor(streak.value / 4), 4))
const accuracy = computed(() => (stats.clicks ? Math.round((stats.hits / stats.clicks) * 100) : 0))
const rank = computed(() => {
  const s = score.value
  if (s >= 70) return { title: '10x engineer', text: 'Tu débogues plus vite que ma CI. Respect.' }
  if (s >= 45) return { title: 'Lead dev', text: 'La prod dort tranquille grâce à toi.' }
  if (s >= 25) return { title: 'Dev senior', text: 'Solide. Quelques bugs ont quand même filé en prod…' }
  if (s >= 10) return { title: 'Dev junior prometteur', text: 'Bon début — une formation et ça part !' }
  return { title: 'Stagiaire en panique', text: 'Les bugs ont gagné cette manche. Revanche ?' }
})

let uid = 0
let frame = 0
let last = 0
let spawnTimer = 0
const timers: number[] = []

function later(fn: () => void, ms: number) {
  timers.push(window.setTimeout(fn, ms))
}

function size() {
  return { w: arena.value?.clientWidth ?? 600, h: arena.value?.clientHeight ?? 420 }
}

function spawn() {
  const { w, h } = size()
  const r = Math.random()
  const kind: Kind = r < 0.08 ? 'critical' : r < 0.27 ? 'feature' : 'bug'
  const elapsed = DURATION - timeLeft.value
  const speed =
    kind === 'critical' ? 240 : kind === 'feature' ? 45 + Math.random() * 25 : 70 + Math.random() * 60 + elapsed * 3.5
  const angle = Math.random() * Math.PI * 2
  entities.value.push({
    id: ++uid,
    kind,
    x: RADIUS + Math.random() * (w - RADIUS * 2),
    y: HUD_HEIGHT + RADIUS + Math.random() * (h - HUD_HEIGHT - RADIUS * 2),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    age: 0,
    life: kind === 'critical' ? 2.6 : kind === 'feature' ? 3.4 : 4.6,
    dead: false,
    dying: 0,
  })
}

function tick(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  timeLeft.value = Math.max(0, timeLeft.value - dt)

  const elapsed = DURATION - timeLeft.value
  spawnTimer -= dt
  if (spawnTimer <= 0 && entities.value.length < 14) {
    spawn()
    spawnTimer = Math.max(0.3, 0.85 - elapsed * 0.019)
  }

  const { w, h } = size()
  const alive: Entity[] = []
  for (const e of entities.value) {
    if (e.dead) {
      e.dying -= dt
      if (e.dying > 0) alive.push(e)
      continue
    }
    e.age += dt
    if (e.age > e.life) {
      if (e.kind !== 'feature') stats.escaped++
      continue
    }
    // Trajectoire un peu erratique, comme un vrai bug
    const turn = (Math.random() - 0.5) * 5 * dt
    const c = Math.cos(turn)
    const s = Math.sin(turn)
    ;[e.vx, e.vy] = [e.vx * c - e.vy * s, e.vx * s + e.vy * c]
    e.x += e.vx * dt
    e.y += e.vy * dt
    // Rebond sur les bords de l'arène
    if (e.x < RADIUS) {
      e.x = RADIUS
      e.vx = Math.abs(e.vx)
    } else if (e.x > w - RADIUS) {
      e.x = w - RADIUS
      e.vx = -Math.abs(e.vx)
    }
    if (e.y < HUD_HEIGHT + RADIUS) {
      e.y = HUD_HEIGHT + RADIUS
      e.vy = Math.abs(e.vy)
    } else if (e.y > h - RADIUS) {
      e.y = h - RADIUS
      e.vy = -Math.abs(e.vy)
    }
    alive.push(e)
  }
  entities.value = alive
  triggerRef(entities)

  if (timeLeft.value <= 0) end()
  else frame = requestAnimationFrame(tick)
}

function addPop(x: number, y: number, text: string, tone: Pop['tone']) {
  const id = ++uid
  pops.value.push({ id, x, y, text, tone })
  later(() => (pops.value = pops.value.filter((p) => p.id !== id)), 900)
}

function hit(e: Entity) {
  if (phase.value !== 'playing' || e.dead) return
  stats.clicks++
  e.dead = true
  e.dying = 0.45
  if (e.kind === 'feature') {
    score.value = Math.max(0, score.value - 3)
    streak.value = 0
    stats.features++
    addPop(e.x, e.y, '−3 feature cassée !', 'bad')
    shake.value = true
    later(() => (shake.value = false), 450)
  } else {
    stats.hits++
    streak.value++
    const points = (e.kind === 'critical' ? 5 : 1) * multiplier.value
    score.value += points
    addPop(e.x, e.y, e.kind === 'critical' ? `+${points} critique !` : `+${points}`, e.kind === 'critical' ? 'critical' : 'good')
  }
  triggerRef(entities)
}

// Un clic dans le vide casse le combo
function miss() {
  if (phase.value !== 'playing') return
  stats.clicks++
  streak.value = 0
}

function start() {
  cancelAnimationFrame(frame)
  score.value = 0
  streak.value = 0
  timeLeft.value = DURATION
  newBest.value = false
  Object.assign(stats, { hits: 0, clicks: 0, features: 0, escaped: 0 })
  entities.value = []
  pops.value = []
  countdown.value = 3
  phase.value = 'countdown'
  const step = () => {
    countdown.value--
    if (countdown.value > 0) return later(step, 600)
    phase.value = 'playing'
    last = performance.now()
    spawnTimer = 0
    frame = requestAnimationFrame(tick)
  }
  later(step, 600)
}

function end() {
  phase.value = 'over'
  entities.value = []
  if (score.value > best.value) {
    best.value = score.value
    newBest.value = true
    saveBest(score.value)
  }
}

const angleOf = (e: Entity) => (e.kind === 'feature' ? 0 : (Math.atan2(e.vy, e.vx) * 180) / Math.PI + 90)

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  timers.forEach(clearTimeout)
})
</script>

<template>
  <section id="jeu" class="section">
    <div class="container">
      <SectionHeading
        eyebrow="Pause café"
        title="La chasse aux"
        highlight="bugs."
        text="30 secondes pour écraser un maximum de bugs avant la mise en production. Enchaîne sans rater pour faire grimper le combo… et surtout, ne casse pas les features."
        center
      />

      <div
        ref="arena"
        class="arena"
        :class="{ shake, playing: phase === 'playing' }"
        v-reveal.scale
        @pointerdown="miss"
      >
        <pre class="code-bg" aria-hidden="true">
<span>01</span>  <i>// TODO : corriger avant la démo</i>
<span>02</span>  const deploy = async () =&gt; {
<span>03</span>    await tests.run()   <i>// 🤞</i>
<span>04</span>    if (bugs.length) throw new Error('pas aujourd’hui')
<span>05</span>    return prod.ship()
<span>06</span>  }
<span>07</span>
<span>08</span>  <i>// ça marche sur ma machine</i></pre>

        <div class="hud">
          <div class="hud-block">
            <small>Score</small>
            <strong class="score">{{ score }}</strong>
          </div>
          <span class="combo" :class="{ on: multiplier > 1 }">x{{ multiplier }} combo</span>
          <div class="timer">
            <small>{{ Math.ceil(timeLeft) }} s</small>
            <span class="bar"><span :style="{ transform: `scaleX(${timeLeft / DURATION})` }"></span></span>
          </div>
          <div class="hud-block right">
            <small>Record</small>
            <strong>{{ best }}</strong>
          </div>
        </div>

        <button
          v-for="e in entities"
          :key="e.id"
          type="button"
          class="entity"
          :class="[e.kind, { dead: e.dead, fading: !e.dead && e.age > e.life - 0.5 }]"
          :style="{ transform: `translate3d(${e.x}px, ${e.y}px, 0) rotate(${angleOf(e)}deg)` }"
          :aria-label="labels[e.kind]"
          @pointerdown.stop.prevent="hit(e)"
        >
          <span class="splat"></span>
          <span v-if="e.kind === 'feature'" class="chip">✓ feature</span>
          <svg v-else class="bug" viewBox="0 0 48 48" aria-hidden="true">
            <g class="legs" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none">
              <path d="M16 20 8 14M32 20l8-6M14 28H5M34 28h9M16 36l-8 6M32 36l8 6M20 10l-4-7M28 10l4-7" />
            </g>
            <ellipse cx="24" cy="29" rx="11" ry="14" fill="currentColor" />
            <circle cx="24" cy="13.5" r="6" fill="currentColor" />
            <path d="M24 17v25" stroke="#050e22" stroke-width="2" />
            <circle cx="19" cy="25" r="1.8" fill="#050e22" />
            <circle cx="29" cy="32" r="1.8" fill="#050e22" />
          </svg>
        </button>

        <span
          v-for="p in pops"
          :key="p.id"
          class="pop"
          :class="p.tone"
          :style="{ left: `${p.x}px`, top: `${p.y}px` }"
          aria-hidden="true"
          >{{ p.text }}</span
        >

        <Transition name="overlay">
          <div v-if="phase === 'idle'" class="overlay" @pointerdown.stop>
            <p class="kicker">🐛 Mini-jeu</p>
            <h3>Prêt à déboguer&nbsp;?</h3>
            <ul class="legend">
              <li><span class="swatch bug-swatch"></span> Bug <b>+1</b></li>
              <li><span class="swatch critical-swatch"></span> Bug critique <b>+5</b></li>
              <li><span class="swatch feature-swatch">✓</span> Feature <b class="neg">−3</b></li>
            </ul>
            <button type="button" class="btn btn-primary" @click="start">Lancer le debug ▶</button>
          </div>
        </Transition>

        <Transition name="overlay">
          <div v-if="phase === 'countdown'" class="overlay clear" aria-live="assertive">
            <span :key="countdown" class="count">{{ countdown }}</span>
          </div>
        </Transition>

        <Transition name="overlay">
          <div v-if="phase === 'over'" class="overlay" aria-live="polite" @pointerdown.stop>
            <p class="kicker">Déploiement terminé</p>
            <p class="final"><strong>{{ score }}</strong> pts</p>
            <p v-if="newBest" class="record">★ Nouveau record !</p>
            <h3>{{ rank.title }}</h3>
            <p class="rank-text">{{ rank.text }}</p>
            <ul class="recap">
              <li><b>{{ stats.hits }}</b> bugs écrasés</li>
              <li><b>{{ stats.escaped }}</b> partis en prod</li>
              <li><b>{{ stats.features }}</b> features cassées</li>
              <li><b>{{ accuracy }}%</b> précision</li>
            </ul>
            <div class="actions">
              <button type="button" class="btn btn-primary" @click="start">Rejouer ↻</button>
              <a href="#contact" class="btn btn-ghost">Besoin d'un vrai debug ?</a>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </section>
</template>

<style scoped>
.arena {
  position: relative;
  height: clamp(420px, 64vh, 560px);
  border-radius: 28px;
  overflow: hidden;
  background:
    radial-gradient(circle, rgba(198, 241, 53, 0.13) 1px, transparent 1.5px) 0 0 / 26px 26px,
    radial-gradient(120% 90% at 50% 120%, rgba(61, 107, 255, 0.35), transparent 60%),
    var(--navy-deep);
  border: 1.5px solid var(--border);
  color: #eef3e4;
  user-select: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.arena.playing {
  cursor: crosshair;
}

.arena.shake {
  animation: shake 0.45s;
}

@keyframes shake {
  20% { translate: -10px 0; }
  40% { translate: 8px 0; }
  60% { translate: -6px 0; }
  80% { translate: 4px 0; }
}

.code-bg {
  position: absolute;
  left: 24px;
  bottom: 20px;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.8;
  color: rgba(238, 243, 228, 0.14);
  pointer-events: none;
  white-space: pre;
}

.code-bg span {
  color: rgba(238, 243, 228, 0.08);
}

.code-bg i {
  font-style: normal;
  color: rgba(198, 241, 53, 0.22);
}

/* ---------- HUD ---------- */
.hud {
  position: absolute;
  inset: 0 0 auto;
  height: 64px;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 20px;
  border-bottom: 1px solid rgba(214, 228, 255, 0.1);
  background: rgba(5, 14, 34, 0.6);
  backdrop-filter: blur(8px);
  pointer-events: none;
}

.hud-block {
  display: grid;
  line-height: 1.1;
}

.hud-block.right {
  text-align: right;
}

.hud small {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(238, 243, 228, 0.55);
}

.hud strong {
  font-family: var(--font-display);
  font-size: 22px;
}

.score {
  color: var(--lime);
  min-width: 2ch;
}

.combo {
  padding: 4px 10px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  border: 1px solid rgba(214, 228, 255, 0.18);
  color: rgba(238, 243, 228, 0.5);
  transition: all 0.25s var(--ease-out);
}

.combo.on {
  background: var(--lime);
  border-color: var(--lime);
  color: var(--navy-deep);
  scale: 1.1;
}

.timer {
  flex: 1;
  display: grid;
  gap: 5px;
}

.bar {
  height: 4px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  background: var(--gradient);
  transform-origin: left;
}

/* ---------- Bugs & features ---------- */
.entity {
  position: absolute;
  top: 0;
  left: 0;
  width: 52px;
  height: 52px;
  margin: -26px 0 0 -26px;
  padding: 0;
  border: 0;
  background: none;
  display: grid;
  place-items: center;
  cursor: inherit;
  z-index: 2;
  animation: pop-in 0.3s var(--ease-out);
  transition: opacity 0.4s;
}

.entity.fading {
  opacity: 0.25;
}

@keyframes pop-in {
  from {
    scale: 0;
  }
}

.bug {
  width: 44px;
  height: 44px;
  color: var(--lime);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
}

.legs {
  animation: wiggle 0.12s infinite alternate;
  transform-origin: 24px 26px;
}

@keyframes wiggle {
  to {
    transform: scaleX(0.82);
  }
}

.critical .bug {
  color: #ffffff;
  filter: drop-shadow(0 0 8px var(--lime)) drop-shadow(0 0 18px var(--blue));
  animation: glow 0.6s ease-in-out infinite alternate;
}

@keyframes glow {
  to {
    scale: 1.15;
  }
}

.chip {
  padding: 6px 10px;
  border-radius: 10px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  background: var(--blue);
  color: #fff;
  box-shadow: 0 6px 16px -4px rgba(61, 107, 255, 0.7);
}

.dead {
  pointer-events: none;
  animation: none;
}

.dead .bug,
.dead .chip {
  animation: squash 0.4s var(--ease-out) forwards;
}

@keyframes squash {
  to {
    transform: scale(1.5, 0.15);
    opacity: 0;
  }
}

.splat {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--lime) 0 30%, transparent 32%),
    conic-gradient(from 0deg, var(--lime) 0 8%, transparent 8% 20%, var(--lime) 20% 26%, transparent 26% 45%, var(--lime) 45% 52%, transparent 52% 70%, var(--lime) 70% 78%, transparent 78%);
  opacity: 0;
  scale: 0.2;
}

.dead .splat {
  animation: splat 0.45s var(--ease-out) forwards;
}

.feature.dead .splat {
  background: radial-gradient(circle, #ff5a6a 0 30%, transparent 32%);
}

@keyframes splat {
  30% {
    opacity: 0.9;
  }
  to {
    opacity: 0;
    scale: 1.6;
  }
}

.pop {
  position: absolute;
  z-index: 4;
  translate: -50% -50%;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 22px;
  pointer-events: none;
  white-space: nowrap;
  animation: float-up 0.9s var(--ease-out) forwards;
}

.pop.good {
  color: var(--lime);
}

.pop.critical {
  color: #fff;
  font-size: 26px;
  text-shadow: 0 0 12px var(--lime);
}

.pop.bad {
  color: #ff7a86;
  font-size: 18px;
}

@keyframes float-up {
  to {
    translate: -50% -140%;
    opacity: 0;
  }
}

/* ---------- Écrans ---------- */
.overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 14px;
  padding: 24px;
  text-align: center;
  background: rgba(5, 14, 34, 0.78);
  backdrop-filter: blur(6px);
}

.overlay.clear {
  background: transparent;
  backdrop-filter: none;
  pointer-events: none;
}

.kicker {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--lime);
}

.overlay h3 {
  font-size: clamp(1.8rem, 4vw, 2.6rem);
}

.legend {
  list-style: none;
  margin: 4px 0 10px;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 22px;
  font-size: 14px;
  color: rgba(238, 243, 228, 0.8);
}

.legend li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend b {
  color: var(--lime);
}

.legend b.neg {
  color: #ff7a86;
}

.swatch {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 11px;
}

.bug-swatch {
  background: var(--lime);
}

.critical-swatch {
  background: #fff;
  box-shadow: 0 0 10px var(--lime);
}

.feature-swatch {
  border-radius: 6px;
  background: var(--blue);
  color: #fff;
}

.count {
  font-family: var(--font-display);
  font-size: clamp(6rem, 16vw, 10rem);
  font-weight: 800;
  color: var(--lime);
  animation: count 0.6s var(--ease-out);
}

@keyframes count {
  from {
    scale: 2;
    opacity: 0;
  }
}

.final {
  font-family: var(--font-display);
  font-size: 18px;
  color: rgba(238, 243, 228, 0.7);
}

.final strong {
  font-size: clamp(3.5rem, 9vw, 5.5rem);
  line-height: 1;
  color: var(--lime);
  letter-spacing: -0.04em;
}

.record {
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--lime);
  color: var(--navy-deep);
  font-weight: 700;
  font-size: 13px;
  animation: glow 0.6s ease-in-out infinite alternate;
}

.rank-text {
  color: rgba(238, 243, 228, 0.7);
  max-width: 360px;
}

.recap {
  list-style: none;
  margin: 4px 0 8px;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.recap li {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(214, 228, 255, 0.16);
  font-size: 13px;
  color: rgba(238, 243, 228, 0.75);
}

.recap b {
  color: #fff;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.overlay .btn-ghost {
  color: #eef3e4;
  border-color: rgba(214, 228, 255, 0.25);
}

.overlay .btn-primary:hover {
  box-shadow: 4px 4px 0 #eef3e4;
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.35s, backdrop-filter 0.35s;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .hud {
    gap: 10px;
    padding: 0 14px;
  }
  .combo {
    display: none;
  }
  .code-bg {
    font-size: 11px;
    left: 14px;
  }
}
</style>
