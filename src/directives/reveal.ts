import type { Directive } from 'vue'
import { introFinished } from '@/composables/useIntro'

let observer: IntersectionObserver | null = null

// Au-delà de cette durée l'animation est terminée : on retire la classe
// pour rendre la main aux transitions propres de l'élément (hover, tilt…).
const REVEAL_DURATION = 1200

function show(el: HTMLElement) {
  el.classList.add('is-visible')
  if (el.classList.contains('reveal--split')) return
  const delay = parseInt(el.style.getPropertyValue('--reveal-delay')) || 0
  window.setTimeout(() => el.classList.remove('reveal'), REVEAL_DURATION + delay)
}

function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            show(entry.target as HTMLElement)
            observer?.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
    )
  }
  return observer
}

/**
 * v-reveal ou v-reveal="150" (délai en ms) : fait apparaître l'élément au scroll.
 * Variantes : v-reveal.left / .right / .scale / .blur / .rotate / .clip / .split
 */
export const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    el.classList.add('reveal')
    for (const mod of Object.keys(binding.modifiers)) el.classList.add(`reveal--${mod}`)
    if (binding.value) el.style.setProperty('--reveal-delay', `${binding.value}ms`)
    if (typeof IntersectionObserver === 'undefined') {
      show(el)
      return
    }
    // Rien ne s'anime tant que l'intro n'est pas partie
    introFinished.then(() => {
      if (el.isConnected) getObserver().observe(el)
    })
  },
  unmounted(el) {
    observer?.unobserve(el)
  },
}
