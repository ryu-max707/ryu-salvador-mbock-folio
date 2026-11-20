<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import SectionHeading from './SectionHeading.vue'
import { audioState, playSfx, soundMuted, toggleSound, unlockAudio } from '@/utils/gameAudio'

/* ---------- Réglages du jeu ---------- */
// Le monde a une hauteur logique fixe ; sa largeur s'adapte à l'écran (mais jamais moins de MIN_W).
const H = 300
const GROUND = 252
const MIN_W = 460
const PX = 64 // position horizontale du joueur
const PW = 30
const PH = 44
const GRAVITY = 2600
const JUMP = 880
const BASE_SPEED = 330
const MAX_SPEED = 800
const ACCEL = 5 // gain de vitesse par seconde, à l'intérieur d'un niveau
const LEVEL_SPEED = 38 // gain de vitesse à chaque nouveau niveau
const NIGHT_RADIUS = 210 // portée de la lampe torche la nuit
const DOUBLE_MS = 300 // deux clics dans ce délai = un tir
const SHOT_SPEED = 780
const SHOT_COOLDOWN = 0.2
const AMMO_MAX = 5
const AMMO_REGEN = 0.7 // charges regagnées par seconde
const BEST_KEY = 'ryu-runner-best-v2'

// Couleurs du jeu (indépendantes du thème du site)
const C = {
  skyTop: '#170a1b',
  skyBottom: '#2a1230',
  far: '#2a1236',
  near: '#381842',
  ground: '#4b1f50',
  groundDark: '#2a1230',
  gold: '#d9b45b',
  goldSoft: '#f0dca0',
  silver: '#c8c5d0',
  violet: '#8c4d99',
  violetDark: '#6e3a7a',
  brick: '#5a2a63',
  danger: '#e0607a',
  dangerDark: '#7a2a3d',
  orange: '#ff9a5c',
  skin: '#8b5a3c',
  hair: '#1a0d12',
  text: '#ece9f0',
  // Décor de jour
  daySkyTop: '#e9def0',
  daySkyBottom: '#f6e7c8',
  dayFar: '#d6c8de',
  dayNear: '#bba6c6',
  cloud: '#fbf8fc',
  droneDay: '#8d8798',
}

/* ---------- Niveaux : jour et nuit en alternance, un boss à la fin de chacun ---------- */
type Phase = 'idle' | 'playing' | 'paused' | 'over'
type Stage = 'run' | 'warning' | 'boss' | 'victory'
type EnemyKind = 'bug' | 'wall' | 'drone' | 'hopper' | 'ghost' | 'charger' | 'orb' | 'bolt'
type AttackKind = 'orb' | 'double' | 'bolt' | 'charge' | 'summon'

const isNight = (lv: number) => lv % 2 === 0
// Longueur de la course avant le boss, en pixels de défilement
const stageLength = (lv: number) => Math.min(16000, 10000 + (lv - 1) * 1200)

// Ennemis ajoutés niveau après niveau, avec leur poids d'apparition
function levelTable(lv: number): [EnemyKind, number][] {
  if (lv <= 1) return [['bug', 0.62], ['wall', 0.38]]
  if (lv === 2) return [['bug', 0.34], ['wall', 0.28], ['drone', 0.38]]
  if (lv === 3) return [['bug', 0.18], ['wall', 0.2], ['drone', 0.2], ['hopper', 0.42]]
  if (lv === 4) return [['bug', 0.12], ['wall', 0.16], ['drone', 0.14], ['hopper', 0.2], ['ghost', 0.38]]
  return [['bug', 0.1], ['wall', 0.14], ['drone', 0.12], ['hopper', 0.16], ['ghost', 0.2], ['charger', 0.28]]
}

const NEW_ENEMY: Record<number, string> = {
  1: 'Saute les bugs et les murs',
  2: 'Nouveau : les bugs volants',
  3: 'Nouveau : les bugs sauteurs',
  4: 'Nouveau : les fantômes',
  5: 'Nouveau : les bugs chargeurs',
}
const levelSub = (lv: number) => NEW_ENEMY[lv] ?? 'Les bugs deviennent fous…'

interface BossDef {
  name: string
  hp: number
  delay: number // pause moyenne entre deux attaques
  w: number
  h: number
  fly: boolean
  attacks: AttackKind[]
}

const BOSSES: BossDef[] = [
  { name: 'Mega Bug', hp: 10, delay: 1.9, w: 84, h: 66, fly: false, attacks: ['orb', 'double'] },
  { name: 'Drone Mère', hp: 14, delay: 1.6, w: 96, h: 54, fly: true, attacks: ['bolt', 'orb', 'summon'] },
  { name: 'Virus Fou', hp: 18, delay: 1.5, w: 70, h: 70, fly: false, attacks: ['orb', 'bolt', 'charge'] },
  { name: 'Roi des Bugs', hp: 24, delay: 1.25, w: 96, h: 82, fly: false, attacks: ['orb', 'double', 'bolt', 'charge', 'summon'] },
]

const SIZE: Record<EnemyKind, { w: number; h: number; hp: number }> = {
  bug: { w: 34, h: 24, hp: 1 },
  wall: { w: 28, h: 22, hp: 99 },
  drone: { w: 32, h: 20, hp: 1 },
  hopper: { w: 30, h: 26, hp: 1 },
  ghost: { w: 28, h: 26, hp: 1 },
  charger: { w: 40, h: 30, hp: 2 },
  orb: { w: 18, h: 18, hp: 1 },
  bolt: { w: 28, h: 10, hp: 1 },
}
// Ciblés par le tir automatique (les murs, boules et éclairs ne le sont pas)
const SHOOTABLE = new Set<EnemyKind>(['bug', 'drone', 'hopper', 'ghost', 'charger'])
const EMISSIVE = new Set<EnemyKind>(['orb', 'bolt']) // lumineux : visibles même dans le noir

interface Enemy {
  kind: EnemyKind
  x: number
  y: number
  w: number
  h: number
  vy: number
  extra: number // vitesse propre, en plus du défilement
  hp: number
  age: number
  base: number
  t: number
  mode: number
  hurt: number
  passed: boolean
}

interface Coin {
  x: number
  y: number
  phase: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
}

interface Building {
  x: number
  w: number
  h: number
  lights: [number, number][]
}

interface Target {
  cx: () => number
  cy: () => number
  alive: () => boolean
}

interface Shot {
  x: number
  y: number
  vx: number
  vy: number
  target: Target | null
  life: number
  dead: boolean
}

interface Boss {
  def: BossDef
  idx: number
  cycle: number
  hp: number
  maxHp: number
  x: number
  y: number
  state: 'enter' | 'fight' | 'charge' | 'away' | 'dying'
  t: number
  homeX: number
  atk: number // compte à rebours avant la prochaine attaque
  windup: number // > 0 : attaque annoncée (le boss clignote)
  pending: AttackKind | null
  last: AttackKind | null
  queue: { t: number; kind: 'orb' | 'bolt' | 'drone' }[]
  hurt: number
  away: number
}

interface Best {
  score: number
  level: number
}

function readBest(): Best {
  try {
    const raw = localStorage.getItem(BEST_KEY)
    if (raw) {
      const b = JSON.parse(raw) as Partial<Best>
      return { score: Number(b.score) || 0, level: Number(b.level) || 1 }
    }
  } catch {
    /* stockage indisponible */
  }
  return { score: 0, level: 1 }
}

function saveBest(value: Best) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(value))
  } catch {
    /* stockage indisponible */
  }
}

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/* ---------- État affiché (HUD et écrans) ---------- */
const arena = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const phase = ref<Phase>('idle')
const score = ref(0)
const coinCount = ref(0)
const levelShown = ref(1)
const isDay = ref(true)
const ammoVal = ref(AMMO_MAX)
const best = ref<Best>(readBest())
const newBest = ref(false)
const shake = ref(false)
const banner = ref<{ title: string; sub: string; tone: 'level' | 'boss' | 'win' } | null>(null)
const bossInfo = ref<{ name: string; pct: number } | null>(null)
const final = ref({ meters: 0, level: 1, bosses: 0, kills: 0, cleared: 0 })

// 5 pastilles, chacune remplie selon la charge disponible
const pips = computed(() => Array.from({ length: AMMO_MAX }, (_, i) => clamp(ammoVal.value - i, 0, 1)))

const rank = computed(() => {
  const b = final.value.bosses
  if (b >= 6) return { title: '10x engineer', text: 'Tu cours plus vite que ma CI. Respect.' }
  if (b >= 4) return { title: 'Lead dev', text: 'Même les boss font leur code review chez toi.' }
  if (b >= 2) return { title: 'Dev senior', text: 'Solide. La prod est presque en sécurité.' }
  if (b >= 1) return { title: 'Dev junior prometteur', text: 'Un boss à terre, bon début !' }
  return { title: 'Stagiaire en panique', text: 'Les bugs ont gagné cette manche. Revanche ?' }
})

/* ---------- État du monde (hors réactivité, mis à jour à chaque image) ---------- */
let ctx: CanvasRenderingContext2D | null = null
let W = 800
let TOP = 0 // ciel supplémentaire visible au-dessus du monde sur les écrans étroits
const skies: { jour?: CanvasGradient; nuit?: CanvasGradient } = {}
let frame = 0
let last = 0
let running = false
let time = 0
let distance = 0
let speed = BASE_SPEED
let nextSpawn = 0
let overAt = 0
let lastTap = -Infinity
let lastShotAt = -Infinity
let god = false // invincibilité, utilisée seulement par l'outil de test du mode dev
let level = 1
let stage: Stage = 'run'
let stageT = 0
let stageStart = 0
let stageTimer = 0
let coinTimer = 0
let nightness = 0 // 0 = plein jour, 1 = pleine nuit (fondu progressif)
let targetNight = 0
let points = 0
let ammo = AMMO_MAX
let canShootAt = 0 // horodatage (ms) à partir duquel on peut retirer
let kills = 0
let cleared = 0
let bossesDefeated = 0
let enemies: Enemy[] = []
let coins: Coin[] = []
let particles: Particle[] = []
let shots: Shot[] = []
let boss: Boss | null = null
let bannerTimer = 0
let shakeTimer = 0
const player = { y: GROUND, vy: 0, onGround: true }

