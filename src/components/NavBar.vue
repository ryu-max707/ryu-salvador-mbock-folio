<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { profile } from '@/data/profile'
import { useTheme } from '@/composables/useTheme'
import { useActiveSection } from '@/composables/useActiveSection'
import { introDone } from '@/composables/useIntro'

const links = [
  { id: 'expertise', label: 'Expertise' },
  { id: 'projets', label: 'Réalisations' },
  { id: 'formations', label: 'Formations' },
  { id: 'parcours', label: 'Parcours' },
  { id: 'jeu', label: 'Jeu' },
  { id: 'contact', label: 'Contact' },
]

const { theme, toggle } = useTheme()
// 'top' (le hero) est observé aussi pour qu'aucun lien ne reste allumé en haut de page
const active = useActiveSection(['top', ...links.map((l) => l.id)])
const scrolled = ref(false)
const hidden = ref(false)
const open = ref(false)

// La barre se cache quand on descend et revient quand on remonte
let lastY = 0
const onScroll = () => {
  const y = window.scrollY
  scrolled.value = y > 24
  hidden.value = y > 400 && y > lastY && !open.value
  lastY = y
}
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

watch(open, (value) => (document.body.style.overflow = value ? 'hidden' : ''))
</script>

<template>
  <header class="nav" :class="{ scrolled, open, hidden, ready: introDone }">
    <div class="container inner">
      <a href="#top" class="brand" @click="open = false">
        <span class="logo">{{ profile.initials }}</span>
        <span class="name">
          {{ profile.firstName }} <span class="serif">{{ profile.middleName }}</span>
        </span>
      </a>

      <nav class="links" aria-label="Navigation principale">
        <a
          v-for="(link, i) in links"
          :key="link.id"
          :href="`#${link.id}`"
          :class="{ active: active === link.id }"
          :style="{ '--i': i }"
          @click="open = false"
        >
          {{ link.label }}
        </a>
      </nav>

      <div class="actions">
        <button
          class="icon-btn"
          type="button"
          :aria-label="theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'"
          @click="toggle"
        >
          <AppIcon :name="theme === 'dark' ? 'sun' : 'moon'" />
        </button>
        <a v-magnetic="0.25" href="#contact" class="btn btn-primary cta">Travaillons ensemble</a>
        <button
          class="icon-btn burger"
          type="button"
          :aria-expanded="open"
          aria-label="Ouvrir le menu"
          @click="open = !open"
        >
          <AppIcon :name="open ? 'close' : 'menu'" />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.nav {
  position: fixed;
  inset: 0 0 auto;
  z-index: 50;
  border-bottom: 1px solid transparent;
  transform: translateY(-100%);
  transition:
    transform 0.6s var(--ease-out),
    background 0.3s,
    border-color 0.3s;
}

.nav.ready {
  transform: none;
}

.nav.ready.hidden {
  transform: translateY(-100%);
}

.nav.scrolled,
.nav.open {
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  backdrop-filter: blur(14px);
  border-color: var(--border);
}

.inner {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 17px;
  letter-spacing: -0.02em;
}

.name .serif {
  font-size: 1.15em;
  color: var(--accent);
}

.logo {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: var(--lime);
  color: var(--navy-deep);
  font-size: 14px;
  font-weight: 800;
  rotate: -6deg;
  transition: rotate 0.5s var(--ease-out);
}

.brand:hover .logo {
  rotate: 354deg;
}

.links {
  display: none;
  gap: 2px;
}

.links a {
  position: relative;
  padding: 8px 13px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
  transition: color 0.2s;
}

.links a::after {
  content: '';
  position: absolute;
  left: 13px;
  right: 13px;
  bottom: 3px;
  height: 2px;
  background: var(--lime);
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 0.4s var(--ease-out);
}

.links a:hover,
.links a.active {
  color: var(--text);
}

.links a:hover::after,
.links a.active::after {
  transform: scaleX(1);
  transform-origin: left;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: border-color 0.2s, rotate 0.5s var(--ease-out);
}

.icon-btn:hover {
  border-color: var(--text);
  rotate: 20deg;
}

.cta {
  display: none;
  padding: 10px 18px;
  font-size: 14px;
}

@media (min-width: 960px) {
  .links {
    display: flex;
  }
  .burger {
    display: none;
  }
}

@media (min-width: 1200px) {
  .cta {
    display: inline-flex;
  }
}

@media (max-width: 959px) {
  .open .links {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 72px;
    left: 0;
    right: 0;
    height: calc(100dvh - 72px);
    padding: 24px 16px;
    gap: 4px;
    background: var(--bg);
  }
  .open .links a {
    font-size: clamp(2rem, 9vw, 2.8rem);
    font-family: var(--font-display);
    font-weight: 700;
    letter-spacing: -0.04em;
    padding: 8px 16px;
    color: var(--text);
    animation: menu-in 0.6s var(--ease-out) both;
    animation-delay: calc(var(--i) * 60ms);
  }
  .open .links a::after {
    display: none;
  }
  .open .links a.active {
    color: var(--accent);
  }
}

@keyframes menu-in {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
}
</style>
