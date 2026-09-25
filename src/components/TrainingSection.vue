<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import SectionHeading from './SectionHeading.vue'
import { trainings, type Training } from '@/data/profile'
import { whatsappLink } from '@/utils/contact'

const levelClass: Record<Training['level'], string> = {
  Débutant: 'lvl-1',
  Intermédiaire: 'lvl-2',
  Avancé: 'lvl-3',
}

const steps = [
  { n: '01', title: 'Diagnostic', text: 'On fait le point sur votre niveau et vos objectifs.' },
  { n: '02', title: 'Projet fil rouge', text: 'Chaque notion est appliquée sur une vraie application.' },
  { n: '03', title: 'Revue de code', text: 'Des retours précis pour progresser vite et bien.' },
  { n: '04', title: 'Autonomie', text: 'Vous repartez avec un projet déployé et un portfolio.' },
]
</script>

<template>
  <section id="formations" class="section">
    <div class="container">
      <SectionHeading
        eyebrow="Formations"
        title="Apprendre à coder,"
        highlight="en construisant."
        text="Des parcours pour particuliers, entreprises et centres de formation. Formats en présentiel, en ligne ou hybrides, adaptés à votre rythme."
        center
      />

      <ol class="method">
        <li v-for="(step, i) in steps" :key="step.n" v-reveal="i * 120">
          <span class="n">{{ step.n }}</span>
          <strong>{{ step.title }}</strong>
          <p>{{ step.text }}</p>
        </li>
      </ol>

      <div class="grid">
        <article
          v-for="(t, i) in trainings"
          :key="t.title"
          v-tilt="6"
          class="training"
          v-reveal.rotate="i * 120"
        >
          <span class="big-n" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="level" :class="levelClass[t.level]">{{ t.level }}</span>
          <h3>{{ t.title }}</h3>
          <div class="facts">
            <span><AppIcon name="clock" :size="16" /> {{ t.duration }}</span>
            <span><AppIcon name="pin" :size="16" /> {{ t.format }}</span>
          </div>
          <ul class="modules">
            <li v-for="m in t.modules" :key="m">
              <AppIcon name="check" :size="16" /> {{ m }}
            </li>
          </ul>
          <a
            class="btn btn-ghost"
            :href="whatsappLink(`Bonjour Salvador, je suis intéressé(e) par la formation « ${t.title} ».`)"
            target="_blank"
            rel="noopener"
          >
            Demander le programme <AppIcon name="arrow" :size="16" />
          </a>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.method {
  list-style: none;
  margin: 0 0 56px;
  padding: 0;
  display: grid;
  gap: 28px;
  counter-reset: step;
}

@media (min-width: 720px) {
  .method {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1100px) {
  .method {
    grid-template-columns: repeat(4, 1fr);
  }
}

.method li {
  position: relative;
  display: grid;
  gap: 6px;
  padding-top: 20px;
  border-top: 1.5px solid var(--border);
}

.method li::before {
  content: '';
  position: absolute;
  top: -1.5px;
  left: 0;
  width: 48px;
  height: 1.5px;
  background: var(--lime);
  transition: width 0.6s var(--ease-out);
}

.method li:hover::before {
  width: 100%;
}

.n {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 3rem;
  line-height: 1;
  letter-spacing: -0.04em;
  color: transparent;
  -webkit-text-stroke: 1.2px var(--text-muted);
  transition: color 0.4s, -webkit-text-stroke-color 0.4s;
}

.method li:hover .n {
  color: var(--accent);
  -webkit-text-stroke-color: var(--accent);
}

.method strong {
  font-size: 1.1rem;
}

.method p {
  font-size: 14px;
  color: var(--text-muted);
}

.grid {
  display: grid;
  gap: 20px;
}

@media (min-width: 900px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.training {
  position: relative;
  overflow: hidden;
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-radius: 24px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  transition: border-color 0.3s;
  transform-style: preserve-3d;
}

.training:hover {
  border-color: color-mix(in srgb, var(--lime) 55%, transparent);
}

/* Reflet qui suit la souris (variables posées par v-tilt) */
.training::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(420px circle at var(--gx, 50%) var(--gy, 0%), color-mix(in srgb, var(--lime) 14%, transparent), transparent 55%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.training:hover::after {
  opacity: 1;
}

.big-n {
  position: absolute;
  top: 10px;
  right: 18px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 5.5rem;
  line-height: 1;
  letter-spacing: -0.06em;
  color: transparent;
  -webkit-text-stroke: 1px var(--border);
  pointer-events: none;
}

.level {
  align-self: flex-start;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.lvl-1 {
  background: var(--lime);
  color: var(--navy-deep);
}

.lvl-2 {
  background: var(--blue);
  color: #fff;
}

.lvl-3 {
  border: 1.5px solid var(--text);
  color: var(--text);
}

h3 {
  font-size: 1.55rem;
  letter-spacing: -0.03em;
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 13px;
  color: var(--text-muted);
}

.facts span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.modules {
  list-style: none;
  margin: 0;
  padding: 16px 0 0;
  border-top: 1px dashed var(--border);
  display: grid;
  gap: 10px;
  flex: 1;
}

.modules li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
}

.modules li :deep(svg) {
  color: var(--accent);
  flex-shrink: 0;
}

.btn {
  margin-top: 8px;
}
</style>
