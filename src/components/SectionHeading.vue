<script setup lang="ts">
import SplitText from './SplitText.vue'

const props = defineProps<{ eyebrow: string; title: string; highlight?: string; text?: string; center?: boolean }>()
const titleWords = props.title.split(' ').filter(Boolean).length
</script>

<template>
  <header class="heading" :class="{ center }">
    <span class="eyebrow" v-reveal.left>{{ eyebrow }}</span>
    <h2 v-reveal.split="80">
      <SplitText :text="title" :stagger="70" />
      <template v-if="highlight">
        {{ ' ' }}<span class="serif hl"><SplitText :text="highlight" :stagger="70" :offset="titleWords" /></span>
      </template>
    </h2>
    <p v-if="text" v-reveal.blur="260">{{ text }}</p>
  </header>
</template>

<style scoped>
.heading {
  position: relative;
  max-width: 780px;
  margin-bottom: 56px;
  display: grid;
  gap: 18px;
}

.center {
  margin-inline: auto;
  text-align: center;
  justify-items: center;
}

h2 {
  font-size: clamp(2.3rem, 5.4vw, 4.2rem);
  font-weight: 800;
  letter-spacing: -0.045em;
}

.hl {
  font-weight: 400;
  color: var(--accent);
  letter-spacing: -0.02em;
}

p {
  color: var(--text-muted);
  font-size: 1.075rem;
  max-width: 620px;
}
</style>
