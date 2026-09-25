<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import SectionHeading from './SectionHeading.vue'
import { expertises } from '@/data/profile'
</script>

<template>
  <section id="expertise" class="section">
    <div class="container">
      <SectionHeading
        eyebrow="Expertise"
        title="Deux métiers, une même exigence :"
        highlight="du code qui a du sens."
        text="Je développe des produits concrets et j'enseigne à partir de cette pratique réelle. Chaque formation est nourrie du terrain, chaque projet bénéficie d'une approche pédagogique claire."
      />

      <ol class="rows">
        <li v-for="(item, i) in expertises" :key="item.title" class="row" v-reveal.left="i * 110">
          <span class="n">{{ String(i + 1).padStart(2, '0') }}</span>
          <h3>
            <span class="icon"><AppIcon :name="item.icon" :size="22" /></span>
            {{ item.title }}
          </h3>
          <p>{{ item.text }}</p>
          <ul class="tags">
            <li v-for="tag in item.tags" :key="tag" class="tag">{{ tag }}</li>
          </ul>
          <span class="go" aria-hidden="true"><AppIcon name="arrow" :size="22" /></span>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--border);
}

.row {
  position: relative;
  display: grid;
  gap: 14px;
  padding: 30px 8px;
  border-bottom: 1px solid var(--border);
  isolation: isolate;
  transition: color 0.4s, padding 0.5s var(--ease-out);
}

@media (min-width: 900px) {
  .row {
    grid-template-columns: 56px 1.1fr 1.3fr 40px;
    align-items: center;
    gap: 14px 32px;
    padding: 36px 16px;
  }
  .tags {
    grid-column: 3;
  }
  .go {
    grid-column: 4;
    grid-row: 1;
  }
}

/* Remplissage citron qui monte au survol */
.row::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--lime);
  transform: scaleY(0);
  transform-origin: bottom;
  transition: transform 0.55s var(--ease-out);
}

.row:hover {
  color: var(--navy-deep);
}

.row:hover::before {
  transform: scaleY(1);
}

@media (min-width: 900px) {
  .row:hover {
    padding-inline: 32px;
  }
}

.n {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-muted);
  transition: color 0.4s;
}

h3 {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: clamp(1.5rem, 2.8vw, 2.1rem);
  letter-spacing: -0.035em;
}

.icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  border: 1.5px solid currentColor;
  color: var(--accent);
  transition: color 0.4s, transform 0.5s var(--ease-out);
}

p {
  color: var(--text-muted);
  transition: color 0.4s;
}

.tags {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.go {
  display: none;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  transition: transform 0.5s var(--ease-out);
}

@media (min-width: 900px) {
  .go {
    display: grid;
  }
}

.row:hover .n,
.row:hover p,
.row:hover .icon,
.row:hover .tag {
  color: var(--navy-deep);
}

.row:hover .tag {
  border-color: color-mix(in srgb, var(--navy-deep) 30%, transparent);
}

.row:hover .icon {
  transform: rotate(-8deg) scale(1.08);
}

.row:hover .go {
  transform: rotate(-45deg);
}
</style>
