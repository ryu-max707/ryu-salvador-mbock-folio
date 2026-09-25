<script setup lang="ts">
import { computed } from 'vue'

/** Découpe un texte en mots ou en lettres pour les animer un par un (avec v-reveal.split sur un parent). */
const props = withDefaults(
  defineProps<{ text: string; by?: 'word' | 'char'; stagger?: number; offset?: number }>(),
  { by: 'word', stagger: 45, offset: 0 },
)

const words = computed(() => {
  let i = props.offset
  return props.text
    .split(' ')
    .filter(Boolean)
    .map((word) => (props.by === 'word' ? [{ c: word, i: i++ }] : [...word].map((c) => ({ c, i: i++ }))))
})
</script>

<template>
  <span class="split" :style="{ '--stagger': `${stagger}ms` }">
    <span class="sr-only">{{ text }}</span>
    <template v-for="(units, wi) in words" :key="wi">
      <span class="split-line" aria-hidden="true"
        ><span v-for="u in units" :key="u.i" class="split-unit" :style="{ '--i': u.i }">{{ u.c }}</span></span
      >{{ wi < words.length - 1 ? ' ' : '' }}
    </template>
  </span>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