const SPAN = 1400
function makeSkyline(minH: number, maxH: number, withLights: boolean) {
  const list: Building[] = []
  let x = 0
  while (x < SPAN) {
    const w = rand(46, 110)
    const h = rand(minH, maxH)
    const lights: [number, number][] = []
    if (withLights) {
      for (let lx = 8; lx < w - 8; lx += 14) {
        for (let ly = 10; ly < h - 10; ly += 18) if (Math.random() < 0.18) lights.push([lx, ly])
      }
    }
    list.push({ x, w, h, lights })
    x += w + rand(4, 20)
  }
  return list
}
const farLayer = makeSkyline(60, 150, true)
const nearLayer = makeSkyline(30, 90, false)
const stars = Array.from({ length: 46 }, () => ({ x: rand(0, SPAN), y: rand(12, 150), r: rand(0.6, 1.6), t: rand(0, 6) }))
const clouds = Array.from({ length: 7 }, (_, i) => ({ x: i * 200 + rand(0, 120), y: rand(30, 130), s: rand(0.7, 1.3) }))

/* ---------- Taille du canvas (net sur écrans haute densité) ---------- */
let resizeObserver: ResizeObserver | null = null

function resize() {
  const el = canvas.value
  if (!el || !ctx) return
  const rect = el.getBoundingClientRect()
  if (!rect.height || !rect.width) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  el.width = Math.round(rect.width * dpr)
  el.height = Math.round(rect.height * dpr)
  // Sur un écran étroit on rétrécit le monde plutôt que d'écraser la zone de jeu
  const scale = Math.min(el.height / H, el.width / MIN_W)
  W = el.width / scale
  TOP = Math.max(0, el.height / scale - H)
  ctx.setTransform(scale, 0, 0, scale, 0, el.height - H * scale)
  for (const [m, top, bottom] of [
    ['nuit', C.skyTop, C.skyBottom],
    ['jour', C.daySkyTop, C.daySkyBottom],
  ] as const) {
    const g = ctx.createLinearGradient(0, -TOP, 0, GROUND)
    g.addColorStop(0, top)
    g.addColorStop(1, bottom)
    skies[m] = g
  }
  draw()
}

/* ---------- Bannières (nouveau niveau, boss…) ---------- */
function showBanner(title: string, sub: string, tone: 'level' | 'boss' | 'win', ms = 2400) {
  banner.value = { title, sub, tone }
  clearTimeout(bannerTimer)
  bannerTimer = window.setTimeout(() => (banner.value = null), ms)
}

function clearBanner() {
  clearTimeout(bannerTimer)
  banner.value = null
}

/* ---------- Partie ---------- */
function reset() {
  time = 0
  distance = 0
  speed = BASE_SPEED
  points = 0
  kills = 0
  cleared = 0
  bossesDefeated = 0
  enemies = []
  coins = []
  particles = []
  shots = []
  boss = null
  Object.assign(player, { y: GROUND, vy: 0, onGround: true })
  ammo = AMMO_MAX
  canShootAt = 0
  lastTap = -Infinity
  nightness = 0
  targetNight = 0
  level = 1
  stage = 'run'
  stageT = 0
  stageStart = 0
  stageTimer = 0
  coinTimer = 0
  nextSpawn = 380
  score.value = 0
  coinCount.value = 0
  levelShown.value = 1
  isDay.value = true
  ammoVal.value = AMMO_MAX
  newBest.value = false
  bossInfo.value = null
  clearBanner()
}

function startLevel(n: number) {
  level = n
  levelShown.value = n
  stage = 'run'
  stageT = 0
  stageStart = distance
  targetNight = isNight(n) ? 1 : 0
  nextSpawn = speed * 1.6 // un peu de calme pour découvrir le niveau
  playSfx(n === 1 ? 'start' : isNight(n) ? 'levelNight' : 'levelDay')
  showBanner(`Niveau ${n}`, `${isNight(n) ? '☾ Nuit' : '☀ Jour'} · ${levelSub(n)}`, 'level', 2800)
}

function start() {
  reset()
  phase.value = 'playing'
  last = performance.now()
  startLevel(1)
  arena.value?.focus({ preventScroll: true })
  ensureLoop()
}

function resume() {
  phase.value = 'playing'
  last = performance.now()
  lastTap = -Infinity
  ensureLoop()
}

function jump() {
  if (!player.onGround) return
  player.vy = -JUMP
  player.onGround = false
  burst(PX + PW / 2, GROUND, 6, C.silver, 120)
  playSfx('jump')
}

// Le tir se verrouille sur l'ennemi le plus proche, qu'on soit au sol ou en l'air
function pickTarget(sx: number): Target | null {
  let near: Enemy | null = null
  for (const o of enemies) {
    if (!SHOOTABLE.has(o.kind) || o.hp <= 0 || o.x + o.w < sx || o.x > W) continue
    if (!near || o.x < near.x) near = o
  }
  const b = boss
  if (b && (b.state === 'enter' || b.state === 'fight' || b.state === 'charge') && b.x + b.def.w > sx && b.x < W + 10) {
    if (!near || b.x < near.x) {
      return {
        cx: () => b.x + b.def.w / 2,
        cy: () => b.y + b.def.h / 2,
        alive: () => boss === b && b.state !== 'dying' && b.state !== 'away',
      }
    }
  }
  if (!near) return null
  const o = near
  return { cx: () => o.x + o.w / 2, cy: () => o.y + o.h / 2, alive: () => o.hp > 0 && o.x > -40 }
}

function shoot() {
  if (phase.value !== 'playing') return
  if (performance.now() < canShootAt) return
  const sx = PX + PW
  const sy = player.y - PH * 0.55
  if (ammo < 1) {
    // Plus d'énergie : petit « clic » dans le vide
    burst(sx, sy, 3, C.silver, 60)
    canShootAt = performance.now() + 120
    playSfx('empty')
    return
  }
  ammo -= 1
  canShootAt = performance.now() + SHOT_COOLDOWN * 1000
  lastShotAt = time
  playSfx('shoot')
  const target = pickTarget(sx)
  let vx = SHOT_SPEED
  let vy = 0
  if (target) {
    const dx = target.cx() - sx
    const dy = target.cy() - sy
    const d = Math.hypot(dx, dy) || 1
    vx = (dx / d) * SHOT_SPEED
    vy = (dy / d) * SHOT_SPEED
  }
  shots.push({ x: sx, y: sy, vx, vy, target, life: 2.2, dead: false })
  burst(sx + 4, sy, 5, C.goldSoft, 120)
}

/** Clic, appui ou Espace : démarre, reprend, saute — ou tire si c'est le 2e clic d'un double-clic. */
function tap() {
  unlockAudio()
  if (phase.value === 'paused') return resume()
  if (phase.value === 'idle') return start()
  if (phase.value === 'over') {
    if (performance.now() - overAt >= 600) start() // évite de relancer par réflexe
    return
  }
  const now = performance.now()
  if (now - lastTap < DOUBLE_MS) shoot()
  else jump()
  lastTap = now
}

function onPointer(e: PointerEvent) {
  unlockAudio()
  if (e.button === 2) {
    // Clic droit : tirer sans sauter
    e.preventDefault()
    shoot()
    return
  }
  if (e.button !== 0) return
  e.preventDefault()
  tap()
}

function onKey(e: KeyboardEvent) {
  unlockAudio()
  if (e.key === 'm' || e.key === 'M') {
    e.preventDefault()
    if (!e.repeat) toggleSound()
    return
  }
  if (['f', 'F', 'x', 'X', 'ArrowRight'].includes(e.key)) {
    e.preventDefault()
    if (!e.repeat) shoot()
    return
  }
  if (![' ', 'ArrowUp', 'Enter'].includes(e.key)) return
  e.preventDefault()
  if (!e.repeat) tap()
}

function die() {
  phase.value = 'over'
  playSfx('die')
  overAt = performance.now()
  clearBanner()
  bossInfo.value = null
  burst(PX + PW / 2, player.y - PH / 2, 26, C.danger, 260)
  burst(PX + PW / 2, player.y - PH / 2, 14, C.gold, 200)
  shake.value = true
  clearTimeout(shakeTimer)
  shakeTimer = window.setTimeout(() => (shake.value = false), 450)
  const s = Math.floor(points)
  final.value = { meters: Math.floor(distance / 30), level, bosses: bossesDefeated, kills, cleared }
  if (s > best.value.score || level > best.value.level) {
    newBest.value = s > best.value.score
    best.value = { score: Math.max(s, best.value.score), level: Math.max(level, best.value.level) }
    saveBest(best.value)
  }
  if (newBest.value) playSfx('record')
}

function hurtPlayer() {
  if (!god) die()
}

/* ---------- Ennemis ---------- */
function makeEnemy(kind: EnemyKind, x: number, opts: Partial<Enemy> = {}): Enemy {
  const s = SIZE[kind]
  const lv = 1 + Math.min(level - 1, 8) * 0.07 // les ennemis vont de plus en plus vite
  const e: Enemy = {
    kind,
    x,
    y: GROUND - s.h,
    w: s.w,
    h: s.h,
    vy: 0,
    extra: 0,
    hp: s.hp,
    age: 0,
    base: 0,
    t: 0,
    mode: 0,
    hurt: 0,
    passed: false,
  }
  if (kind === 'bug') e.extra = 40 * lv
  else if (kind === 'drone') {
    e.base = GROUND - 78
    e.y = e.base
    e.extra = 60 * lv
  } else if (kind === 'hopper') {
    e.extra = 50 * lv
    e.t = rand(0.2, 0.8)
  } else if (kind === 'ghost') {
    e.y = GROUND - 77
    e.extra = 85 * lv
    e.mode = rand(0, 6) // déphasage de l'ondulation
  } else if (kind === 'charger') e.extra = 30
  return Object.assign(e, opts)
}

function pickKind(): EnemyKind {
  const table = levelTable(level)
  let r = Math.random() * table.reduce((sum, [, w]) => sum + w, 0)
  for (const [kind, w] of table) {
    r -= w
    if (r <= 0) return kind
  }
  return 'bug'
}

