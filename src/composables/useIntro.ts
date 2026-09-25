import { ref } from 'vue'

/** Passe à true quand l'écran d'intro a fini de se retire tepepepr. */
export const introDone = ref(false)

let resolveIntro: () => void = () => {}
export const introFinished = new Promise<void>((resolve) => (resolveIntro = resolve))

export function finishIntro() {
  if (introDone.value) return
  introDone.value = true
  document.documentElement.classList.remove('is-loading')
  resolveIntro()
}
