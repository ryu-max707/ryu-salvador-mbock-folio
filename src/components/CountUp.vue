<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ to: number; duration?: number }>()
const current = ref(0)
const el = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
let frame = 0

function animate() {
  const duration = props.duration ?? 1600
  const start = performance.now()
  const tick = (now: number) => {
    const t = Math.min((now - start) / duration, 1)
    current.value = Math.round(props.to * (1 - Math.pow(1 - t, 3)))
    if (t < 1) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    current.value = props.to
    return
  }
  observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting) {
      animate()
      observer?.disconnect()
    }
  })
  if (el.value) observer.observe(el.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(frame)
})
</script>

<template>
  <span ref="el">{{ current }}</span>
</template>
