import type { Directive } from 'vue'

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches

/* ---------- Parallaxe : v-parallax="0.2" (vertical) ou v-parallax:x="-0.4" ---------- */

interface ParallaxItem {
  el: HTMLElement
  speed: number
  axis: 'x' | 'y'
}

const parallaxItems = new Set<ParallaxItem>()
const parallaxByEl = new WeakMap<HTMLElement, ParallaxItem>()
let ticking = false

function updateParallax() {
  ticking = false
  const vh = window.innerHeight
  for (const item of parallaxItems) {
    const rect = item.el.getBoundingClientRect()
    if (rect.bottom < -200 || rect.top > vh + 200) continue
    const delta = (rect.top + rect.height / 2 - vh / 2) * item.speed
    item.el.style.translate = item.axis === 'x' ? `${delta}px 0` : `0 ${delta}px`
  }
}

function requestParallax() {
  if (!ticking) {
    ticking = true
    requestAnimationFrame(updateParallax)
  }
}

export const vParallax: Directive<HTMLElement, number> = {
  mounted(el, binding) {
    if (reducedMotion()) return
    const item: ParallaxItem = { el, speed: binding.value ?? 0.15, axis: binding.arg === 'x' ? 'x' : 'y' }
    parallaxItems.add(item)
    parallaxByEl.set(el, item)
    if (parallaxItems.size === 1) {
      window.addEventListener('scroll', requestParallax, { passive: true })
      window.addEventListener('resize', requestParallax)
    }
    requestParallax()
  },
  unmounted(el) {
    const item = parallaxByEl.get(el)
    if (item) parallaxItems.delete(item)
    if (parallaxItems.size === 0) {
      window.removeEventListener('scroll', requestParallax)
      window.removeEventListener('resize', requestParallax)
    }
  },
}

/* ---------- Inclinaison 3D qui suit la souris : v-tilt ou v-tilt="8" (degrés max) ---------- */

type Cleanup = () => void
const cleanups = new WeakMap<HTMLElement, Cleanup>()

export const vTilt: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    if (reducedMotion() || !finePointer()) return
    const max = binding.value ?? 7
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      el.style.transition = 'transform 0.15s ease-out'
      el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max}deg) translateY(-6px)`
      el.style.setProperty('--gx', `${x * 100}%`)
      el.style.setProperty('--gy', `${y * 100}%`)
    }
    const leave = () => {
      el.style.transition = 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)'
      el.style.transform = ''
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    cleanups.set(el, () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    })
  },
  unmounted(el) {
    cleanups.get(el)?.()
  },
}

/* ---------- Bouton aimanté : v-magnetic ou v-magnetic="0.4" ---------- */

const magnetCleanups = new WeakMap<HTMLElement, Cleanup>()

export const vMagnetic: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    if (reducedMotion() || !finePointer()) return
    const strength = binding.value ?? 0.35
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const x = e.clientX - (r.left + r.width / 2)
      const y = e.clientY - (r.top + r.height / 2)
      el.style.translate = `${x * strength}px ${y * strength}px`
    }
    const leave = () => (el.style.translate = '')
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    magnetCleanups.set(el, () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    })
  },
  unmounted(el) {
    magnetCleanups.get(el)?.()
  },
}
