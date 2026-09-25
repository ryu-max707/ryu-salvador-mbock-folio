<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'
import CountUp from './CountUp.vue'
import SectionHeading from './SectionHeading.vue'
import { profile, stats } from '@/data/profile'
import { cvFileName, openCv } from '@/composables/useCv'

// Photo : le grain bichrome se propage depuis l'endroit où la souris entre
const photoOn = ref(false)
function setSpot(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
}
function onPhotoDown(e: PointerEvent) {
  // Au tactile il n'y a pas de survol : un appui active / désactive l'effet
  if (e.pointerType === 'mouse') return
  setSpot(e)
  photoOn.value = !photoOn.value
}
</script>

<template>
  <section id="apropos" class="section about">
    <div class="container layout">
      <div class="visual" v-reveal.scale>
        <div class="frame" v-parallax="-0.05">
          <div class="frame-back"></div>
          <div
            class="photo"
            :class="{ on: photoOn }"
            @pointerenter="setSpot"
            @pointermove="setSpot"
            @pointerdown="onPhotoDown"
          >
            <template v-if="profile.photo">
              <img class="base" :src="profile.photo" :alt="`Portrait de ${profile.firstName} ${profile.lastName}`" loading="lazy" />
              <div class="fx" aria-hidden="true">
                <img :src="profile.photo" alt="" loading="lazy" />
                <span class="noise"></span>
              </div>
            </template>
            <div v-else class="monogram">{{ profile.initials }}</div>
            <span class="hint" aria-hidden="true">↳ survole-moi</span>
          </div>
        </div>

        <div class="sticker" v-parallax="0.12" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <defs>
              <path id="sticker-circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
            </defs>
            <text>
              <textPath href="#sticker-circle" textLength="286" lengthAdjust="spacing">
                DÉVELOPPEUR ✦ FORMATEUR ✦ DÉVELOPPEUR ✦ FORMATEUR ✦
              </textPath>
            </text>
          </svg>
          <span class="star">✳</span>
        </div>

        <div class="float code" v-parallax="0.1">
          <div class="dots"><i></i><i></i><i></i></div>
          <pre><code><span class="k">const</span> ryu = {
  role: [<span class="s">'dev'</span>, <span class="s">'formateur'</span>],
  stack: <span class="s">'Laravel · Flutter'</span>,
  mission: <span class="s">'transmettre'</span>
}</code></pre>
        </div>

        <div class="float location">
          <AppIcon name="pin" :size="16" /> {{ profile.location }}
        </div>
      </div>

      <div class="content">
        <SectionHeading
          eyebrow="À propos"
          title="Le code pour construire,"
          highlight="la pédagogie pour transmettre."
          :text="profile.about"
        />

        <ul class="stats">
          <li v-for="(stat, i) in stats" :key="stat.label" v-reveal="i * 110">
            <strong class="value">
              <CountUp :to="stat.value" /><span class="suffix">{{ stat.suffix }}</span>
            </strong>
            <span class="label">{{ stat.label }}</span>
            <span class="detail">{{ stat.detail }}</span>
          </li>
        </ul>

        <div v-if="profile.cvUrl" class="cv-actions" v-reveal="300">
          <button v-magnetic type="button" class="btn btn-primary" @click="openCv">
            <AppIcon name="file" :size="18" /> Voir mon CV
          </button>
          <a v-magnetic :href="profile.cvUrl" :download="cvFileName" class="btn btn-ghost">
            <AppIcon name="download" :size="18" /> Télécharger (PDF)
          </a>
        </div>
      </div>
    </div>

    <!-- Filtre bichromie marine → bleu → citron appliqué à la photo au survol -->
    <svg class="defs" width="0" height="0" aria-hidden="true">
      <filter id="duotone-ryu" color-interpolation-filters="sRGB">
        <feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0.02 0.14 0.78 0.94" />
          <feFuncG type="table" tableValues="0.055 0.27 0.95 0.99" />
          <feFuncB type="table" tableValues="0.13 0.78 0.21 0.75" />
        </feComponentTransfer>
      </filter>
    </svg>
  </section>
</template>

<style scoped>
.defs {
  position: absolute;
}

.layout {
  display: grid;
  gap: 88px;
  align-items: center;
}

@media (min-width: 960px) {
  .layout {
    grid-template-columns: 0.8fr 1.2fr;
    gap: 96px;
  }
}

.content :deep(.heading) {
  margin-bottom: 40px;
}

