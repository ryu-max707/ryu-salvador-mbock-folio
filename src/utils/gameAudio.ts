import { ref } from 'vue'

/**
 * Effets sonores du mini-jeu, synthétisés avec l'API Web Audio :
 * aucun fichier à charger, et le son démarre seulement après un geste du joueur
 * (les navigateurs interdisent de jouer du son avant).
 */

export type SfxName =
  | 'start'
  | 'jump'
  | 'land'
  | 'shoot'
  | 'empty'
  | 'coin'
  | 'kill'
  | 'hit'
  | 'clink'
  | 'chargerAlert'
  | 'alarm'
  | 'warn'
  | 'warnCharge'
  | 'rumble'
  | 'bossShot'
  | 'bossHit'
  | 'bossDown'
  | 'levelDay'
  | 'levelNight'
  | 'die'
  | 'record'

const STORAGE_KEY = 'ryu-sound-muted'

function readMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Son coupé ? (mémorisé d'une visite à l'autre) */
export const soundMuted = ref(readMuted())

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null
const lastAt: Partial<Record<SfxName, number>> = {}

function create() {
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return
  ctx = new Ctor()
  // Un compresseur évite la saturation quand plusieurs sons se superposent
  const compressor = ctx.createDynamicsCompressor()
  master = ctx.createGain()
  master.gain.value = 0.55
  master.connect(compressor)
  compressor.connect(ctx.destination)
  // Une seconde de bruit blanc, réutilisée pour tous les souffles et explosions
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
}

/** À appeler depuis un geste du joueur (clic, touche, appui) : crée ou réveille le moteur audio. */
export function unlockAudio() {
  if (!ctx) create()
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

/** État du moteur audio ('none' tant qu'il n'a pas été déverrouillé), pour les tests. */
export const audioState = () => ctx?.state ?? 'none'

interface Tone {
  type?: OscillatorType
  f: number
  to?: number // fréquence finale : glissando
  dur: number
  vol?: number
  at?: number // décalage en secondes
}

function tone(t: Tone) {
  if (!ctx || !master) return
  const start = ctx.currentTime + (t.at ?? 0)
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = t.type ?? 'square'
  osc.frequency.setValueAtTime(t.f, start)
  if (t.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, t.to), start + t.dur)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(t.vol ?? 0.12, start + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + t.dur)
  osc.connect(gain)
  gain.connect(master)
  osc.start(start)
  osc.stop(start + t.dur + 0.03)
}

interface Noise {
  dur: number
  vol?: number
  at?: number
  filter?: BiquadFilterType
  f: number
  to?: number
  q?: number
}

function noise(n: Noise) {
  if (!ctx || !master || !noiseBuffer) return
  const start = ctx.currentTime + (n.at ?? 0)
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  src.loop = true
  const filter = ctx.createBiquadFilter()
  filter.type = n.filter ?? 'lowpass'
  filter.Q.value = n.q ?? 1
  filter.frequency.setValueAtTime(n.f, start)
  if (n.to) filter.frequency.exponentialRampToValueAtTime(Math.max(20, n.to), start + n.dur)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(n.vol ?? 0.15, start + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + n.dur)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(master)
  src.start(start, Math.random() * 0.5)
  src.stop(start + n.dur + 0.03)
}

// Do5, Mi5, Sol5, Do6… pour les petites fanfares
const NOTE = { C4: 262, E4: 330, G4: 392, A4: 440, C5: 523, E5: 659, G5: 784, B5: 988, C6: 1047, E6: 1319 }

