<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const progress = ref(0)
let ticking = false

function update() {
  ticking = false
  const max = document.documentElement.scrollHeight - window.innerHeight
  progress.value = max > 0 ? window.scrollY / max : 0
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
  <div class="progress" aria-hidden="true">
    <span :style="{ transform: `scaleX(${progress})` }"></span>
  </div>
</template>

<style scoped>
.progress {
  position: fixed;
  inset: 0 0 auto;
  height: 3px;
  z-index: 60;
  pointer-events: none;
}

span {
  display: block;
  height: 100%;
  background: var(--gradient);
  transform-origin: left;
}
</style>
