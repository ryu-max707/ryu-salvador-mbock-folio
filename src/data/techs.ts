import {
  siAndroid,
  siBootstrap,
  siCss,
  siDart,
  siFigma,
  siFlutter,
  siGithub,
  siGitlab,
  siHtml5,
  siJavascript,
  siJetpackcompose,
  siJira,
  siKotlin,
  siLaravel,
  siLivewire,
  siMysql,
  siNodedotjs,
  siPhp,
  siPostgresql,
  siPython,
  siReact,
  siTailwindcss,
  siTrello,
  siVuedotjs,
  siWordpress,
  type SimpleIcon,
} from 'simple-icons'

export interface Tech {
  name: string
  /** Tracé SVG du logo (viewBox 0 0 24 24) */
  path: string
  /** Couleur de marque, sans # */
  hex: string
}

const toTech = (icon: SimpleIcon): Tech => ({ name: icon.title, path: icon.path, hex: icon.hex })

/**
 * Technologies du CV affichées en logos dans le bandeau défilant.
 * Rangée 1 : web & back-end — Rangée 2 : mobile, bases de données et outils.
 * Pour en ajouter une : importer son icône depuis 'simple-icons' (nom sur simpleicons.org).
 */
export const techRows: Tech[][] = [
  [siLaravel, siPhp, siVuedotjs, siReact, siJavascript, siHtml5, siCss, siTailwindcss, siLivewire, siBootstrap, siNodedotjs, siPython].map(toTech),
  [siFlutter, siDart, siKotlin, siJetpackcompose, siAndroid, siMysql, siPostgresql, siFigma, siGithub, siGitlab, siJira, siTrello, siWordpress].map(toTech),
]