/* ---------- Photo ---------- */
.visual {
  position: relative;
  justify-self: center;
  width: min(100%, 400px);
  padding: 0 18px 18px 0;
}

.frame {
  position: relative;
  aspect-ratio: 3 / 4;
}

.frame-back {
  position: absolute;
  inset: 0;
  border-radius: 28px;
  background: var(--lime);
  transform: translate(18px, 18px) rotate(3deg);
  transition: transform 0.8s var(--ease-out);
}

.visual:hover .frame-back {
  transform: translate(26px, 22px) rotate(6deg);
}

.photo {
  --spot: 0px;
  position: relative;
  height: 100%;
  border-radius: 28px;
  overflow: hidden;
  isolation: isolate;
  background: var(--bg-soft);
  border: 1.5px solid var(--text);
  transition: --spot 1.1s var(--ease-out);
  touch-action: manipulation;
}

.photo:hover,
.photo.on {
  --spot: 900px;
}

.photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 80%;
  transition: transform 1.4s var(--ease-out);
}

.photo:hover img,
.photo.on img {
  transform: scale(1.06);
}

.fx {
  position: absolute;
  inset: 0;
  overflow: hidden;
  -webkit-mask-image: radial-gradient(
    circle at var(--mx, 50%) var(--my, 50%),
    #000 calc(var(--spot) - 70px),
    transparent var(--spot)
  );
  mask-image: radial-gradient(circle at var(--mx, 50%) var(--my, 50%), #000 calc(var(--spot) - 70px), transparent var(--spot));
}

.fx img {
  filter: url(#duotone-ryu) contrast(1.2);
}

.noise {
  position: absolute;
  inset: -50%;
  background-image: var(--noise);
  background-size: 140px;
  opacity: 0.85;
  mix-blend-mode: overlay;
  animation: grain 0.5s steps(4) infinite;
}

.hint {
  position: absolute;
  left: 14px;
  top: 14px;
  padding: 5px 10px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 11px;
  background: color-mix(in srgb, var(--navy-deep) 70%, transparent);
  color: #eef3e4;
  backdrop-filter: blur(6px);
  transition: opacity 0.4s, translate 0.4s;
}

.photo:hover .hint,
.photo.on .hint {
  opacity: 0;
  translate: 0 -8px;
}

.monogram {
  height: 100%;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: 8rem;
  font-weight: 800;
  color: var(--lime);
}

.sticker {
  position: absolute;
  top: -34px;
  right: -30px;
  width: 116px;
  height: 116px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--navy-deep);
  border: 1.5px solid var(--lime);
  color: var(--lime);
  z-index: 2;
}

.sticker svg {
  position: absolute;
  inset: 0;
  animation: spin 16s linear infinite;
}

.sticker text {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  fill: currentColor;
}

.star {
  font-size: 30px;
  line-height: 1;
  animation: spin 6s linear infinite reverse;
}

@keyframes spin {
  to {
    rotate: 360deg;
  }
}

.float {
  position: absolute;
  z-index: 2;
  box-shadow: var(--shadow);
  border-radius: 16px;
}

.code {
  left: -24px;
  bottom: 56px;
  padding: 12px 16px;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
  background: #0e2248;
  color: #dfe7f5;
  border: 1px solid rgba(214, 228, 255, 0.14);
}

.code pre {
  margin: 0;
}

.dots {
  display: flex;
  gap: 5px;
  margin-bottom: 8px;
}

.dots i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}

.dots i:first-child {
  background: var(--lime);
}

.k {
  color: #86a8ff;
}

.s {
  color: var(--lime);
}

.location {
  right: -8px;
  bottom: -8px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 600;
  background: var(--text);
  color: var(--bg);
  border-radius: 999px;
}

@media (max-width: 600px) {
  .code {
    left: -8px;
    bottom: 40px;
    font-size: 10.5px;
  }
  .sticker {
    top: -24px;
    right: -8px;
    width: 96px;
    height: 96px;
  }
}

/* ---------- Chiffres clés ---------- */
.stats {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0 24px;
}

.stats li {
  padding: 22px 0;
  display: grid;
  gap: 4px;
  align-content: start;
  border-top: 1px solid var(--border);
}

.value {
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 5vw, 3.4rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
}

.suffix {
  color: var(--accent);
}

.label {
  font-weight: 600;
}

.detail {
  font-size: 13px;
  color: var(--text-muted);
}

.cv-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}
</style>
