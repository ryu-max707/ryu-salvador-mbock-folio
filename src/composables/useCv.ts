import { ref } from 'vue'
import { profile } from '@/data/profile'

/** Visionneuse de CV partagée : n'importe quel bouton peut l'ouvrir. */
export const cvOpen = ref(false)

/** Nom proposé au visiteur quand il télécharge le CV */
export const cvFileName = `CV-${profile.lastName}-${profile.middleName}-${profile.firstName}.pdf`

export function openCv() {
  if (!profile.cvUrl) return
  // Les navigateurs mobiles affichent mal un PDF intégré : on l'ouvre dans un onglet
  if (matchMedia('(max-width: 767px), (hover: none)').matches) window.open(profile.cvUrl, '_blank', 'noopener')
  else cvOpen.value = true
}
