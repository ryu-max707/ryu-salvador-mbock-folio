<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import ImageViewer, { type ViewerItem } from './ImageViewer.vue'
import SectionHeading from './SectionHeading.vue'
import { projects, type Project, type ProjectCategory } from '@/data/profile'

const categories = computed<('Tous' | ProjectCategory)[]>(() => [
  'Tous',
  ...new Set(projects.map((p) => p.category)),
])
const filter = ref<'Tous' | ProjectCategory>('Tous')

const visible = computed(() =>
  filter.value === 'Tous' ? projects : projects.filter((p) => p.category === filter.value),
)
const count = computed(() => visible.value.length)
const current = ref(0)

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

const pad = (n: number) => String(n).padStart(2, '0')

/* ---------- Position circulaire de chaque slide ---------- */
function circular(d: number) {
  const n = count.value
  if (d > n / 2) d -= n
  if (d < -n / 2) d += n
  return d
}
const offsetOf = (i: number) => circular(i - current.value)

const go = (i: number) => (current.value = ((i % count.value) + count.value) % count.value)
const next = () => go(current.value + 1)
const prev = () => go(current.value - 1)

// Clic sur une slide latérale : elle passe au centre.
// Double-clic sur la slide active : le projet s'ouvre dans un nouvel onglet.
let activatedAt = -Infinity
function onSlideClick(e: MouseEvent, i: number, project: Project) {
  if (offsetOf(i) !== 0) {
    go(i)
    activatedAt = e.timeStamp
    return
  }
  const onControl = (e.target as HTMLElement).closest('a, button')
  // On ignore le 2e clic d'une slide qui vient juste d'être amenée au centre
  if (e.detail === 2 && project.link && !onControl && e.timeStamp - activatedAt > 500) {
    window.open(project.link, '_blank', 'noopener')
  }
}

watch(filter, () => (current.value = 0))

// Une slide qui passe d'un bord à l'autre se téléporte au lieu de traverser l'écran
const jumping = ref(new Set<number>())
watch(current, (now, before) => {
  const set = new Set<number>()
  for (let i = 0; i < count.value; i++) {
    if (Math.abs(circular(i - before) - circular(i - now)) > 1) set.add(i)
  }
  if (!set.size) return
  jumping.value = set
  requestAnimationFrame(() => requestAnimationFrame(() => (jumping.value = new Set())))
})

/* ---------- Glisser (souris et tactile) ---------- */
const stage = ref<HTMLElement | null>(null)
const dragging = ref(false)
const dragShift = ref(0)
let startX = 0
let pointerId = -1
let captured = false
let moved = false

function onDown(e: PointerEvent) {
  if (e.button !== 0) return
  pointerId = e.pointerId
  startX = e.clientX
  captured = false
  moved = false
}

function onMove(e: PointerEvent) {
  if (e.pointerId !== pointerId) return
  const dx = e.clientX - startX
  if (!captured && Math.abs(dx) > 8) {
    stage.value?.setPointerCapture(e.pointerId)
    captured = true
    dragging.value = true
  }
  if (!captured) return
  moved = true
  const width = stage.value?.querySelector<HTMLElement>('.slide')?.offsetWidth ?? 600
  dragShift.value = dx / (width * 0.8)
}

function onUp(e: PointerEvent) {
  if (e.pointerId !== pointerId) return
  pointerId = -1
  if (dragging.value) {
    if (dragShift.value < -0.12) next()
    else if (dragShift.value > 0.12) prev()
  }
  dragging.value = false
  dragShift.value = 0
}

// Après un glisser, on ignore le clic qui suit (pour ne pas ouvrir un lien par erreur)
function onClickCapture(e: MouseEvent) {
  if (moved) {
    e.preventDefault()
    e.stopPropagation()
    moved = false
  }
}

function slideStyle(i: number) {
  const d = offsetOf(i) + dragShift.value
  const abs = Math.min(Math.abs(d), 2.5)
  return {
    transform: `translateX(calc(var(--shift) * ${d})) scale(${1 - Math.min(abs, 2) * 0.13}) rotateY(${d * -10}deg)`,
    zIndex: String(10 - Math.round(abs)),
    opacity: String(abs >= 2 ? 0 : 1 - abs * 0.45),
  }
}

/* ---------- Visionneuse plein écran ---------- */
const viewerItems = computed<ViewerItem[]>(() =>
  visible.value.flatMap((p) =>
    p.image ? [{ src: p.image, title: p.name, caption: `${p.category} · ${p.year}`, link: p.link }] : [],
  ),
)
const viewerIndex = ref<number | null>(null)

