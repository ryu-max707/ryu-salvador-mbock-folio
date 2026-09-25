<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

export interface ViewerItem {
  src: string
  title: string
  caption?: string
  link?: string
}

/** Visionneuse plein écran. v-model = index de l'image affichée, null = fermée. */
const props = defineProps<{ items: ViewerItem[] }>()
const index = defineModel<number | null>({ required: true })

const root = ref<HTMLElement | null>(null)
const closeBtn = ref<HTMLButtonElement | null>(null)
let lastFocus: HTMLElement | null = null

const current = computed(() => (index.value === null ? null : (props.items[index.value] ?? null)))

const close = () => (index.value = null)

function step(delta: number) {
  if (index.value === null) return
  const n = props.items.length
  index.value = (index.value + delta + n) % n
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowRight') step(1)
  else if (e.key === 'ArrowLeft') step(-1)
  else if (e.key === 'Tab' && root.value) {
    // Le focus reste dans la visionneuse
    const focusables = [...root.value.querySelectorAll<HTMLElement>('a[href], button')]
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last?.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first?.focus()
    }
  }
}

function lock(open: boolean) {
  document.documentElement.style.overflow = open ? 'hidden' : ''
  if (open) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
}

watch(
  () => index.value !== null,
  async (open) => {
    lock(open)
    if (open) {
      lastFocus = document.activeElement as HTMLElement | null
      await nextTick()
      closeBtn.value?.focus()
    } else {
      lastFocus?.focus()
    }
  },
)

onBeforeUnmount(() => lock(false))
</script>

<template>
  <Teleport to="body">
    <Transition name="viewer">
      <div
        v-if="current"
        ref="root"
        class="viewer"
        role="dialog"
        aria-modal="true"
        :aria-label="`Visuel : ${current.title}`"
        @click.self="close"
      >
        <figure class="frame" @click.self="close">
          <Transition name="swap" mode="out-in">
            <img :key="current.src" :src="current.src" :alt="`Visuel du projet ${current.title}`" />
          </Transition>
          <figcaption>
            <span>
              <strong>{{ current.title }}</strong>
              <small v-if="current.caption">{{ current.caption }}</small>
            </span>
            <span class="side">
              <a v-if="current.link" :href="current.link" target="_blank" rel="noopener" class="visit">
                Visiter le site <AppIcon name="external" :size="15" />
              </a>
              <span class="count">{{ (index ?? 0) + 1 }} / {{ items.length }}</span>
            </span>
          </figcaption>
        </figure>

        <button ref="closeBtn" type="button" class="ctrl close" aria-label="Fermer" @click="close">
          <AppIcon name="close" :size="22" />
        </button>
        <template v-if="items.length > 1">
          <button type="button" class="ctrl prev" aria-label="Visuel précédent" @click="step(-1)">
            <AppIcon name="arrow" :size="22" class="flip" />
          </button>
          <button type="button" class="ctrl next" aria-label="Visuel suivant" @click="step(1)">
            <AppIcon name="arrow" :size="22" />
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.viewer {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 72px 16px 24px;
  background: color-mix(in srgb, var(--navy-deep) 88%, transparent);
  backdrop-filter: blur(10px);
}

@media (min-width: 768px) {
  .viewer {
    padding: 56px 96px;
  }
}

.frame {
  margin: 0;
  display: grid;
  gap: 14px;
  justify-items: center;
  max-width: 100%;
  max-height: 100%;
}

img {
  max-width: min(100%, 1400px);
  max-height: calc(100dvh - 160px);
  object-fit: contain;
  border-radius: 16px;
  box-shadow: 0 40px 100px -30px rgba(0, 0, 0, 0.8);
}

figcaption {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px 16px;
  color: #eef3e4;
}

figcaption strong {
  font-family: var(--font-display);
  font-size: 18px;
  letter-spacing: -0.02em;
  margin-right: 10px;
}

figcaption small {
  font-family: var(--font-mono);
  font-size: 12px;
  color: rgba(238, 243, 228, 0.6);
}

.side {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-shrink: 0;
}

.visit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  background: var(--lime);
  color: var(--navy-deep);
  transition: transform 0.3s var(--ease-out), box-shadow 0.3s var(--ease-out);
}

.visit:hover {
  transform: translate(-2px, -2px);
  box-shadow: 3px 3px 0 #eef3e4;
}

.count {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--lime);
}

.ctrl {
  position: absolute;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1.5px solid rgba(238, 243, 228, 0.35);
  background: color-mix(in srgb, var(--navy-deep) 60%, transparent);
  color: #eef3e4;
  cursor: pointer;
  transition: background 0.25s, color 0.25s, border-color 0.25s, transform 0.3s var(--ease-out);
}

.ctrl:hover {
  background: var(--lime);
  border-color: var(--lime);
  color: var(--navy-deep);
  transform: scale(1.08);
}

.close {
  top: 14px;
  right: 14px;
}

.prev,
.next {
  top: 50%;
  translate: 0 -50%;
}

.prev {
  left: 20px;
}

.next {
  right: 20px;
}

@media (max-width: 767px) {
  .prev,
  .next {
    top: auto;
    bottom: 16px;
    translate: none;
  }
  .prev {
    left: calc(50% - 64px);
  }
  .next {
    right: calc(50% - 64px);
  }
  .viewer {
    padding-bottom: 88px;
  }
  img {
    max-height: calc(100dvh - 220px);
  }
}

.flip {
  transform: rotate(180deg);
}

.viewer-enter-active,
.viewer-leave-active {
  transition: opacity 0.35s var(--ease-out);
}

.viewer-enter-active img,
.viewer-leave-active img {
  transition: transform 0.5s var(--ease-out);
}

.viewer-enter-from,
.viewer-leave-to {
  opacity: 0;
}

.viewer-enter-from img,
.viewer-leave-to img {
  transform: scale(0.92) translateY(20px);
}

.swap-enter-active,
.swap-leave-active {
  transition: opacity 0.25s, transform 0.35s var(--ease-out);
}

.swap-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.swap-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
