/**
 * Toutes les données du site sont ici.
 * Pour ajouter un projet, une formation ou une étape de parcours,
 * il suffit d'ajouter un objet dans le tableau correspondant.
 */

export interface Stat {
  value: number
  suffix?: string
  label: string
  detail: string
}

export interface Expertise {
  icon: 'code' | 'teach' | 'layers' | 'rocket' | 'phone'
  title: string
  text: string
  tags: string[]
}

export type ProjectCategory = 'Web' | 'Mobile' | 'API' | 'Formation'

export interface Project {
  name: string
  role: string
  category: ProjectCategory
  summary: string
  stack: string[]
  year: string
  featured?: boolean
  link?: string
  repo?: string
  image?: string
  /** Point de cadrage de l'image dans le carrousel (object-position), ex : '70% 40%' */
  imagePosition?: string
}

export interface Training {
  title: string
  level: 'Débutant' | 'Intermédiaire' | 'Avancé'
  duration: string
  format: string
  modules: string[]
}

export interface TimelineItem {
  period: string
  title: string
  place: string
  text: string
  kind: 'dev' | 'formation'
}

export interface Testimonial {
  quote: string
  author: string
  role: string
}

export interface Reference {
  role: string
  company: string
  context: string
}

export const profile = {
  firstName: 'Salvador',
  middleName: 'Ryu',
  lastName: 'Mbock',
  initials: 'SR',
  headline: ['Développeur', 'Formateur'],
  rotating: ['applications web', 'apps mobiles Flutter & Kotlin', 'API Laravel', 'interfaces Vue.js', 'développeurs de demain'],
  pitch:
    "Je conçois des applications web et mobiles fiables — Laravel, Vue.js, Flutter, Kotlin — de l'idée à la mise en production, et je transmets ce savoir-faire à travers des formations concrètes, orientées projet.",
  location: 'Douala, Cameroun · À distance',
  available: true,
  email: 'salvadormbockryu@gmail.com',
  whatsapp: '237655018950', // format international, sans + ni espaces
  photo: '/images/ryry.jpeg', // fichier dans /public/images
  backdrop: '/images/bg%20black.jpeg', // photo de fond du site (« bg black.jpeg », espace encodé en %20)
  about:
    "Développeur web et mobile passionné, avec une solide expérience d'IT officer : 3 ans de développement sous Laravel et 2 ans de création d'applications avec Flutter et Kotlin. Aujourd'hui développeur front web & mobile chez Mamoni Finance et formateur IT chez GSVTII, je conçois des solutions performantes et adaptées aux besoins des utilisateurs.",
  cvUrl: '/cv/cv-mbock-ryu-salvador.pdf', // fichier dans /public/cv
  socials: [
    { label: 'GitHub', url: 'https://github.com/Ryu-max707' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/mbock-ryu-salvador-b89013253' },
  ],
}

// Chiffres tirés du CV (expériences depuis 2022, formateur depuis 2024)
export const stats: Stat[] = [
  { value: 4, suffix: '+', label: "Années d'expérience", detail: 'Laravel, puis Flutter & Kotlin' },
  { value: 2, suffix: '+', label: 'Années de formation', detail: 'Formateur IT chez GSVTII' },
  { value: 3, label: 'Entreprises', detail: 'Mamoni Finance, AfroLink, Memphys' },
  { value: 15, suffix: '+', label: 'Technologies', detail: 'Front, back, mobile & bases de données' },
]

export const expertises: Expertise[] = [
  {
    icon: 'code',
    title: 'Développement Front-end',
    text: 'Des interfaces responsives et agréables, pensées pour les vrais utilisateurs, avec intégration d’API.',
    tags: ['Vue.js', 'React.js', 'Tailwind CSS', 'Livewire', 'Bootstrap'],
  },
  {
    icon: 'phone',
    title: 'Développement Mobile',
    text: 'Des applications Android et multiplateformes performantes, notamment pour la fintech et les services.',
    tags: ['Flutter / Dart', 'Kotlin', 'Jetpack Compose', 'Android'],
  },
  {
    icon: 'layers',
    title: 'Back-end & bases de données',
    text: 'Des API claires et sécurisées, des bases de données bien modélisées, prêtes à grandir.',
    tags: ['Laravel', 'PHP', 'Node.js', 'Python', 'MySQL', 'PostgreSQL'],
  },
  {
    icon: 'rocket',
    title: 'Outils & méthodes',
    text: 'Maquettes, gestion de version et suivi de projet : des outils pro pour travailler en équipe et livrer proprement.',
    tags: ['Figma', 'GitHub / GitLab', 'Jira', 'Trello', 'WordPress'],
  },
  {
    icon: 'teach',
    title: 'Formation IT',
    text: 'Des formations en développement logiciel et outils numériques, avec ateliers pratiques et projets concrets.',
    tags: ['Développement logiciel', 'Outils numériques', 'Ateliers pratiques', 'Projets concrets'],
  },
]

// TODO : Lending Club, eBoard Banking, Mamoni Finance et Bigoodee — remplacer les tags
// (fonctionnalités) par les technologies réellement utilisées ; vérifier rôle / année de Lending Club et Bigoodee.
export const projects: Project[] = [
  {
    name: 'RyRy CV',
    role: 'Concepteur & développeur',
    category: 'Web',
    summary:
      "Générateur de CV et de lettres de motivation avec aperçu en temps réel, export PDF et sauvegarde en ligne.",
    stack: ['Vue 3', 'TypeScript', 'Pinia', 'jsPDF', 'Vercel'],
    year: '2026',
    featured: true,
    link: 'https://cv-ryry.vercel.app/',
    image: '/images/projects/ryry-cv.jpg',
    imagePosition: '62% 45%',
  },
  {
    name: 'Lending Club',
    role: 'Conception & développement',
    category: 'Web',
    summary:
      'Solution de gestion des prêts pour entreprises : demandes, validation, suivi des remboursements et rapports, sur web et mobile.',
    stack: ['Tableau de bord', 'Web + mobile', "Workflow d'approbation", 'Reporting'],
    year: '2025',
    image: '/images/projects/lending-club.jpg',
    imagePosition: '78% 40%',
  },
  {
    name: 'eBoard Banking',
    role: 'Développeur front web · Mamoni Finance',
    category: 'Web',
    summary:
      'Back-office bancaire pour superviser, analyser et traiter les transactions en temps réel : clients, volumes, anomalies et filtres avancés.',
    stack: ['Back-office', 'Temps réel', 'Filtres avancés', 'Export Excel'],
    year: '2026',
    link: 'https://e-board.mamonipay.me/',
    image: '/images/projects/eboard-banking.jpg',
    imagePosition: '52% 28%',
  },
  {
    name: 'Mamoni Finance',
    role: 'Développeur mobile · Mamoni Finance',
    category: 'Mobile',
    summary:
      'Application de mobile banking : transferts, recharges, paiement de factures et suivi du compte en temps réel, 24h/24.',
    stack: ['Mobile banking', 'Transferts', 'Paiement de factures', 'Android & iOS'],
    year: '2025',
    link: 'https://mb.mamonipay.me/',
    image: '/images/projects/mamoni-finance.jpg',
    imagePosition: '60% 30%',
  },
  {
    name: 'Bigoodee NewsLetter',
    role: 'Conception & développement',
    category: 'Web',
    summary:
      'Landing page et newsletter beauté & bien-être : inscription par email, contenus hebdomadaires et mise en avant des articles.',
    stack: ['Landing page', 'Newsletter', 'Emailing'],
    year: '2025',
    link: 'https://mon-projet-r.vercel.app/',
    image: '/images/projects/bigoodee-newsletter.jpg',
    imagePosition: '50% 40%',
  },
  {
    name: 'Programme de formation',
    role: 'Formateur',
    category: 'Formation',
    summary: 'Parcours intensif pour passer de débutant à développeur web autonome.',
    stack: ['HTML/CSS', 'JavaScript', 'Vue.js'],
    year: '2025',
  },
]

export const trainings: Training[] = [
  {
    title: 'Les bases du développement web',
    level: 'Débutant',
    duration: '4 semaines',
    format: 'Présentiel ou en ligne',
    modules: ['HTML sémantique', 'CSS moderne & responsive', 'JavaScript essentiel', 'Git & GitHub'],
  },
  {
    title: 'Vue.js de zéro à la production',
    level: 'Intermédiaire',
    duration: '6 semaines',
    format: 'En ligne, projet fil rouge',
    modules: ['Composition API', 'Vue Router & Pinia', 'Appels API', 'Tests & déploiement'],
  },
  {
    title: 'API & back-end professionnel',
    level: 'Avancé',
    duration: '6 semaines',
    format: 'Hybride, mentorat inclus',
    modules: ['Conception REST', 'Authentification', 'Bases de données SQL', 'Sécurité & performance'],
  },
]

// Parcours repris du CV, du plus récent au plus ancien (kind 'formation' = enseignement ou diplôme)
export const timeline: TimelineItem[] = [
  {
    period: 'Déc. 2025 — Aujourd’hui',
    title: 'Développeur mobile Android',
    place: 'AfroLink · Freelance',
    text: 'Conception et maintenance d’applications mobiles performantes en Kotlin pour une plateforme de prestation de services.',
    kind: 'dev',
  },
  {
    period: 'Avr. 2025 — Aujourd’hui',
    title: 'Développeur front web & mobile',
    place: 'Mamoni Finance · Sur place',
    text: 'Conception d’applications fintech performantes et sécurisées : interfaces responsives, intégration d’API et fonctionnalités de paiement.',
    kind: 'dev',
  },
  {
    period: 'Janv. — Mai 2025',
    title: 'Certification en développement web',
    place: 'OIF · Organisation internationale de la Francophonie',
    text: 'Certification en développement web obtenue auprès de l’OIF.',
    kind: 'formation',
  },
  {
    period: 'Janv. 2024 — Aujourd’hui',
    title: 'Formateur IT',
    place: 'GSVTII · Global Service Virtual Training Institute',
    text: 'Conception et animation de formations en développement logiciel, outils numériques et technologies émergentes, à travers des ateliers pratiques et des projets concrets.',
    kind: 'formation',
  },
  {
    period: '2024 — 2026',
    title: 'Licence Informatique, option SAD',
    place: 'Université de Douala',
    text: 'Licence en informatique, option Systèmes d’aide à la décision.',
    kind: 'formation',
  },
  {
    period: 'Janv. 2022 — Nov. 2024',
    title: 'Stagiaire développeur full-stack Laravel',
    place: 'Memphys Consulting · Sur place',
    text: 'Conception, développement et maintenance d’applications web : front-end, back-end, intégration d’API et bases de données, aux côtés de développeurs expérimentés.',
    kind: 'dev',
  },
  {
    period: '2020',
    title: 'Baccalauréat TI',
    place: 'Lycée Classique d’Édéa',
    text: 'Baccalauréat en technologies de l’information.',
    kind: 'formation',
  },
]

// Uniquement de vrais témoignages. Tant que la liste est vide, la section est masquée.
// Format anonyme conseillé :
// { quote: '…', author: 'Développeur senior', role: 'Fintech à Douala' },
export const testimonials: Testimonial[] = []

// Références du CV : poste et entreprise seulement, jamais de nom ni de numéro (communiqués sur demande)
export const references: Reference[] = [
  { role: 'Développeur senior', company: 'Mamoni Finance', context: 'Développement front web & mobile fintech' },
  { role: 'Responsable académique', company: 'GSVTII', context: 'Formations en développement logiciel' },
  { role: 'Chef de projet', company: 'AfroLink', context: 'Application mobile Android en Kotlin' },
]