function openViewer(project: Project) {
  const i = viewerItems.value.findIndex((item) => item.title === project.name)
  if (i !== -1) viewerIndex.value = i
}

// Le carrousel suit la visionneuse quand on navigue dedans
watch(viewerIndex, (i) => {
  const title = i === null ? undefined : viewerItems.value[i]?.title
  const slide = visible.value.findIndex((p) => p.name === title)
  if (slide !== -1) go(slide)
})

/* ---------- Défilement automatique ---------- */
const autoplay = ref(false)
const hovered = ref(false)
const focused = ref(false)
const inView = ref(false)
const pageVisible = ref(true)
const paused = computed(
  () =>
    hovered.value || focused.value || dragging.value || !inView.value || !pageVisible.value || viewerIndex.value !== null,
)

let observer: IntersectionObserver | null = null
const onVisibility = () => (pageVisible.value = !document.hidden)

onMounted(() => {
  autoplay.value = !matchMedia('(prefers-reduced-motion: reduce)').matches
  observer = new IntersectionObserver(([entry]) => (inView.value = !!entry?.isIntersecting), { threshold: 0.4 })
  if (stage.value) observer.observe(stage.value)
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <section id="projets" class="section projects">
    <div class="giant" aria-hidden="true" v-parallax:x="-0.35">Réalisations — Réalisations —</div>

    <div class="container">
      <SectionHeading
        eyebrow="Réalisations"
        title="Ce que j'ai"
        highlight="construit."
        text="Applications web, mobile et programmes de formation. Glisse, utilise les flèches ou ouvre un visuel en grand — la liste s'enrichit au fil des projets."
      />

      <div class="toolbar" v-reveal>
        <div class="filters" role="tablist" aria-label="Filtrer les réalisations">
          <button
            v-for="cat in categories"
            :key="cat"
            type="button"
            role="tab"
            :aria-selected="filter === cat"
            :class="{ active: filter === cat }"
            @click="filter = cat"
          >
            {{ cat }}
          </button>
        </div>

        <div class="nav">
          <span class="counter" aria-live="polite">
            <strong>{{ pad(current + 1) }}</strong> / {{ pad(count) }}
          </span>
          <button type="button" class="arrow" aria-label="Réalisation précédente" :disabled="count < 2" @click="prev">
            <AppIcon name="arrow" :size="20" class="flip" />
          </button>
          <button type="button" class="arrow" aria-label="Réalisation suivante" :disabled="count < 2" @click="next">
            <AppIcon name="arrow" :size="20" />
          </button>
        </div>
      </div>
    </div>

    <div
      ref="stage"
      class="stage"
      :class="{ dragging }"
      tabindex="0"
      role="region"
      aria-roledescription="carrousel"
      aria-label="Réalisations"
      data-cursor="Glisser"
      v-reveal.blur="100"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @click.capture="onClickCapture"
      @pointerenter="hovered = true"
      @pointerleave="hovered = false"
      @focusin="focused = true"
      @focusout="focused = false"
      @keydown.left.prevent="prev"
      @keydown.right.prevent="next"
    >
      <article
        v-for="(project, i) in visible"
        :key="project.name"
        class="slide"
        :class="{ active: offsetOf(i) === 0, jump: jumping.has(i), 'has-image': !!project.image }"
        :style="slideStyle(i)"
        role="group"
        aria-roledescription="diapositive"
        :aria-label="`${i + 1} sur ${count} : ${project.name}`"
        :aria-hidden="offsetOf(i) !== 0"
        :data-cursor="offsetOf(i) === 0 && project.link ? 'Double-clic' : undefined"
        @click="onSlideClick($event, i, project)"
      >
        <div class="cover" :data-variant="i % 3">
          <template v-if="project.image">
            <img
              :src="project.image"
              :alt="`Aperçu de ${project.name}`"
              :style="{ objectPosition: project.imagePosition }"
              draggable="false"
              loading="lazy"
            />
            <button
              type="button"
              class="zoom"
              :tabindex="offsetOf(i) === 0 ? 0 : -1"
              :aria-label="`Voir le visuel complet de ${project.name}`"
              @click.stop="offsetOf(i) === 0 ? openViewer(project) : go(i)"
            >
              <AppIcon name="expand" :size="16" /> Voir en grand
            </button>
          </template>
          <template v-else>
            <span class="num">{{ pad(i + 1) }}</span>
            <span class="initials">{{ initials(project.name) }}</span>
            <span class="vertical">{{ project.category }} · {{ project.year }}</span>
            <span class="noise"></span>
          </template>
          <span v-if="project.featured" class="flag">★ Projet phare</span>
        </div>

        <div class="body" :inert="offsetOf(i) !== 0">
          <div class="meta">
            <span class="category">{{ project.category }}</span>
            <span>{{ project.year }}</span>
          </div>
          <h3>{{ project.name }}</h3>
          <p class="role">{{ project.role }}</p>
          <p class="summary">{{ project.summary }}</p>
          <ul class="stack">
            <li v-for="tech in project.stack" :key="tech" class="tag">{{ tech }}</li>
          </ul>
          <div v-if="project.link || project.repo || project.image" class="links">
            <button v-if="project.image" type="button" class="link-btn" @click="openViewer(project)">
              Voir le visuel <AppIcon name="expand" :size="16" />
            </button>
            <a v-if="project.link" :href="project.link" target="_blank" rel="noopener">
              Voir le projet <AppIcon name="external" :size="16" />
            </a>
            <a v-if="project.repo" :href="project.repo" target="_blank" rel="noopener">
              Code source <AppIcon name="github" :size="16" />
            </a>
            <span v-if="project.link" class="dbl-hint">ou double-clic sur la carte</span>
          </div>
        </div>
      </article>
    </div>

    <div class="container">
      <div class="footer-row">
        <div class="dots" role="tablist" aria-label="Choisir une réalisation">
          <button
            v-for="(project, i) in visible"
            :key="project.name"
            type="button"
            role="tab"
            :aria-selected="i === current"
            :aria-label="`Aller à ${project.name}`"
            :class="{ active: i === current }"
            @click="go(i)"
          ></button>
        </div>
        <div v-if="autoplay && count > 1" class="progress" aria-hidden="true">
          <span
            :key="`${filter}-${current}`"
            class="fill"
            :style="{ animationPlayState: paused ? 'paused' : 'running' }"
            @animationend="next"
          ></span>
        </div>
      </div>
    </div>

    <ImageViewer v-model="viewerIndex" :items="viewerItems" />
  </section>
</template>

<style scoped>
.projects {
  overflow: hidden;
}

.giant {
  position: absolute;
  top: 56px;
  left: 0;
  white-space: nowrap;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(6rem, 18vw, 16rem);
  letter-spacing: -0.05em;
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 1px var(--border);
  pointer-events: none;
  user-select: none;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: -16px 0 48px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filters button {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.25s, color 0.25s, border-color 0.25s;
}

.filters button:hover {
  border-color: var(--text);
  color: var(--text);
}

.filters button.active {
  background: var(--lime);
  border-color: var(--lime);
  color: var(--on-lime);
}

.nav {
  display: flex;
  align-items: center;
  gap: 10px;
}

.counter {
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--text-muted);
  margin-right: 8px;
}

.counter strong {
  color: var(--text);
  font-size: 22px;
  font-weight: 500;
}

.arrow {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1.5px solid var(--text);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: background 0.25s, color 0.25s, transform 0.3s var(--ease-out);
}

.arrow:hover:not(:disabled) {
  background: var(--lime);
  border-color: var(--lime);
  color: var(--on-lime);
  transform: scale(1.08);
}

.arrow:disabled {
  opacity: 0.35;
  cursor: default;
}

.flip {
  transform: rotate(180deg);
}

/* ---------- Scène ---------- */
.stage {
  /* Taille du carrousel : ajuste ces deux valeurs pour l'agrandir ou le réduire */
  --slide-w: 800px;
  --slide-h: 380px;
  --shift: 86%;
  position: relative;
  display: grid;
  justify-items: center;
  perspective: 1800px;
  touch-action: pan-y;
  user-select: none;
  outline: none;
  padding: 8px 0;
}

@media (min-width: 900px) {
  .stage {
    --shift: 74%;
  }
}

.stage:focus-visible .slide.active {
  outline: 2px solid var(--lime);
  outline-offset: 6px;
}

.slide {
  grid-area: 1 / 1;
  width: min(86vw, var(--slide-w));
  display: grid;
  border-radius: 24px;
  overflow: hidden;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  transition:
    transform 0.9s var(--ease-out),
    opacity 0.7s var(--ease-out);
  cursor: pointer;
  will-change: transform;
}

.slide.active {
  cursor: grab;
}

.dragging .slide {
  transition: none;
  cursor: grabbing;
}

.slide.jump {
  transition: none;
  opacity: 0 !important;
}

@media (min-width: 900px) {
  .slide {
    grid-template-columns: 1.05fr 1fr;
    min-height: var(--slide-h);
  }
  /* Avec une vraie capture, l'aperçu prend plus de place */
  .slide.has-image {
    grid-template-columns: 1.35fr 1fr;
  }
}

.has-image .cover {
  aspect-ratio: 4 / 3;
  min-height: 0;
}

@media (min-width: 900px) {
  .has-image .cover {
    aspect-ratio: auto;
  }
}

.slide:not(.active) .body {
  opacity: 0.4;
}

/* ---------- Visuel généré ---------- */
.cover {
  position: relative;
  min-height: 240px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--navy);
  color: #eef3e4;
}

.cover img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 1s var(--ease-out);
}

