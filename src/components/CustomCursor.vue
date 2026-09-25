<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Curseur « anneau » qui suit la souris avec inertie et affiche un libellé
// sur les éléments marqués data-cursor="…". Désactivé au tactile.
const enabled = ref(false)
const hover = ref(false)
const pressed = ref(false)
const visible = ref(false)
const label = ref('')
const ring = ref<HTMLElement | null>(null)
const dot = ref<HTMLElement | null>(null)

let x = -100
let y = -100
let rx = -100
let ry = -100
let frame = 0

function loop() {
  rx += (x - rx) * 0.18
  ry += (y - ry) * 0.18
  if (ring.value) ring.value.style.transform = `translate3d(${rx}px, ${ry}px, 0)`
  if (dot.value) dot.value.style.transform = `translate3d(${x}px, ${y}px, 0)`
  frame = requestAnimationFrame(loop)
}

function onMove(e: PointerEvent) {
  x = e.clientX
  y = e.clientY
  visible.value = true
}

function onOver(e: PointerEvent) {
  const target = e.target as HTMLElement | null
  const labelled = target?.closest<HTMLElement>('[data-cursor]')
  label.value = labelled?.dataset.cursor ?? ''
  hover.value = !!target?.closest('a, button, input, textarea, select, label, [data-cursor]')
}

const onDown = () => (pressed.value = true)
const onUp = () => (pressed.value = false)
const onLeave = () => (visible.value = false)

onMounted(() => {
  const ok =
    matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!ok) return
  enabled.value = true
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerover', onOver, { passive: true })
  window.addEventListener('pointerdown', onDown)
  window.addEventListener('pointerup', onUp)
  document.documentElement.addEventListener('pointerleave', onLeave)
  frame = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerover', onOver)
  window.removeEventListener('pointerdown', onDown)
  window.removeEventListener('pointerup', onUp)
  document.documentElement.removeEventListener('pointerleave', onLeave)
})
</script>

<template>
  <template v-if="enabled">
    <div ref="ring" class="ring-pos" aria-hidden="true">
      <div class="ring" :class="{ hover, pressed, visible, labelled: !!label }">
        <span>{{ label }}</span>
      </div>
    </div>
    <div ref="dot" class="dot-pos" aria-hidden="true">
      <div class="dot" :class="{ visible, hidden: !!label }"></div>
    </div>
  </template>
</template>

<style scoped>
.ring-pos,
.dot-pos {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 999;
  pointer-events: none;
}

.ring {
  width: 38px;
  height: 38px;
  margin: -19px 0 0 -19px;
  border-radius: 50%;
  border: 1.5px solid var(--lime);
  display: grid;
  place-items: center;
  opacity: 0;
  mix-blend-mode: difference;
  transition:
    width 0.35s var(--ease-out),
    height 0.35s var(--ease-out),
    margin 0.35s var(--ease-out),
    background 0.3s,
    opacity 0.3s,
    scale 0.2s;
}

.ring.visible {
  opacity: 1;
}

.ring.hover {
  width: 64px;
  height: 64px;
  margin: -32px 0 0 -32px;
  background: var(--lime);
}

.ring.pressed {
  scale: 0.8;
}

.ring span {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--navy-deep);
  opacity: 0;
  transition: opacity 0.2s;
}

.ring.labelled {
  width: 96px;
  height: 96px;
  margin: -48px 0 0 -48px;
  background: var(--lime);
  mix-blend-mode: normal;
}

.ring.labelled span {
  opacity: 1;
}

.dot {
  width: 6px;
  height: 6px;
  margin: -3px 0 0 -3px;
  border-radius: 50%;
  background: var(--lime);
  opacity: 0;
  transition: opacity 0.2s;
}

.dot.visible {
  opacity: 1;
}

.dot.hidden {
  opacity: 0;
}
</style>