const SOUNDS: Record<SfxName, { gap?: number; run: () => void }> = {
  // Saut : « boing » montant, façon console 8 bits
  jump: { gap: 60, run: () => tone({ type: 'square', f: 300, to: 640, dur: 0.16, vol: 0.1 }) },
  // Atterrissage : petit choc sourd
  land: { gap: 120, run: () => noise({ dur: 0.07, vol: 0.06, f: 500, to: 150 }) },
  // Tir : « pew » descendant + un souffle aigu
  shoot: {
    gap: 50,
    run: () => {
      tone({ type: 'sawtooth', f: 1100, to: 260, dur: 0.13, vol: 0.09 })
      noise({ dur: 0.05, vol: 0.05, filter: 'highpass', f: 3000 })
    },
  },
  // Plus d'énergie : clic sec dans le vide
  empty: { gap: 100, run: () => tone({ type: 'square', f: 140, to: 100, dur: 0.07, vol: 0.06 }) },
  // Pièce : les deux notes du célèbre « ding-ding »
  coin: {
    gap: 30,
    run: () => {
      tone({ type: 'square', f: NOTE.B5, dur: 0.07, vol: 0.08 })
      tone({ type: 'square', f: NOTE.E6, dur: 0.16, vol: 0.08, at: 0.07 })
    },
  },
  // Ennemi abattu : petite explosion
  kill: {
    gap: 50,
    run: () => {
      noise({ dur: 0.18, vol: 0.15, f: 2500, to: 200 })
      tone({ type: 'square', f: 320, to: 70, dur: 0.16, vol: 0.09 })
    },
  },
  // Ennemi touché mais encore debout
  hit: { gap: 40, run: () => tone({ type: 'square', f: 420, to: 200, dur: 0.06, vol: 0.07 }) },
  // Tir encaissé par un mur
  clink: {
    gap: 40,
    run: () => {
      tone({ type: 'triangle', f: 1500, to: 900, dur: 0.08, vol: 0.07 })
      noise({ dur: 0.04, vol: 0.04, filter: 'highpass', f: 4000 })
    },
  },
  // Un bug chargeur s'apprête à foncer
  chargerAlert: { gap: 300, run: () => tone({ type: 'sawtooth', f: 190, to: 95, dur: 0.26, vol: 0.08 }) },
  // Sirène : un boss approche
  alarm: {
    gap: 800,
    run: () => {
      for (let i = 0; i < 3; i++) tone({ type: 'sawtooth', f: 660, to: 440, dur: 0.22, vol: 0.08, at: i * 0.26 })
    },
  },
  // Le boss prépare une attaque : petit « ! » montant
  warn: { gap: 200, run: () => tone({ type: 'square', f: 380, to: 760, dur: 0.14, vol: 0.05 }) },
  // …ou une charge : glissando plus long et plus grave
  warnCharge: {
    gap: 300,
    run: () => {
      tone({ type: 'sawtooth', f: 300, to: 900, dur: 0.28, vol: 0.07 })
      tone({ type: 'square', f: 450, to: 1350, dur: 0.28, vol: 0.04, at: 0.1 })
    },
  },
  // Le boss charge : grondement
  rumble: {
    gap: 400,
    run: () => {
      noise({ dur: 0.6, vol: 0.2, f: 260, to: 90, q: 2 })
      tone({ type: 'sawtooth', f: 70, to: 40, dur: 0.6, vol: 0.1 })
    },
  },
  // Tir du boss
  bossShot: {
    gap: 90,
    run: () => {
      tone({ type: 'sawtooth', f: 260, to: 120, dur: 0.16, vol: 0.07 })
      noise({ dur: 0.1, vol: 0.05, f: 1200, to: 300 })
    },
  },
  // Coup porté au boss : impact lourd
  bossHit: {
    gap: 70,
    run: () => {
      tone({ type: 'sawtooth', f: 240, to: 90, dur: 0.14, vol: 0.12 })
      noise({ dur: 0.1, vol: 0.1, f: 1800, to: 300 })
    },
  },
  // Boss vaincu : double explosion, puis fanfare de victoire
  bossDown: {
    gap: 1500,
    run: () => {
      noise({ dur: 0.9, vol: 0.28, f: 3500, to: 80 })
      tone({ type: 'sawtooth', f: 420, to: 40, dur: 0.9, vol: 0.14 })
      noise({ dur: 0.6, vol: 0.2, f: 2500, to: 100, at: 0.25 })
      ;[NOTE.C5, NOTE.E5, NOTE.G5].forEach((f, i) => tone({ type: 'square', f, dur: 0.12, vol: 0.08, at: 0.75 + i * 0.11 }))
      tone({ type: 'square', f: NOTE.C6, dur: 0.4, vol: 0.09, at: 1.08 })
    },
  },
  // Début de partie : trois notes qui montent
  start: {
    gap: 500,
    run: () => [NOTE.G4, NOTE.C5, NOTE.E5].forEach((f, i) => tone({ type: 'square', f, dur: 0.1, vol: 0.07, at: i * 0.09 })),
  },
  // Niveau de jour : arpège lumineux
  levelDay: {
    gap: 800,
    run: () => {
      ;[NOTE.C5, NOTE.E5, NOTE.G5].forEach((f, i) => tone({ type: 'triangle', f, dur: 0.14, vol: 0.1, at: i * 0.1 }))
      tone({ type: 'triangle', f: NOTE.C6, dur: 0.3, vol: 0.1, at: 0.3 })
    },
  },
  // Niveau de nuit : notes qui descendent, avec un bourdon grave
  levelNight: {
    gap: 800,
    run: () => {
      ;[NOTE.E5, NOTE.C5, NOTE.A4, NOTE.E4].forEach((f, i) => tone({ type: 'triangle', f, dur: 0.22, vol: 0.1, at: i * 0.14 }))
      tone({ type: 'sine', f: 110, dur: 0.8, vol: 0.08 })
    },
  },
  // Défaite : chute sifflante, puis « waah »
  die: {
    gap: 800,
    run: () => {
      tone({ type: 'square', f: 500, to: 70, dur: 0.55, vol: 0.12 })
      noise({ dur: 0.35, vol: 0.15, f: 2200, to: 120 })
      tone({ type: 'triangle', f: 220, to: 55, dur: 0.5, vol: 0.09, at: 0.2 })
    },
  },
  // Nouveau record : petite fanfare qui monte
  record: {
    gap: 1500,
    run: () =>
      [NOTE.E5, NOTE.G5, NOTE.B5, NOTE.E6].forEach((f, i) => tone({ type: 'square', f, dur: 0.12, vol: 0.07, at: 0.6 + i * 0.11 })),
  },
}

export function playSfx(name: SfxName) {
  if (soundMuted.value || !ctx) return
  const sound = SOUNDS[name]
  const now = performance.now()
  // Évite d'empiler le même son plusieurs fois dans la même fraction de seconde
  if (now - (lastAt[name] ?? -Infinity) < (sound.gap ?? 30)) return
  lastAt[name] = now
  // Journal réservé au mode développement : permet de vérifier quels sons le jeu déclenche
  if (import.meta.env.DEV) ((window as unknown as { __sfxLog?: SfxName[] }).__sfxLog ??= []).push(name)
  sound.run()
}

export function toggleSound() {
  soundMuted.value = !soundMuted.value
  try {
    localStorage.setItem(STORAGE_KEY, soundMuted.value ? '1' : '0')
  } catch {
    /* stockage indisponible */
  }
  if (!soundMuted.value) {
    unlockAudio()
    playSfx('coin') // petit « ding » pour confirmer que le son est revenu
  }
}
