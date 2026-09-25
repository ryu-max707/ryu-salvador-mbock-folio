import { ref, watch } from 'vue'

type Theme = 'dark' | 'light'

function readStored(): Theme {
  try {
    const t = localStorage.getItem('theme')
    if (t === 'light' || t === 'dark') return t
  } catch {
    /* stockage indisponible */
  }
  return 'dark'
}

const theme = ref<Theme>(readStored())

watch(
  theme,
  (value) => {
    document.documentElement.dataset.theme = value
    try {
      localStorage.setItem('theme', value)
    } catch {
      /* stockage indisponible */
    }
  },
  { immediate: true },
)

export function useTheme() {
  const toggle = () => (theme.value = theme.value === 'dark' ? 'light' : 'dark')
  return { theme, toggle }
}
