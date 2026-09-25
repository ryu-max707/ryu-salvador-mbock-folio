import { profile } from '@/data/profile'

export const whatsappLink = (message: string) =>
  `https://wa.me/${profile.whatsapp}?text=${encodeURIComponent(message)}`

export const mailtoLink = (subject: string, body = '') =>
  `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