.slide.active:hover .cover img {
  transform: scale(1.05);
}

.zoom {
  position: absolute;
  left: 16px;
  bottom: 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 0;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  background: color-mix(in srgb, var(--navy-deep) 82%, transparent);
  color: #eef3e4;
  backdrop-filter: blur(8px);
  cursor: pointer;
  opacity: 0;
  translate: 0 8px;
  transition: opacity 0.35s, translate 0.35s var(--ease-out), background 0.25s, color 0.25s;
}

.zoom :deep(svg) {
  color: var(--lime);
}

.slide.active .cover:hover .zoom,
.zoom:focus-visible {
  opacity: 1;
  translate: 0 0;
}

.zoom:hover {
  background: var(--lime);
  color: var(--navy-deep);
}

.zoom:hover :deep(svg) {
  color: var(--navy-deep);
}

/* Pas de survol au tactile : bouton toujours visible sur la slide active */
@media (hover: none) {
  .slide.active .zoom {
    opacity: 1;
    translate: 0 0;
  }
}

.cover[data-variant='0'] {
  background:
    radial-gradient(circle at 25% 75%, var(--lime), transparent 42%),
    radial-gradient(circle at 85% 15%, var(--blue), transparent 50%),
    var(--navy);
}

.cover[data-variant='1'] {
  background:
    radial-gradient(circle at 70% 60%, var(--blue) 0 22%, transparent 22.5%),
    repeating-linear-gradient(135deg, color-mix(in srgb, var(--lime) 55%, transparent) 0 2px, transparent 2px 16px),
    var(--navy-deep);
}