function spawn() {
  const kind = pickKind()
  const x = W + 20
  const crazy = clamp((level - 2) * 0.12, 0, 0.5) // part des apparitions en groupe
  let gapExtra = 0
  if (kind === 'wall') {
    const blocks = level > 2 && Math.random() < 0.35 ? 3 : Math.random() < 0.5 ? 2 : 1
    enemies.push(makeEnemy('wall', x, { h: blocks * 22, y: GROUND - blocks * 22 }))
  } else if ((kind === 'bug' || kind === 'hopper') && Math.random() < crazy) {
    const n = Math.random() < 0.5 ? 2 : 3
    for (let i = 0; i < n; i++) enemies.push(makeEnemy(kind, x + i * 62))
    gapExtra = n * 40
  } else {
    enemies.push(makeEnemy(kind, x))
    if (kind === 'drone' || kind === 'ghost') gapExtra = 100
  }

  // Pièces : un arc au-dessus de l'obstacle, ou une ligne au sol entre deux obstacles
  const o = enemies[enemies.length - 1]
  if (o && o.kind !== 'drone' && o.kind !== 'ghost' && Math.random() < 0.45) {
    for (let i = 0; i < 3; i++) coins.push({ x: o.x + o.w / 2 + (i - 1) * 26, y: GROUND - 104 - (i === 1 ? 18 : 0), phase: i })
  } else if (Math.random() < 0.3) {
    const x0 = W + 20 + speed * 0.55
    for (let i = 0; i < 4; i++) coins.push({ x: x0 + i * 24, y: GROUND - 22, phase: i })
  }

  // Écart jusqu'au prochain obstacle : toujours assez pour atterrir et ressauter
  const gapScale = Math.max(0.8, 1 - 0.04 * (level - 1))
  nextSpawn = speed * rand(0.85, 1.55) * gapScale + 80 + gapExtra
}

/* ---------- Boss ---------- */
const bossY = (b: Boss) =>
  b.def.fly
    ? GROUND - 150 + Math.sin(b.t * 2.2) * 10
    : GROUND - b.def.h - (b.idx === 0 ? Math.abs(Math.sin(b.t * 3.4)) * 6 : 0)

const bossBox = (b: Boss) => ({ x: b.x + 8, y: b.y + 8, w: b.def.w - 16, h: b.def.h - 12 })

function spawnBoss() {
  const idx = (level - 1) % BOSSES.length
  const cycle = Math.floor((level - 1) / BOSSES.length)
  const def = BOSSES[idx] ?? BOSSES[0]!
  const hp = def.hp + cycle * 5
  boss = {
    def,
    idx,
    cycle,
    hp,
    maxHp: hp,
    x: W + 30,
    y: def.fly ? GROUND - 150 : GROUND - def.h,
    state: 'enter',
    t: 0,
    homeX: Math.max(PX + 230, W - def.w - 36),
    atk: 1,
    windup: 0,
    pending: null,
    last: null,
    queue: [],
    hurt: 0,
    away: 0,
  }
  bossInfo.value = { name: def.name, pct: 1 }
}

function delayOf(b: Boss) {
  const rage = b.hp <= b.maxHp * 0.4
  return b.def.delay * Math.pow(0.92, b.cycle) * (rage ? 0.78 : 1) + rand(0, 0.45)
}

function chooseAttack(b: Boss) {
  const rage = b.hp <= b.maxHp * 0.4
  let pool = b.def.attacks.filter((k) => k !== b.last)
  if (!pool.length) pool = b.def.attacks
  const kind = pool[Math.floor(Math.random() * pool.length)] ?? 'orb'
  b.pending = kind
  b.last = kind
  b.windup = (kind === 'charge' ? 0.85 : 0.5) * (rage ? 0.8 : 1) // le boss clignote : à toi de lire l'attaque
  playSfx(kind === 'charge' ? 'warnCharge' : 'warn')
}

function fire(b: Boss, what: 'orb' | 'bolt' | 'drone') {
  const x = b.x + 4
  const boost = 1 + b.cycle * 0.08
  // Boule au sol : à sauter. Éclair en hauteur : à laisser passer en restant au sol.
  if (what === 'orb') enemies.push(makeEnemy('orb', x, { extra: 120 * boost }))
  else if (what === 'bolt') enemies.push(makeEnemy('bolt', x, { y: GROUND - 80, extra: 170 * boost }))
  else enemies.push(makeEnemy('drone', x, { extra: 100 * boost }))
  burst(x, b.y + b.def.h / 2, 6, C.danger, 140)
  playSfx('bossShot')
}

function execAttack(b: Boss, kind: AttackKind) {
  if (kind === 'charge') {
    b.state = 'charge'
    playSfx('rumble')
    return
  }
  if (kind === 'orb') fire(b, 'orb')
  else if (kind === 'bolt') fire(b, 'bolt')
  else if (kind === 'double') {
    fire(b, 'orb')
    b.queue.push({ t: 0.6, kind: 'orb' })
  } else {
    fire(b, 'drone')
    b.queue.push({ t: 0.7, kind: 'drone' })
  }
  b.atk = delayOf(b)
}

function updateBoss(b: Boss, dt: number) {
  b.t += dt
  b.hurt = Math.max(0, b.hurt - dt)
  b.y = bossY(b)

  // Projectiles et renforts retardés (attaque « double », renforts du drone…)
  for (const q of b.queue) q.t -= dt
  const ready = b.queue.filter((q) => q.t <= 0)
  b.queue = b.queue.filter((q) => q.t > 0)
  for (const q of ready) fire(b, q.kind)

  switch (b.state) {
    case 'enter':
      b.x = Math.max(b.homeX, b.x - 260 * dt)
      if (b.x === b.homeX) {
        b.state = 'fight'
        b.atk = 0.9
      }
      break
    case 'fight':
      if (b.windup > 0) {
        b.windup -= dt
        if (b.windup <= 0 && b.pending) {
          execAttack(b, b.pending)
          b.pending = null
        }
      } else {
        b.atk -= dt
        if (b.atk <= 0) chooseAttack(b)
      }
      break
    case 'charge':
      // Le boss fonce sur toute la largeur : il faut le sauter
      b.x -= (speed + 400) * dt
      if (b.x < -b.def.w - 20) {
        b.state = 'away'
        b.away = 1.3
      }
      break
    case 'away':
      b.away -= dt
      if (b.away <= 0) {
        b.x = W + 30
        b.state = 'enter'
      }
      break
    case 'dying':
      if (Math.random() < dt * 14) burst(b.x + rand(0, b.def.w), b.y + rand(0, b.def.h), 5, Math.random() < 0.5 ? C.gold : C.danger, 200)
      if (b.t > 1.5) {
        boss = null
        bossInfo.value = null
      }
      break
  }
}

function hitBoss(b: Boss) {
  playSfx('bossHit')
  b.hp -= 1
  b.hurt = 0.12
  addPoints(5)
  burst(b.x + b.def.w / 2, b.y + b.def.h / 2, 6, C.goldSoft, 160)
  if (bossInfo.value) bossInfo.value = { name: bossInfo.value.name, pct: Math.max(0, b.hp / b.maxHp) }
  if (b.hp > 0) return

  playSfx('bossDown')
  // Boss vaincu : tout explose, puis on passe au niveau suivant
  b.state = 'dying'
  b.t = 0
  b.pending = null
  b.queue = []
  bossesDefeated++
  for (const o of enemies) burst(o.x + o.w / 2, o.y + o.h / 2, 6, C.danger, 180)
  enemies = []
  ammo = AMMO_MAX
  const bonus = 400 + 120 * level
  addPoints(bonus)
  stage = 'victory'
  stageTimer = 2.8
  showBanner('Boss vaincu !', `+${Math.round(bonus * multiplier())} pts`, 'win', 2200)
}

/* ---------- Score ---------- */
// La nuit rapporte plus, et chaque niveau ajoute un bonus
const multiplier = () => (isNight(level) ? 1.5 : 1) * (1 + 0.15 * (level - 1))
const addPoints = (base: number) => (points += base * multiplier())

function killEnemy(o: Enemy) {
  kills++
  playSfx('kill')
  addPoints(o.kind === 'charger' ? 25 : 12)
  burst(o.x + o.w / 2, o.y + o.h / 2, 12, o.kind === 'ghost' ? C.silver : C.danger, 190)
}

/* ---------- Boucle de jeu ---------- */
function overlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function currentSpeed() {
  // Sur un écran étroit on voit moins loin devant : on ralentit pour garder le même temps de réaction
  const pace = clamp(W / 760, 0.7, 1)
  const base = BASE_SPEED + (level - 1) * LEVEL_SPEED + Math.min(stageT, 40) * ACCEL
  return Math.min(MAX_SPEED, base) * pace
}

function updateStage(dt: number, step: number) {
  switch (stage) {
    case 'run':
      nextSpawn -= step
      if (nextSpawn <= 0) spawn()
      if (distance - stageStart >= stageLength(level)) {
        stage = 'warning'
        stageTimer = 2.6
        playSfx('alarm')
        showBanner('⚠ Boss en approche', (BOSSES[(level - 1) % BOSSES.length] ?? BOSSES[0]!).name, 'boss', 2500)
      }
      break
    case 'warning':
      stageTimer -= dt // plus d'ennemis : le terrain se libère avant l'arrivée du boss
      if (stageTimer <= 0) {
        spawnBoss()
        stage = 'boss'
        coinTimer = 2.5
      }
      break
    case 'boss':
      coinTimer -= dt
      if (coinTimer <= 0 && boss?.state === 'fight') {
        // Quelques pièces pour recharger l'énergie de tir
        for (let i = 0; i < 3; i++) coins.push({ x: W + 20 + i * 24, y: GROUND - 22, phase: i })
        coinTimer = 3.2
      }
      break
    case 'victory':
      stageTimer -= dt
      if (stageTimer <= 0) startLevel(level + 1)
      break
  }
}

