<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { profile } from '@/data/profile'
import { cvFileName, cvOpen } from '@/composables/useCv'

const root = ref<HTMLElement | null>(null)
const closeBtn = ref<HTMLButtonElement | null>(null)
let lastFocus: HTMLElement | null = null

const close = () => (cvOpen.value = false)

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
  else if (e.key === 'Tab' && root.value) {
    // Le focus reste dans la fenêtre
    const focusables = [...root.value.querySelectorAll<HTMLElement>('a[href], button, iframe')]
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

watch(cvOpen, async (open) => {
  lock(open)
  if (open) {
    lastFocus = document.activeElement as HTMLElement | null
    await nextTick()
    closeBtn.value?.focus()
  } else {
    lastFocus?.focus()
  }
})

onBeforeUnmount(() => lock(false))
</script>

<template>
  <Teleport to="body">
    <Transition name="cv">
      <div
        v-if="cvOpen && profile.cvUrl"
        ref="root"
        class="cv-viewer"
        role="dialog"
        aria-modal="true"
        :aria-label="`CV de ${profile.firstName} ${profile.middleName} ${profile.lastName}`"
        @click.self="close"
      >
        <div class="panel">
          <header>
            <div class="title">
              <span class="icon"><AppIcon name="file" :size="18" /></span>
              <span>
                <strong>Curriculum vitae</strong>
                <small>{{ profile.firstName }} {{ profile.middleName }} {{ profile.lastName }} · PDF</small>
              </span>
            </div>
            <div class="actions">
              <a :href="profile.cvUrl" target="_blank" rel="noopener" class="ghost">
                <AppIcon name="external" :size="16" /> <span>Ouvrir dans un onglet</span>
              </a>
              <a :href="profile.cvUrl" :download="cvFileName" class="primary">
                <AppIcon name="download" :size="16" /> Télécharger
              </a>
              <button ref="closeBtn" type="button" class="close" aria-label="Fermer" @click="close">
                <AppIcon name="close" :size="20" />
              </button>
            </div>
          </header>
          <iframe :src="`${profile.cvUrl}#view=FitH`" title="Aperçu du CV"></iframe>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.cv-viewer {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 24px;
  background: color-mix(in srgb, var(--navy-deep) 88%, transparent);
  backdrop-filter: blur(10px);
}

.panel {
  width: min(100%, 980px);
  height: min(100%, 1100px);
  display: grid;
  grid-template-rows: auto 1fr;
  border-radius: 22px;
  overflow: hidden;
  background: var(--navy-deep);
  border: 1px solid rgba(214, 228, 255, 0.14);
  box-shadow: 0 40px 100px -30px rgba(0, 0, 0, 0.8);
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px 14px 20px;
  color: #eef3e4;
  border-bottom: 1px solid rgba(214, 228, 255, 0.12);
}

.title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.title .icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--lime);
  color: var(--navy-deep);
  flex-shrink: 0;
}

.title strong {
  display: block;
  font-family: var(--font-display);
  font-size: 16px;
  letter-spacing: -0.02em;
}

.title small {
  font-family: var(--font-mono);
  font-size: 11px;
  color: rgba(238, 243, 228, 0.6);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.actions a {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  transition: transform 0.3s var(--ease-out), box-shadow 0.3s var(--ease-out), border-color 0.25s;
}

.primary {
  background: var(--lime);
  color: var(--navy-deep);
}

.primary:hover {
  transform: translate(-2px, -2px);
  box-shadow: 3px 3px 0 #eef3e4;
}

.ghost {
  border: 1.5px solid rgba(238, 243, 228, 0.25);
  color: #eef3e4;
}

.ghost:hover {
  border-color: #eef3e4;
}

@media (max-width: 860px) {
  .ghost span {
    display: none;
  }
}

.close {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1.5px solid rgba(238, 243, 228, 0.25);
  background: transparent;
  color: #eef3e4;
  cursor: pointer;
  transition: background 0.25s, color 0.25s, border-color 0.25s;
}

.close:hover {
  background: var(--lime);
  border-color: var(--lime);
  color: var(--navy-deep);
}

iframe {
  width: 100%;
  height: 100%;
  border: 0;
  background: #525659;
}

.cv-enter-active,
.cv-leave-active {
  transition: opacity 0.35s var(--ease-out);
}

.cv-enter-active .panel,
.cv-leave-active .panel {
  transition: transform 0.5s var(--ease-out);
}

.cv-enter-from,
.cv-leave-to {
  opacity: 0;
}

.cv-enter-from .panel,
.cv-leave-to .panel {
  transform: translateY(30px) scale(0.97);
}
</style>