.cover[data-variant='2'] {
  background: conic-gradient(from 210deg at 65% 55%, var(--lime), var(--blue), var(--navy-deep), var(--lime));
}

.num {
  position: absolute;
  top: 20px;
  left: 24px;
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.1em;
}

.initials {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(4.5rem, 12vw, 8rem);
  letter-spacing: -0.06em;
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 2px #eef3e4;
  transition: transform 1s var(--ease-out);
}

.slide.active:hover .initials {
  transform: scale(1.06) rotate(-3deg);
}

.vertical {
  position: absolute;
  right: 18px;
  bottom: 20px;
  writing-mode: vertical-rl;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.flag {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: var(--lime);
  color: var(--navy-deep);
}

.cover .noise {
  position: absolute;
  inset: 0;
  background-image: var(--noise);
  background-size: 160px;
  opacity: 0.45;
  mix-blend-mode: overlay;
  pointer-events: none;
}

/* ---------- Texte ---------- */
.body {
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: opacity 0.5s;
}

@media (min-width: 900px) {
  .body {
    padding: 32px;
    justify-content: center;
  }
}

.meta {
  display: flex;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
}

.category {
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

h3 {
  font-size: clamp(1.4rem, 2.6vw, 1.9rem);
}

.role {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 1.05rem;
  color: var(--accent);
}

.summary {
  color: var(--text-muted);
  font-size: 0.94rem;
  line-height: 1.55;
}

.stack {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.stack .tag {
  padding: 3px 9px;
  font-size: 10.5px;
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
}

.links a,
.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 0 2px;
  border: 0;
  border-bottom: 1.5px solid var(--lime);
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.links a:hover,
.link-btn:hover {
  color: var(--accent);
}

.dbl-hint {
  align-self: center;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted);
}

/* Le double-clic n'a de sens qu'avec une souris */
@media (hover: none) {
  .dbl-hint {
    display: none;
  }
}

/* ---------- Pied du carrousel ---------- */
.footer-row {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 40px;
}

.dots {
  display: flex;
  gap: 8px;
}

.dots button {
  width: 10px;
  height: 10px;
  padding: 0;
  border-radius: 999px;
  border: 1.5px solid var(--text-muted);
  background: transparent;
  cursor: pointer;
  transition: width 0.4s var(--ease-out), background 0.3s, border-color 0.3s;
}

.dots button.active {
  width: 34px;
  background: var(--lime);
  border-color: var(--lime);
}

.progress {
  flex: 1;
  height: 2px;
  background: var(--border);
  overflow: hidden;
}

.fill {
  display: block;
  height: 100%;
  background: var(--gradient);
  transform-origin: left;
  animation: progress 6s linear forwards;
}

@keyframes progress {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
</style>