function updateEnemies(dt: number, step: number) {
  for (const o of enemies) {
    o.age += dt
    o.hurt = Math.max(0, o.hurt - dt)
    switch (o.kind) {
      case 'wall':
        o.x -= step
        break
      case 'drone':
        o.x -= step + o.extra * dt
        o.y = o.base + Math.sin(o.age * 6) * 3
        break
      case 'hopper': {
        // Saute en continu : il faut lire son rythme
        o.x -= step + o.extra * dt
        o.vy += 1700 * dt
        o.y += o.vy * dt
        const floor = GROUND - o.h
        if (o.y >= floor) {
          o.y = floor
          o.vy = 0
          o.t -= dt
          if (o.t <= 0) {
            o.vy = -(480 + Math.random() * 120)
            o.t = rand(0.5, 0.9)
          }
        }
        break
      }
      case 'ghost':
        // Ondule de haut en bas : il traverse parfois ta hauteur
        o.x -= step + o.extra * dt
        o.y = GROUND - 77 + Math.sin(o.age * 3.2 + o.mode) * 30
        break
      case 'charger':
        // Marche, clignote, puis fonce droit sur toi
        if (o.mode === 0 && o.x < PX + 320) {
          o.mode = 1
          o.t = 0.45
          playSfx('chargerAlert')
        }
        if (o.mode === 1) {
          o.t -= dt
          if (o.t <= 0) {
            o.mode = 2
            o.extra = 300 + level * 8
          }
        }
        o.x -= step + o.extra * dt
        if (o.mode === 2 && Math.random() < 0.4) particles.push({ x: o.x + o.w, y: o.y + o.h - 4, vx: 80, vy: -20, life: 0.3, max: 0.3, size: 3, color: C.silver })
        break
      default:
        o.x -= step + o.extra * dt // bug, orb, bolt
    }
  }
  enemies = enemies.filter((o) => o.x + o.w > -40 && o.hp > 0)

  const pb = { x: PX + 5, y: player.y - PH + 4, w: PW - 10, h: PH - 6 }
  for (const o of enemies) {
    if (overlap(pb, { x: o.x + 4, y: o.y + 4, w: o.w - 8, h: o.h - 6 })) return hurtPlayer()
    if (!o.passed && o.x + o.w < PX) {
      o.passed = true
      cleared++
    }
  }
  if (boss && boss.state !== 'dying' && overlap(pb, bossBox(boss))) return hurtPlayer()
}

function updateShots(dt: number) {
  for (const s of shots) {
    s.life -= dt
    if (s.target?.alive()) {
      // Le tir se recale sur sa cible
      const dx = s.target.cx() - s.x
      const dy = s.target.cy() - s.y
      const d = Math.hypot(dx, dy) || 1
      const k = Math.min(1, 9 * dt)
      s.vx += ((dx / d) * SHOT_SPEED - s.vx) * k
      s.vy += ((dy / d) * SHOT_SPEED - s.vy) * k
    }
    s.x += s.vx * dt
    s.y += s.vy * dt
    particles.push({ x: s.x, y: s.y, vx: 0, vy: 0, life: 0.16, max: 0.16, size: 2, color: C.gold })

    const r = { x: s.x - 5, y: s.y - 4, w: 10, h: 8 }
    let used = false
    for (const o of enemies) {
      if (o.hp <= 0 || !overlap(r, { x: o.x, y: o.y, w: o.w, h: o.h })) continue
      used = true
      if (o.kind === 'wall') {
        burst(s.x, s.y, 4, C.silver, 90) // les murs encaissent
        playSfx('clink')
      } else {
        o.hp -= 1
        o.hurt = 0.12
        if (o.hp <= 0) killEnemy(o)
        else {
          burst(s.x, s.y, 5, C.goldSoft, 120)
          playSfx('hit')
        }
      }
      break
    }
    if (!used && boss && (boss.state === 'enter' || boss.state === 'fight' || boss.state === 'charge') && overlap(r, bossBox(boss))) {
      used = true
      hitBoss(boss)
    }
    s.dead = used || s.life <= 0 || s.x > W + 40 || s.y < -30 || s.y > GROUND + 6
  }
  shots = shots.filter((s) => !s.dead)
}

function update(dt: number) {
  time += dt
  stageT += dt
  speed = currentSpeed()
  const step = speed * dt
  distance += step
  ammo = Math.min(AMMO_MAX, ammo + AMMO_REGEN * dt)
  const a = Math.round(ammo * 10) / 10
  if (a !== ammoVal.value) ammoVal.value = a

  // Jour ↔ nuit : fondu progressif
  nightness += clamp(targetNight - nightness, -0.55 * dt, 0.55 * dt)
  const day = nightness < 0.5
  if (day !== isDay.value) isDay.value = day

  // Joueur
  player.vy += GRAVITY * dt
  player.y += player.vy * dt
  if (player.y >= GROUND) {
    if (!player.onGround) {
      burst(PX + PW / 2, GROUND, 4, C.silver, 90)
      playSfx('land')
    }
    player.y = GROUND
    player.vy = 0
    player.onGround = true
  }

  updateStage(dt, step)
  if (boss) updateBoss(boss, dt)
  updateEnemies(dt, step)
  if (phase.value !== 'playing') return
  updateShots(dt)

  for (const c of coins) c.x -= step
  coins = coins.filter((c) => c.x > -20)
  const pb = { x: PX + 5, y: player.y - PH + 4, w: PW - 10, h: PH - 6 }
  coins = coins.filter((c) => {
    if (!overlap(pb, { x: c.x - 8, y: c.y - 8, w: 16, h: 16 })) return true
    coinCount.value++
    playSfx('coin')
    addPoints(10)
    ammo = Math.min(AMMO_MAX, ammo + 0.5) // une pièce recharge un demi-tir
    burst(c.x, c.y, 8, C.goldSoft, 140)
    return false
  })

  points += (step / 12) * multiplier()
  const s = Math.floor(points)
  if (s !== score.value) score.value = s
}

function burst(x: number, y: number, count: number, color: string, power: number) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2)
    const v = rand(power * 0.3, power)
    const max = rand(0.35, 0.7)
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: max, max, size: rand(2, 4), color })
  }
}

function updateParticles(dt: number) {
  for (const p of particles) {
    p.life -= dt
    p.vy += 900 * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
  }
  particles = particles.filter((p) => p.life > 0)
}

/* ---------- Dessin : décor ---------- */
function drawSky(c: CanvasRenderingContext2D, night: boolean, a: number) {
  c.save()
  c.globalAlpha = a
  c.fillStyle = (night ? skies.nuit : skies.jour) ?? (night ? C.skyTop : C.daySkyTop)
  c.fillRect(0, -TOP, W, GROUND + TOP)

  if (!night) {
    // Nuages qui dérivent
    c.fillStyle = C.cloud
    for (const cl of clouds) {
      const x = ((((cl.x - distance * 0.06) % SPAN) + SPAN) % SPAN) - 60
      if (x > W) continue
      c.beginPath()
      c.ellipse(x, cl.y, 34 * cl.s, 11 * cl.s, 0, 0, Math.PI * 2)
      c.ellipse(x + 18 * cl.s, cl.y - 8 * cl.s, 20 * cl.s, 12 * cl.s, 0, 0, Math.PI * 2)
      c.ellipse(x - 16 * cl.s, cl.y - 4 * cl.s, 16 * cl.s, 9 * cl.s, 0, 0, Math.PI * 2)
      c.fill()
    }
  } else {
    // Étoiles qui scintillent
    c.fillStyle = C.silver
    for (const s of stars) {
      const x = (((s.x - distance * 0.03) % SPAN) + SPAN) % SPAN
      if (x > W) continue
      c.globalAlpha = a * (0.35 + 0.35 * Math.sin(time * 2 + s.t))
      c.fillRect(x, s.y, s.r, s.r)
    }
    c.globalAlpha = a
  }

  // Soleil ou lune dorés, avec leur halo (sous le HUD pour ne pas gêner la lecture du record)
  const mx = W - 120
  const my = 96
  const halo = c.createRadialGradient(mx, my, 10, mx, my, night ? 70 : 90)
  halo.addColorStop(0, night ? 'rgba(217, 180, 91, 0.35)' : 'rgba(240, 200, 110, 0.55)')
  halo.addColorStop(1, 'rgba(217, 180, 91, 0)')
  c.fillStyle = halo
  c.fillRect(mx - 90, my - 90, 180, 180)
  c.fillStyle = night ? C.goldSoft : C.gold
  c.beginPath()
  c.arc(mx, my, night ? 20 : 24, 0, Math.PI * 2)
  c.fill()

  drawSkyline(c, farLayer, 0.12, night ? C.far : C.dayFar, night)
  drawSkyline(c, nearLayer, 0.3, night ? C.near : C.dayNear, false)
  c.restore()
}

function drawSkyline(c: CanvasRenderingContext2D, layer: Building[], factor: number, color: string, lights: boolean) {
  const offset = (distance * factor) % SPAN
  for (let k = 0; k * SPAN - offset < W; k++) {
    for (const b of layer) {
      const x = b.x + k * SPAN - offset
      if (x > W || x + b.w < 0) continue
      c.fillStyle = color
      c.fillRect(x, GROUND - b.h, b.w, b.h)
      if (lights) {
        c.fillStyle = 'rgba(217, 180, 91, 0.45)'
        for (const [lx, ly] of b.lights) c.fillRect(x + lx, GROUND - b.h + ly, 5, 7)
      }
    }
  }
}

function drawGround(c: CanvasRenderingContext2D) {
  c.fillStyle = C.ground
  c.fillRect(0, GROUND, W, H - GROUND)
  c.fillStyle = C.gold
  c.fillRect(0, GROUND, W, 3)
  // Pavés qui défilent
  c.fillStyle = C.groundDark
  const o = distance % 32
  for (let x = -o; x < W; x += 32) {
    c.fillRect(x, GROUND + 3, 2, 22)
    c.fillRect(x + 16, GROUND + 25, 2, 23)
  }
  c.fillRect(0, GROUND + 25, W, 2)
}

/* ---------- Dessin : nuit (obscurité + lampe torche autour du joueur) ---------- */
function drawDarkness(c: CanvasRenderingContext2D, n: number) {
  const cx = PX + 110
  const cy = player.y - 40
  // La torche rétrécit à mesure qu'on avance, et vacille légèrement
  const reach = Math.min(NIGHT_RADIUS - Math.min(70, level * 7), W * 0.45)
  const r = reach + Math.sin(time * 9) * 4
  const g = c.createRadialGradient(cx, cy, 40, cx, cy, r)
  g.addColorStop(0, 'rgba(8, 3, 10, 0)')
  g.addColorStop(0.65, 'rgba(8, 3, 10, 0.5)')
  g.addColorStop(1, 'rgba(8, 3, 10, 0.95)')
  c.save()
  c.globalAlpha = n
  c.fillStyle = g
  c.fillRect(-1, -TOP, W + 2, H + TOP)
  c.restore()
}

