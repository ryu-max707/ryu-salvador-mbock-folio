import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Renvoie l'id de la section actuellement visible, pour surligner le lien du menu. */
export function useActiveSection(ids: string[]) {
  const active = ref(ids[0] ?? '')
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) active.value = entry.target.id
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
  })

  onBeforeUnmount(() => observer?.disconnect())

  return active
}
