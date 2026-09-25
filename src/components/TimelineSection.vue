<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import SectionHeading from './SectionHeading.vue'
import { profile, timeline } from '@/data/profile'
import { cvFileName, openCv } from '@/composables/useCv'

// La ligne du parcours se dessine au fil du scroll
const list = ref<HTMLElement | null>(null)
const progress = ref(0)
let ticking = false

function update() {
  ticking = false
  const r = list.value?.getBoundingClientRect()
  if (!r) return
  const start = window.innerHeight * 0.75
  progress.value = Math.min(Math.max((start - r.top) / r.height, 0), 1)
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
  <section id="parcours" class="section">
    <div class="container layout">
      <div class="side">
        <SectionHeading
          eyebrow="Parcours"
          title="Du code à la"
          highlight="transmission."
          text="Un parcours construit entre projets concrets et salles de formation — chaque expérience nourrit l'autre."
        />
        <div v-if="profile.cvUrl" class="cv-actions" v-reveal>
          <button type="button" class="btn btn-primary" @click="openCv">
            <AppIcon name="file" :size="18" /> Voir mon CV
          </button>
          <a :href="profile.cvUrl" :download="cvFileName" class="btn btn-ghost">
            <AppIcon name="download" :size="18" /> Télécharger
          </a>
        </div>
      </div>

      <ol ref="list" class="timeline" :style="{ '--progress': progress }">
        <li
          v-for="(item, i) in timeline"
          :key="item.period + item.title"
          :class="{ lit: progress > (i + 0.2) / timeline.length }"
          v-reveal.right="i * 100"
        >
          <span class="marker" :class="item.kind">
            <AppIcon :name="item.kind === 'dev' ? 'code' : 'teach'" :size="16" />
          </span>
          <div class="entry">
            <span class="period">{{ item.period }}</span>
            <h3>{{ item.title }}</h3>
            <p class="place">{{ item.place }}</p>
            <p class="text">{{ item.text }}</p>
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.layout {
  display: grid;
  gap: 16px;
}

@media (min-width: 960px) {
  .layout {
    grid-template-columns: 0.85fr 1.15fr;
    gap: 64px;
  }
  .side {
    position: sticky;
    top: 120px;
    align-self: start;
  }
}

.cv-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: -24px 0 32px;
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
  display: grid;
  gap: 24px;
}

.timeline::before,
.timeline::after {
  content: '';
  position: absolute;
  left: 19px;
  top: 8px;
  bottom: 8px;
  width: 2px;
}

.timeline::before {
  background: var(--border);
}

.timeline::after {
  background: linear-gradient(var(--lime), var(--blue));
  transform: scaleY(var(--progress, 0));
  transform-origin: top;
}

.timeline li {
  position: relative;
  padding-left: 64px;
}

.marker {
  position: absolute;
  left: 0;
  top: 22px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg);
  border: 2px solid var(--border);
  color: var(--text-muted);
  transition: background 0.5s, border-color 0.5s, color 0.5s, transform 0.5s var(--ease-out);
}

.lit .marker {
  background: var(--lime);
  border-color: var(--lime);
  color: var(--navy-deep);
  transform: scale(1.1);
}

.lit .marker.formation {
  background: var(--blue);
  border-color: var(--blue);
  color: #fff;
}

.entry {
  padding: 24px 26px;
  display: grid;
  gap: 6px;
  border-radius: 20px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  transition: border-color 0.3s, translate 0.4s var(--ease-out);
}

.entry:hover {
  border-color: color-mix(in srgb, var(--lime) 55%, transparent);
  translate: 6px 0;
}

.period {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
}

h3 {
  font-size: 1.4rem;
  letter-spacing: -0.03em;
}

.place {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 1.15rem;
  color: var(--text);
  opacity: 0.85;
}

.text {
  color: var(--text-muted);
}
</style>