// Dans le noir, seuls les yeux et les voyants des ennemis trahissent leur présence
function drawGlints(c: CanvasRenderingContext2D, n: number) {
  c.save()
  c.globalAlpha = n
  for (const o of enemies) {
    if (EMISSIVE.has(o.kind)) continue
    if (o.kind === 'wall') {
      c.fillStyle = 'rgba(217, 180, 91, 0.5)'
      c.fillRect(o.x, o.y, o.w, 1)
    } else if (o.kind === 'drone') {
      c.fillStyle = Math.sin(time * 8) > 0 ? C.danger : C.goldSoft
      c.beginPath()
      c.arc(o.x + 8, o.y + 11, 2.5, 0, Math.PI * 2)
      c.fill()
    } else if (o.kind === 'ghost') {
      c.fillStyle = C.danger
      c.fillRect(o.x + 7, o.y + 9, 3, 3)
      c.fillRect(o.x + 17, o.y + 9, 3, 3)
    } else if (o.kind === 'charger') {
      c.fillStyle = o.mode === 0 ? C.text : C.danger
      c.fillRect(o.x + 6, o.y + 9, 3, 3)
      c.fillRect(o.x + 13, o.y + 8, 3, 3)
    } else {
      c.fillStyle = C.text
      c.fillRect(o.x + 6, o.y + 8, 2, 2)
      c.fillRect(o.x + 12, o.y + 7, 2, 2)
    }
  }
  c.fillStyle = 'rgba(240, 220, 160, 0.55)'
  for (const coin of coins) c.fillRect(coin.x - 1, coin.y - 1, 2, 2)
  c.restore()
}

/* ---------- Dessin : personnage ---------- */
function drawPlayer(c: CanvasRenderingContext2D) {
  const R = (x: number, y: number, w: number, h: number, color: string) => {
    c.fillStyle = color
    c.fillRect(x, y, w, h)
  }
  const runningNow = phase.value === 'playing' && player.onGround
  const step = Math.floor(distance / 22) % 2
  const idleBob = phase.value === 'idle' ? Math.round(Math.sin(time * 3)) : 0
  const firing = time - lastShotAt < 0.14

  c.save()
  c.translate(Math.round(PX), Math.round(player.y - PH) + idleBob)
  // Cheveux, tête, lunettes dorées, barbe
  R(7, 0, 17, 5, C.hair)
  R(6, 3, 3, 4, C.hair)
  R(7, 4, 17, 13, C.skin)
  R(8, 8, 7, 5, C.gold)
  R(16, 8, 7, 5, C.gold)
  R(9, 9, 5, 3, C.groundDark)
  R(17, 9, 5, 3, C.groundDark)
  R(11, 14, 9, 3, C.hair)
  // Chemise violette, col argenté, bras
  R(5, 17, 21, 14, C.violet)
  R(12, 17, 7, 3, C.silver)
  const swing = runningNow ? (step ? 0 : 3) : 0
  R(2, 19 + (3 - swing), 4, 9, C.violetDark)
  if (firing) {
    // Bras tendu, éclair doré à la sortie du poing
    R(24, 19, 11, 5, C.violet)
    R(34, 19, 4, 5, C.skin)
    c.fillStyle = C.goldSoft
    c.beginPath()
    c.arc(42, 21.5, 5, 0, Math.PI * 2)
    c.fill()
  } else {
    R(24, 19 + swing, 5, 9, C.violet)
    R(24, 28 + swing, 5, 3, C.skin)
  }
  // Pantalon, jambes et chaussures dorées
  R(6, 31, 19, 5, C.groundDark)
  if (!player.onGround) {
    R(8, 36, 6, 5, C.groundDark)
    R(17, 35, 6, 5, C.groundDark)
    R(7, 40, 8, 3, C.gold)
    R(17, 39, 8, 3, C.gold)
  } else if (runningNow && step) {
    R(6, 36, 6, 6, C.groundDark)
    R(18, 36, 6, 4, C.groundDark)
    R(5, 42, 8, 2, C.gold)
    R(19, 40, 8, 2, C.gold)
  } else {
    R(8, 36, 6, 6, C.groundDark)
    R(16, 36, 6, 6, C.groundDark)
    R(7, 42, 8, 2, C.gold)
    R(16, 42, 8, 2, C.gold)
  }
  c.restore()
}

/* ---------- Dessin : ennemis ---------- */
function drawBug(c: CanvasRenderingContext2D, x: number, y: number, s: number, flash: boolean, body: string, dark: string) {
  // Bug qui marche (façon Goomba)
  c.save()
  c.translate(x, y)
  c.scale(s, s)
  const wob = Math.sin(time * 18 + x * 0.05) * 2
  c.strokeStyle = flash ? '#ffffff' : dark
  c.lineWidth = 2
  c.beginPath()
  for (const lx of [8, 17, 26]) {
    c.moveTo(lx, 16)
    c.lineTo(lx + (lx === 17 ? -wob : wob), 24)
  }
  c.moveTo(6, 6)
  c.lineTo(1, 0)
  c.moveTo(11, 4)
  c.lineTo(9, -3)
  c.stroke()
  c.fillStyle = flash ? '#ffffff' : body
  c.beginPath()
  c.ellipse(17, 12, 16, 10, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = flash ? '#ffffff' : dark
  c.fillRect(17, 3, 2, 18)
  c.fillStyle = C.text
  c.beginPath()
  c.arc(7, 9, 3, 0, Math.PI * 2)
  c.arc(13, 8, 3, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = C.skyTop
  c.fillRect(6, 9, 2, 2)
  c.fillRect(12, 8, 2, 2)
  c.restore()
}

function drawWall(c: CanvasRenderingContext2D, o: Enemy) {
  // Mur de briques (les deadlines qui s'empilent)
  for (let y = o.y; y < o.y + o.h; y += 22) {
    c.fillStyle = C.brick
    c.fillRect(o.x, y, o.w, 22)
    c.fillStyle = C.violet
    c.fillRect(o.x, y, o.w, 2)
    c.fillStyle = C.groundDark
    c.fillRect(o.x, y + 11, o.w, 2)
    c.fillRect(o.x + 13, y + 2, 2, 9)
    c.fillRect(o.x + 6, y + 13, 2, 9)
    c.fillRect(o.x + 20, y + 13, 2, 9)
    c.strokeStyle = C.skyTop
    c.lineWidth = 1
    c.strokeRect(o.x + 0.5, y + 0.5, o.w - 1, 21)
  }
  c.fillStyle = C.gold
  c.fillRect(o.x, o.y, o.w, 2)
}

function drawDrone(c: CanvasRenderingContext2D, x: number, y: number, flash: boolean) {
  const day = nightness < 0.5
  c.save()
  c.translate(x, y)
  const flap = Math.abs(Math.sin(time * 30)) * 6
  c.fillStyle = flash ? '#ffffff' : day ? 'rgba(141, 135, 152, 0.5)' : 'rgba(236, 233, 240, 0.55)'
  c.beginPath()
  c.ellipse(11, 3 - flap / 2, 9, 3 + flap / 3, -0.3, 0, Math.PI * 2)
  c.ellipse(21, 3 - flap / 2, 9, 3 + flap / 3, 0.3, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = flash ? '#ffffff' : day ? C.droneDay : C.silver
  c.beginPath()
  c.ellipse(16, 12, 15, 8, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = flash ? '#ffffff' : C.violet
  c.beginPath()
  c.ellipse(9, 11, 6, 5, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = Math.sin(time * 8) > 0 ? C.danger : C.goldSoft
  c.beginPath()
  c.arc(8, 11, 2.5, 0, Math.PI * 2)
  c.fill()
  c.restore()
}

function drawHopper(c: CanvasRenderingContext2D, o: Enemy, flash: boolean) {
  // Bug-ressort violet : il s'écrase au sol et s'étire en l'air
  const air = o.y < GROUND - o.h - 1
  c.save()
  c.translate(o.x + o.w / 2, o.y + o.h)
  c.scale(air ? 0.9 : 1.1, air ? 1.15 : 0.88)
  c.translate(-o.w / 2, -o.h)
  c.strokeStyle = flash ? '#ffffff' : C.violetDark
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(9, 18)
  for (let i = 0; i < 4; i++) c.lineTo(i % 2 ? 9 : 21, 20 + i * 1.6)
  c.moveTo(14, 2)
  c.lineTo(10, -4)
  c.moveTo(18, 2)
  c.lineTo(22, -4)
  c.stroke()
  c.fillStyle = flash ? '#ffffff' : C.violet
  c.beginPath()
  c.ellipse(15, 11, 14, 11, 0, 0, Math.PI * 2)
  c.fill()
  // Yeux qui louchent
  c.fillStyle = C.text
  c.beginPath()
  c.arc(10, 9, 4, 0, Math.PI * 2)
  c.arc(20, 9, 4, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = C.skyTop
  c.fillRect(12, 8, 2, 2)
  c.fillRect(16, 8, 2, 2)
  c.fillStyle = C.goldSoft
  c.fillRect(9, 16, 12, 2)
  c.restore()
}

function drawGhost(c: CanvasRenderingContext2D, o: Enemy, flash: boolean) {
  const w1 = Math.sin(time * 10) * 2
  const w2 = Math.sin(time * 10 + 2) * 2
  const shape = () => {
    c.beginPath()
    c.moveTo(0, 26)
    c.lineTo(0, 12)
    c.quadraticCurveTo(0, 0, 14, 0)
    c.quadraticCurveTo(28, 0, 28, 12)
    c.lineTo(28, 26)
    c.lineTo(23, 21 + w1)
    c.lineTo(18, 26)
    c.lineTo(13, 21 + w2)
    c.lineTo(8, 26)
    c.lineTo(4, 22)
    c.closePath()
    c.fill()
  }
  c.save()
  c.translate(o.x, o.y)
  // Léger décalage de couleur : un fantôme qui « bugue »
  c.fillStyle = 'rgba(140, 77, 153, 0.6)'
  c.translate(-3 + Math.sin(time * 22) * 1.5, 0)
  shape()
  c.translate(3 - Math.sin(time * 22) * 1.5, 0)
  c.fillStyle = flash ? '#ffffff' : 'rgba(200, 197, 208, 0.9)'
  shape()
  c.fillStyle = C.dangerDark
  c.fillRect(7, 9, 4, 5)
  c.fillRect(17, 9, 4, 5)
  c.fillStyle = C.danger
  c.fillRect(8, 10, 2, 3)
  c.fillRect(18, 10, 2, 3)
  c.restore()
}

function drawCharger(c: CanvasRenderingContext2D, o: Enemy, flash: boolean) {
  // Marche (orange), clignote (alerte), puis fonce (rouge)
  const blink = o.mode === 1 && Math.floor(time * 20) % 2 === 0
  const body = flash || blink ? '#ffffff' : o.mode === 2 ? '#ff5a3d' : C.orange
  c.save()
  c.translate(o.x, o.y)
  if (o.mode === 2) {
    c.strokeStyle = 'rgba(236, 233, 240, 0.5)'
    c.lineWidth = 2
    c.beginPath()
    for (const ly of [8, 16, 24]) {
      c.moveTo(42, ly)
      c.lineTo(58, ly)
    }
    c.stroke()
  }
  const wob = Math.sin(time * 26) * 2.5
  c.strokeStyle = C.dangerDark
  c.lineWidth = 2.5
  c.beginPath()
  for (const lx of [10, 20, 30]) {
    c.moveTo(lx, 22)
    c.lineTo(lx + (lx === 20 ? -wob : wob), 30)
  }
  c.stroke()
  c.fillStyle = body
  c.beginPath()
  c.ellipse(21, 16, 19, 12, 0, 0, Math.PI * 2)
  c.fill()
  // Cornes argentées
  c.fillStyle = C.silver
  c.beginPath()
  c.moveTo(3, 11)
  c.lineTo(-5, 3)
  c.lineTo(10, 7)
  c.closePath()
  c.moveTo(12, 6)
  c.lineTo(8, -4)
  c.lineTo(18, 4)
  c.closePath()
  c.fill()
  // Yeux furieux
  c.fillStyle = C.text
  c.beginPath()
  c.arc(9, 12, 3.2, 0, Math.PI * 2)
  c.arc(16, 11, 3.2, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = C.danger
  c.fillRect(8, 12, 2, 2)
  c.fillRect(15, 11, 2, 2)
  c.strokeStyle = C.dangerDark
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(5, 7)
  c.lineTo(11, 9)
  c.moveTo(20, 6)
  c.lineTo(14, 8)
  c.stroke()
  c.restore()
}

function drawOrb(c: CanvasRenderingContext2D, o: Enemy) {
  const cx = o.x + 9
  const cy = o.y + 9
  c.fillStyle = 'rgba(224, 96, 122, 0.28)'
  c.beginPath()
  c.arc(cx, cy, 15, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = C.danger
  c.beginPath()
  c.arc(cx, cy, 9, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = C.goldSoft
  c.beginPath()
  c.arc(cx, cy, 4, 0, Math.PI * 2)
  c.fill()
  for (let i = 0; i < 4; i++) {
    const a = time * 8 + (i * Math.PI) / 2
    c.fillRect(cx + Math.cos(a) * 12 - 1.5, cy + Math.sin(a) * 12 - 1.5, 3, 3)
  }
}

function drawBolt(c: CanvasRenderingContext2D, o: Enemy) {
  c.fillStyle = 'rgba(240, 220, 160, 0.3)'
  c.beginPath()
  c.ellipse(o.x + 14, o.y + 5, 18, 8, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = C.goldSoft
  c.beginPath()
  c.moveTo(o.x, o.y + 5)
  c.lineTo(o.x + 10, o.y)
  c.lineTo(o.x + 8, o.y + 4)
  c.lineTo(o.x + 28, o.y + 4)
  c.lineTo(o.x + 28, o.y + 6)
  c.lineTo(o.x + 8, o.y + 6)
  c.lineTo(o.x + 10, o.y + 10)
  c.closePath()
  c.fill()
}

function drawEnemy(c: CanvasRenderingContext2D, o: Enemy) {
  const flash = o.hurt > 0
  switch (o.kind) {
    case 'bug':
      drawBug(c, o.x, o.y, 1, flash, C.danger, C.dangerDark)
      break
    case 'wall':
      drawWall(c, o)
      break
    case 'drone':
      drawDrone(c, o.x, o.y, flash)
      break
    case 'hopper':
      drawHopper(c, o, flash)
      break
    case 'ghost':
      drawGhost(c, o, flash)
      break
    case 'charger':
      drawCharger(c, o, flash)
      break
    case 'orb':
      drawOrb(c, o)
      break
    case 'bolt':
      drawBolt(c, o)
      break
  }
}

function drawCoin(c: CanvasRenderingContext2D, coin: Coin) {
  // Pièce qui tourne sur elle-même
  const s = Math.max(0.18, Math.abs(Math.cos(time * 5 + coin.phase)))
  c.fillStyle = C.gold
  c.beginPath()
  c.ellipse(coin.x, coin.y, 8 * s, 8, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = C.goldSoft
  c.beginPath()
  c.ellipse(coin.x, coin.y, 4.5 * s, 5, 0, 0, Math.PI * 2)
  c.fill()
}

/* ---------- Dessin : boss ---------- */
function drawBoss(c: CanvasRenderingContext2D, b: Boss) {
  const dying = b.state === 'dying'
  const flash = b.hurt > 0 || (dying && Math.floor(time * 20) % 2 === 0)
  const w = b.def.w
  const h = b.def.h

  c.save()
  // Annonce d'attaque : halo rouge qui pulse, et le boss tremble avant de charger
  if (b.windup > 0) {
    const pulse = 0.25 + 0.2 * Math.sin(time * 30)
    const g = c.createRadialGradient(b.x + w / 2, b.y + h / 2, 10, b.x + w / 2, b.y + h / 2, w)
    g.addColorStop(0, `rgba(224, 96, 122, ${pulse + 0.15})`)
    g.addColorStop(1, 'rgba(224, 96, 122, 0)')
    c.fillStyle = g
    c.fillRect(b.x - w / 2, b.y - h / 2, w * 2, h * 2)
  }
  const tremble = b.windup > 0 && b.pending === 'charge' ? Math.sin(time * 80) * 2.5 : 0
  c.translate(b.x + tremble + (dying ? rand(-3, 3) : 0), b.y)

  const fill = (color: string) => (c.fillStyle = flash ? '#ffffff' : color)

  if (b.idx === 0) {
    // Mega Bug : le bug du niveau, en version géante et furieuse
    const s = w / 34
    drawBug(c, 0, h - 24 * s, s, flash, C.danger, C.dangerDark)
    c.strokeStyle = C.skyTop
    c.lineWidth = 4
    c.beginPath()
    c.moveTo(9, 19)
    c.lineTo(25, 25)
    c.moveTo(41, 19)
    c.lineTo(26, 24)
    c.stroke()
  } else if (b.idx === 1) {
    // Drone Mère : grande soucoupe argentée, dôme violet, œil rouge
    const flap = Math.abs(Math.sin(time * 28)) * 8
    c.fillStyle = flash ? '#ffffff' : 'rgba(236, 233, 240, 0.55)'
    c.beginPath()
    c.ellipse(14, 12 - flap / 2, 16, 4 + flap / 3, 0, 0, Math.PI * 2)
    c.ellipse(82, 12 - flap / 2, 16, 4 + flap / 3, 0, 0, Math.PI * 2)
    c.fill()
    fill(C.silver)
    c.beginPath()
    c.ellipse(48, 36, 46, 15, 0, 0, Math.PI * 2)
    c.fill()
    fill(C.droneDay)
    c.beginPath()
    c.ellipse(48, 42, 40, 8, 0, 0, Math.PI * 2)
    c.fill()
    fill(C.violet)
    c.beginPath()
    c.arc(48, 30, 22, Math.PI, 0)
    c.fill()
    c.fillStyle = Math.sin(time * 8) > 0 ? C.danger : C.goldSoft
    c.beginPath()
    c.arc(48, 25, 7, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = C.skyTop
    c.beginPath()
    c.arc(48, 25, 3, 0, Math.PI * 2)
    c.fill()
    for (let i = 0; i < 5; i++) {
      c.fillStyle = (Math.floor(time * 6) + i) % 2 ? C.goldSoft : C.danger
      c.beginPath()
      c.arc(14 + i * 17, 41, 3, 0, Math.PI * 2)
      c.fill()
    }
    c.strokeStyle = C.silver
    c.lineWidth = 2
    c.beginPath()
    c.moveTo(48, 12)
    c.lineTo(48, 2)
    c.stroke()
    c.fillStyle = C.gold
    c.beginPath()
    c.arc(48, 2, 3, 0, Math.PI * 2)
    c.fill()
  } else if (b.idx === 2) {
    // Virus Fou : boule à pointes qui tourne (de plus en plus vite quand il charge), yeux déments
    const rot = time * (b.state === 'charge' ? 14 : 1.6)
    fill(C.violetDark)
    for (let i = 0; i < 12; i++) {
      const a = rot + (i * Math.PI) / 6
      c.beginPath()
      c.moveTo(35 + Math.cos(a - 0.2) * 22, 35 + Math.sin(a - 0.2) * 22)
      c.lineTo(35 + Math.cos(a) * 34, 35 + Math.sin(a) * 34)
      c.lineTo(35 + Math.cos(a + 0.2) * 22, 35 + Math.sin(a + 0.2) * 22)
      c.fill()
    }
    fill(C.violet)
    c.beginPath()
    c.arc(35, 35, 25, 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = 'rgba(224, 96, 122, 0.6)'
    c.lineWidth = 2
    c.beginPath()
    c.arc(35 + Math.sin(time * 25) * 2, 35, 25, 0, Math.PI * 2)
    c.stroke()
    c.fillStyle = C.text
    c.beginPath()
    c.arc(27, 30, 7, 0, Math.PI * 2)
    c.arc(43, 30, 7, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = C.skyTop
    c.beginPath()
    c.arc(27 + Math.sin(time * 7) * 3, 30 + Math.cos(time * 9) * 3, 3, 0, Math.PI * 2)
    c.arc(43 + Math.cos(time * 8) * 3, 30 + Math.sin(time * 6) * 3, 3, 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = C.skyTop
    c.lineWidth = 3
    c.beginPath()
    c.moveTo(21, 46)
    for (let i = 0; i < 6; i++) c.lineTo(21 + (i + 1) * 5.6, i % 2 ? 46 : 53)
    c.stroke()
  } else {
    // Roi des Bugs : scarabée doré, couronne et yeux rouges
    c.strokeStyle = flash ? '#ffffff' : C.dangerDark
    c.lineWidth = 3
    const wob = Math.sin(time * 14) * 3
    c.beginPath()
    for (const lx of [28, 46, 64, 80]) {
      c.moveTo(lx, 68)
      c.lineTo(lx + (lx % 2 ? wob : -wob), 82)
    }
    c.stroke()
    fill('#b8923e')
    c.beginPath()
    c.ellipse(52, 56, 42, 24, 0, 0, Math.PI * 2)
    c.fill()
    fill('#8a6a1f')
    c.fillRect(51, 34, 3, 44)
    fill(C.violet)
    for (const [sx, sy] of [[66, 50], [78, 60], [40, 62], [62, 68]] as const) {
      c.beginPath()
      c.arc(sx, sy, 4, 0, Math.PI * 2)
      c.fill()
    }
    fill('#8a6a1f')
    c.beginPath()
    c.ellipse(18, 52, 17, 15, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = C.danger
    c.beginPath()
    c.arc(12, 48, 4, 0, Math.PI * 2)
    c.arc(24, 46, 4, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = C.text
    c.fillRect(11, 47, 2, 2)
    c.fillRect(23, 45, 2, 2)
    // Couronne
    fill(C.gold)
    c.beginPath()
    c.moveTo(4, 36)
    c.lineTo(6, 18)
    c.lineTo(14, 28)
    c.lineTo(20, 12)
    c.lineTo(26, 28)
    c.lineTo(34, 18)
    c.lineTo(36, 36)
    c.closePath()
    c.fill()
    c.fillStyle = C.danger
    c.beginPath()
    c.arc(20, 30, 3, 0, Math.PI * 2)
    c.fill()
  }

  if (b.windup > 0) {
    c.fillStyle = C.danger
    c.font = '700 22px sans-serif'
    c.textAlign = 'center'
    c.fillText('!', w / 2, -8)
  }
  c.restore()
}

function drawShots(c: CanvasRenderingContext2D) {
  for (const s of shots) {
    const a = Math.atan2(s.vy, s.vx)
    c.save()
    c.translate(s.x, s.y)
    c.rotate(a)
    c.fillStyle = 'rgba(240, 220, 160, 0.3)'
    c.beginPath()
    c.ellipse(0, 0, 11, 6, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = C.goldSoft
    c.fillRect(-7, -2, 14, 4)
    c.fillStyle = '#ffffff'
    c.fillRect(1, -1, 6, 2)
    c.restore()
  }
}

function draw() {
  const c = ctx
  if (!c) return
  const n = nightness
  if (n < 1) drawSky(c, false, 1)
  if (n > 0) drawSky(c, true, n)
  drawGround(c)
  for (const coin of coins) drawCoin(c, coin)
  for (const o of enemies) if (!EMISSIVE.has(o.kind)) drawEnemy(c, o)
  if (boss) drawBoss(c, boss)
  if (phase.value !== 'over') drawPlayer(c)
  for (const o of enemies) if (EMISSIVE.has(o.kind)) drawEnemy(c, o)
  if (n > 0) {
    drawDarkness(c, n)
    drawGlints(c, n)
    // Le boss et ses projectiles sont lumineux : visibles même au fond de la nuit
    c.save()
    c.globalAlpha = n
    if (boss) drawBoss(c, boss)
    for (const o of enemies) if (EMISSIVE.has(o.kind)) drawEnemy(c, o)
    c.restore()
  }
  drawShots(c)
  for (const p of particles) {
    c.globalAlpha = Math.max(0, p.life / p.max)
    c.fillStyle = p.color
    c.fillRect(p.x, p.y, p.size, p.size)
  }
  c.globalAlpha = 1
}

/* ---------- Boucle (active seulement quand le jeu est visible) ---------- */
function loop(now: number) {
  const dt = Math.min((now - last) / 1000, 1 / 30)
  last = now
  if (phase.value === 'playing') update(dt)
  else if (phase.value === 'idle') {
    time += dt
    distance += 60 * dt // le décor défile doucement en attendant
  } else time += dt
  updateParticles(dt)
  draw()
  if (running) frame = requestAnimationFrame(loop)
}

function ensureLoop() {
  if (running) return
  running = true
  last = performance.now()
  frame = requestAnimationFrame(loop)
}

function stopLoop() {
  running = false
  cancelAnimationFrame(frame)
}

let visibility: IntersectionObserver | null = null

onMounted(() => {
  ctx = canvas.value?.getContext('2d') ?? null
  resize()
  resizeObserver = new ResizeObserver(resize)
  if (canvas.value) resizeObserver.observe(canvas.value)
  visibility = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) ensureLoop()
      else {
        // On met en pause si le joueur fait défiler la page pendant une partie
        if (phase.value === 'playing') phase.value = 'paused'
        stopLoop()
        draw()
      }
    },
    { threshold: 0.3 },
  )
  if (arena.value) visibility.observe(arena.value)
})

onBeforeUnmount(() => {
  stopLoop()
  clearTimeout(bannerTimer)
  clearTimeout(shakeTimer)
  resizeObserver?.disconnect()
  visibility?.disconnect()
})

// Outil de test réservé au mode développement (absent du site publié)
if (import.meta.env.DEV) {
  Object.assign(window, {
    __runner: {
      god: (v = true) => (god = v),
      toLevel(n: number) {
        if (phase.value !== 'playing') start()
        enemies = []
        boss = null
        bossInfo.value = null
        startLevel(n)
        nightness = targetNight
        isDay.value = !isNight(n)
      },
      toBoss() {
        stageStart = distance - stageLength(level) - 1
      },
      weaken() {
        if (boss) boss.hp = Math.min(boss.hp, 2)
      },
      // Fait avancer la partie sans attendre l'affichage ; fire = tire automatiquement toutes les 0,25 s
      sim(seconds: number, fire = false) {
        const frames = Math.round(seconds * 60)
        for (let i = 0; i < frames && phase.value === 'playing'; i++) {
          if (fire && i % 15 === 0) {
            canShootAt = 0
            shoot()
          }
          update(1 / 60)
          updateParticles(1 / 60)
        }
        draw()
      },
      shoot,
      jump,
      sfx: playSfx,
      audio: () => ({ state: audioState(), muted: soundMuted.value }),
      snap: () => ({
        phase: phase.value,
        level,
        stage,
        night: Number(nightness.toFixed(2)),
        speed: Math.round(speed),
        score: Math.floor(points),
        ammo: Number(ammo.toFixed(1)),
        shots: shots.length,
        cooldown: Math.max(0, Math.round(canShootAt - performance.now())),
        grounded: player.onGround,
        tapAgo: Math.round(performance.now() - lastTap),
        kills,
        bosses: bossesDefeated,
        boss: boss && { name: boss.def.name, hp: boss.hp, state: boss.state, x: Math.round(boss.x) },
        enemies: enemies.map((o) => o.kind),
        W: Math.round(W),
      }),
    },
  })
}
</script>

<template>
  <section id="jeu" class="section">
    <div class="container">
      <SectionHeading
        eyebrow="Pause café"
        title="Le sprint"
        highlight="du développeur."
        text="Clique pour sauter, double-clique pour tirer. Passe du jour à la nuit, affronte des bugs de plus en plus fous et abats le boss de chaque niveau."
        center
      />

      <div
        ref="arena"
        class="arena"
        :class="{ shake, playing: phase === 'playing', day: isDay }"
        tabindex="0"
        role="application"
        aria-label="Mini-jeu de course : clique ou appuie sur Espace pour sauter, double-clique ou touche F pour tirer"
        v-reveal.scale
        @pointerdown="onPointer"
        @keydown="onKey"
        @contextmenu.prevent
      >
        <canvas ref="canvas" aria-hidden="true"></canvas>

        <div class="hud" aria-hidden="true">
          <div class="hud-block">
            <small>Score</small>
            <strong class="score">{{ score }}</strong>
          </div>
          <div class="hud-block coins">
            <small>Pièces</small>
            <strong><i class="coin"></i>{{ coinCount }}</strong>
          </div>
          <div class="hud-block">
            <small>Tirs</small>
            <span class="pips"><i v-for="(p, i) in pips" :key="i" :style="{ '--f': p }"></i></span>
          </div>
          <span class="mode-badge">Niv. {{ levelShown }} {{ isDay ? '☀' : '☾' }}</span>
          <div class="hud-block right">
            <small>Record</small>
            <strong>{{ best.score }}</strong>
          </div>
        </div>

        <div v-if="bossInfo" class="boss-bar" aria-hidden="true">
          <span class="name">{{ bossInfo.name }}</span>
          <span class="track"><span class="fill" :style="{ transform: `scaleX(${bossInfo.pct})` }"></span></span>
        </div>

        <Transition name="banner">
          <div v-if="banner" class="banner" :class="banner.tone" aria-live="polite">
            <strong>{{ banner.title }}</strong>
            <span>{{ banner.sub }}</span>
          </div>
        </Transition>

        <Transition name="overlay">
          <div v-if="phase === 'idle'" class="overlay">
            <p class="kicker">🏃 Mini-jeu</p>
            <h3>Prêt pour le sprint&nbsp;?</h3>
            <ul class="controls">
              <li><kbd>Clic</kbd> sauter</li>
              <li><kbd>Double-clic</kbd> tirer</li>
            </ul>
            <ul class="legend">
              <li><span class="swatch bug"></span> Bugs : saute ou tire</li>
              <li><span class="swatch wall"></span> Murs : saute</li>
              <li><span class="swatch coin"></span> Pièce <b>+10</b> et recharge</li>
            </ul>
            <p class="hint">☀ Jour → ☾ Nuit → … Un boss t'attend à la fin de chaque niveau.</p>
            <button type="button" class="btn btn-primary" @pointerdown.stop @keydown.stop @click="tap">
              Lancer la course ▶
            </button>
            <p class="hint small">Sur ordinateur : clic droit ou touche F pour tirer sans sauter · M pour couper le son.</p>
          </div>
        </Transition>

        <Transition name="overlay">
          <div v-if="phase === 'paused'" class="overlay">
            <p class="kicker">Pause</p>
            <h3>On souffle un peu ?</h3>
            <button type="button" class="btn btn-primary" @pointerdown.stop @keydown.stop @click="tap">
              Reprendre ▶
            </button>
          </div>
        </Transition>

        <Transition name="overlay">
          <div v-if="phase === 'over'" class="overlay" aria-live="polite">
            <p class="kicker">Bug en production · niveau {{ final.level }}</p>
            <p class="final"><strong>{{ score }}</strong> pts</p>
            <p v-if="newBest" class="record">★ Nouveau record !</p>
            <h3>{{ rank.title }}</h3>
            <p class="rank-text">{{ rank.text }}</p>
            <ul class="recap">
              <li><b>{{ final.bosses }}</b> {{ final.bosses > 1 ? 'boss vaincus' : 'boss vaincu' }}</li>
              <li><b>{{ final.kills }}</b> {{ final.kills > 1 ? 'bugs abattus' : 'bug abattu' }}</li>
              <li><b>{{ coinCount }}</b> pièces</li>
              <li><b>{{ final.meters }}</b> m parcourus</li>
            </ul>
            <div class="actions">
              <button type="button" class="btn btn-primary" @pointerdown.stop @keydown.stop @click="tap">
                Rejouer ↻
              </button>
              <a href="#contact" class="btn btn-ghost" @pointerdown.stop @keydown.stop>Besoin d'un vrai debug ?</a>
            </div>
          </div>
        </Transition>

        <button
          type="button"
          class="sound-btn"
          :aria-pressed="!soundMuted"
          :aria-label="soundMuted ? 'Activer le son' : 'Couper le son'"
          :title="soundMuted ? 'Activer le son (M)' : 'Couper le son (M)'"
          @pointerdown.stop
          @keydown.stop
          @click="toggleSound"
        >
          <AppIcon :name="soundMuted ? 'mute' : 'volume'" :size="18" />
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.arena {
  position: relative;
  height: clamp(290px, 46vw, 380px);
  border-radius: 28px;
  overflow: hidden;
  background: #170a1b;
  border: 1.5px solid var(--border);
  color: #ece9f0;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  outline: none;
}

.arena:focus-visible {
  box-shadow: 0 0 0 3px var(--gold);
}

.arena.shake {
  animation: shake 0.45s;
}

@keyframes shake {
  20% { translate: -10px 0; }
  40% { translate: 8px 0; }
  60% { translate: -6px 0; }
  80% { translate: 4px 0; }
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* ---------- HUD ---------- */
.hud {
  position: absolute;
  inset: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  padding: 14px 20px;
  pointer-events: none;
}

.hud-block {
  display: grid;
  line-height: 1.1;
}

.hud-block.right {
  margin-left: auto;
  text-align: right;
}

.hud small {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(236, 233, 240, 0.6);
  transition: color 0.6s;
}

.hud strong {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display);
  font-size: 22px;
  transition: color 0.6s;
}

.score {
  color: var(--gold);
  min-width: 3ch;
}

.coin {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--gold-soft) 0 35%, var(--gold) 40%);
}

.mode-badge {
  align-self: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 11px;
  border: 1px solid rgba(232, 222, 240, 0.22);
  color: rgba(236, 233, 240, 0.8);
  transition: color 0.6s, border-color 0.6s;
}

/* Réserve d'énergie de tir : cinq pastilles qui se remplissent */
.pips {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 22px;
}

.pips i {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  border: 1px solid rgba(232, 222, 240, 0.4);
  background: linear-gradient(90deg, var(--gold) calc(var(--f) * 100%), transparent 0);
  transition: border-color 0.6s;
}

/* De jour, le ciel est clair : le HUD passe en aubergine pour rester lisible */
.day .hud small {
  color: rgba(42, 16, 48, 0.6);
}

.day .hud strong {
  color: #2a1030;
}

.day .hud .score {
  color: #8a6a1f;
}

.day .mode-badge {
  border-color: rgba(42, 16, 48, 0.25);
  color: #2a1030;
}

.day .pips i {
  border-color: rgba(42, 16, 48, 0.4);
}

/* ---------- Barre de vie du boss ---------- */
.boss-bar {
  position: absolute;
  left: 50%;
  top: 60px;
  translate: -50% 0;
  width: min(66%, 340px);
  display: grid;
  gap: 4px;
  text-align: center;
  pointer-events: none;
}

.boss-bar .name {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #ff7a86;
}

.day .boss-bar .name {
  color: #a02a42;
}

.boss-bar .track {
  height: 8px;
  border-radius: 99px;
  background: rgba(23, 10, 27, 0.6);
  border: 1px solid rgba(232, 222, 240, 0.3);
  overflow: hidden;
}

.boss-bar .fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #e0607a, var(--gold));
  transform-origin: left;
  transition: transform 0.25s;
}

/* ---------- Bouton son ---------- */
.sound-btn {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 6;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(232, 222, 240, 0.3);
  background: rgba(23, 10, 27, 0.6);
  color: #ece9f0;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: background 0.25s, color 0.25s, border-color 0.25s, scale 0.25s var(--ease-out);
}

.sound-btn:hover {
  background: var(--gold);
  border-color: var(--gold);
  color: var(--plum-deep);
  scale: 1.1;
}

.sound-btn[aria-pressed='false'] {
  color: rgba(236, 233, 240, 0.55);
}

/* ---------- Bannières ---------- */
.banner {
  position: absolute;
  left: 50%;
  top: 52%;
  translate: -50% -50%;
  z-index: 3;
  display: grid;
  justify-items: center;
  gap: 4px;
  max-width: 88%;
  padding: 10px 24px;
  text-align: center;
  border-radius: 16px;
  background: rgba(23, 10, 27, 0.7);
  border: 1px solid rgba(232, 222, 240, 0.2);
  backdrop-filter: blur(4px);
  pointer-events: none;
}

.banner strong {
  font-family: var(--font-display);
  font-size: clamp(1.3rem, 3.6vw, 2rem);
  letter-spacing: -0.03em;
  color: var(--gold);
}

.banner span {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(236, 233, 240, 0.85);
}

.banner.boss strong {
  color: #ff7a86;
}

.banner.win strong {
  color: var(--gold-soft);
}

.banner-enter-active,
.banner-leave-active {
  transition: opacity 0.35s, transform 0.45s var(--ease-out);
}

.banner-enter-from {
  opacity: 0;
  transform: scale(0.85);
}

.banner-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ---------- Écrans ---------- */
.overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 10px;
  padding: 24px;
  text-align: center;
  background: rgba(23, 10, 27, 0.78);
  backdrop-filter: blur(4px);
  cursor: default;
}

.kicker {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gold);
}

.overlay h3 {
  font-size: clamp(1.6rem, 4vw, 2.4rem);
}

.controls {
  list-style: none;
  margin: 2px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 18px;
  font-size: 14px;
  color: rgba(236, 233, 240, 0.9);
}

kbd {
  margin-right: 4px;
  padding: 3px 9px;
  border-radius: 7px;
  border: 1px solid rgba(232, 222, 240, 0.3);
  background: rgba(255, 255, 255, 0.07);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--gold);
}

.legend {
  list-style: none;
  margin: 0 0 4px;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 18px;
  font-size: 13px;
  color: rgba(236, 233, 240, 0.8);
}

.legend li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend b {
  color: var(--gold);
}

.swatch {
  display: inline-block;
  width: 18px;
  height: 14px;
}

.swatch.bug {
  border-radius: 50% 50% 40% 40%;
  background: #e0607a;
}

.swatch.wall {
  width: 14px;
  height: 18px;
  background: #5a2a63;
  border-top: 2px solid var(--gold);
}

.swatch.coin {
  width: 14px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--gold-soft) 0 35%, var(--gold) 40%);
}

.hint {
  font-family: var(--font-mono);
  font-size: 11px;
  color: rgba(236, 233, 240, 0.65);
}

.hint.small {
  font-size: 10px;
  color: rgba(236, 233, 240, 0.45);
}

.final {
  font-family: var(--font-display);
  font-size: 18px;
  color: rgba(236, 233, 240, 0.7);
}

.final strong {
  font-size: clamp(3rem, 8vw, 4.8rem);
  line-height: 1;
  color: var(--gold);
  letter-spacing: -0.04em;
}

.record {
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--gold);
  color: var(--plum-deep);
  font-weight: 700;
  font-size: 13px;
}

.rank-text {
  color: rgba(236, 233, 240, 0.7);
  max-width: 360px;
}

.recap {
  list-style: none;
  margin: 2px 0 6px;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.recap li {
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid rgba(232, 222, 240, 0.16);
  font-size: 13px;
  color: rgba(236, 233, 240, 0.75);
}

.recap b {
  color: #fff;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.overlay .btn-ghost {
  color: #ece9f0;
  border-color: rgba(232, 222, 240, 0.25);
}

.overlay .btn-primary:hover {
  box-shadow: 4px 4px 0 #ece9f0;
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .hud {
    gap: 6px 14px;
    padding: 10px 14px;
  }
  .hud strong {
    font-size: 18px;
  }
  .hud-block.coins,
  .legend,
  .hint.small,
  .rank-text,
  .recap {
    display: none;
  }
  .pips i {
    width: 8px;
    height: 8px;
  }
  .overlay {
    gap: 6px;
    padding: 12px;
  }
  .overlay h3 {
    font-size: 1.5rem;
  }
  .kicker {
    font-size: 11px;
    letter-spacing: 0.08em;
  }
  .sound-btn {
    right: 8px;
    bottom: 8px;
    width: 32px;
    height: 32px;
  }
  .final strong {
    font-size: 2.6rem;
  }
  .overlay .btn {
    padding: 10px 18px;
    font-size: 14px;
  }
  .banner {
    padding: 8px 16px;
  }
}
</style>
