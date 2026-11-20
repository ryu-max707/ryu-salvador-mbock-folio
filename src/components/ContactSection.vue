<script setup lang="ts">
import { reactive } from 'vue'
import AppIcon from './AppIcon.vue'
import SplitText from './SplitText.vue'
import { profile } from '@/data/profile'
import { mailtoLink, whatsappLink } from '@/utils/contact'

const subjects = ['Projet de développement', 'Formation / atelier', 'Mentorat', 'Autre']

const form = reactive({ name: '', subject: subjects[0] ?? '', message: '' })

// Pas de back-end : on ouvre le client mail avec le message pré-rempli
function send() {
  const body = `${form.message}\n\n— ${form.name}`
  window.location.href = mailtoLink(`[${form.subject}] ${form.name}`, body)
}
</script>

<template>
  <section id="contact" class="section">
    <div class="container">
      <div class="panel" v-reveal.scale>
        <span class="deco" aria-hidden="true">✳</span>
        <span class="noise" aria-hidden="true"></span>

        <div class="pitch">
          <span class="kicker">Contact</span>
          <h2 v-reveal.split="200">
            <SplitText :text="'Un projet, une formation ?'" :stagger="55" />
            <span class="serif"><SplitText text="Parlons-en." :stagger="55" :offset="4" /></span>
          </h2>
          <p>
            Application à construire, équipe à former ou besoin d'un regard expert sur votre code :
            écrivez-moi, je réponds rapidement.
          </p>

          <div class="channels">
            <a
              v-magnetic
              class="btn btn-primary"
              :href="whatsappLink('Bonjour Salvador, je vous contacte depuis votre site.')"
              target="_blank"
              rel="noopener"
            >
              <AppIcon name="whatsapp" :size="18" /> Discuter sur WhatsApp
            </a>
            <a v-magnetic class="btn btn-ghost" :href="`mailto:${profile.email}`">
              <AppIcon name="mail" :size="18" /> {{ profile.email }}
            </a>
          </div>

          <ul class="offers">
            <li><AppIcon name="check" :size="16" /> Développement web sur mesure</li>
            <li><AppIcon name="check" :size="16" /> Formations & bootcamps</li>
            <li><AppIcon name="check" :size="16" /> Mentorat & revue de code</li>
          </ul>
        </div>

        <form class="form" @submit.prevent="send">
          <label>
            <span>Votre nom</span>
            <input v-model.trim="form.name" type="text" required autocomplete="name" placeholder="Ryu Salvador" />
          </label>
          <label>
            <span>Sujet</span>
            <select v-model="form.subject">
              <option v-for="s in subjects" :key="s">{{ s }}</option>
            </select>
          </label>
          <label>
            <span>Message</span>
            <textarea
              v-model.trim="form.message"
              rows="5"
              required
              placeholder="Décrivez votre besoin en quelques lignes…"
            ></textarea>
          </label>
          <button type="submit" class="btn btn-primary">
            Envoyer le message <AppIcon name="arrow" :size="18" />
          </button>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel {
  position: relative;
  overflow: hidden;
  padding: 36px 22px;
  display: grid;
  gap: 40px;
  border-radius: 32px;
  /* Feuille d'or : reflet clair en haut à gauche, or plus profond en bas */
  background: linear-gradient(135deg, var(--gold-soft) 0%, var(--gold) 45%, #b8923e 100%);
  color: var(--plum-deep);
  isolation: isolate;
}

@media (min-width: 768px) {
  .panel {
    padding: 64px;
  }
}

@media (min-width: 960px) {
  .panel {
    grid-template-columns: 1.15fr 0.85fr;
    gap: 64px;
  }
}

.noise {
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: var(--noise);
  background-size: 180px;
  opacity: 0.35;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.deco {
  position: absolute;
  right: -40px;
  top: -70px;
  z-index: -1;
  font-size: 320px;
  line-height: 1;
  color: color-mix(in srgb, var(--plum-deep) 8%, transparent);
  animation: spin 30s linear infinite;
  pointer-events: none;
}

@keyframes spin {
  to {
    rotate: 360deg;
  }
}

.pitch {
  position: relative;
  display: grid;
  gap: 22px;
  align-content: start;
}

.kicker {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h2 {
  font-size: clamp(2.4rem, 5.6vw, 4.4rem);
  font-weight: 800;
  letter-spacing: -0.05em;
}

h2 .serif {
  display: block;
  font-weight: 400;
  font-size: 1.15em;
}

.pitch > p {
  font-size: 1.1rem;
  max-width: 520px;
  color: color-mix(in srgb, var(--plum-deep) 78%, transparent);
}

.channels {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.channels .btn-ghost {
  word-break: break-all;
  white-space: normal;
}

.btn-primary {
  background: var(--plum-deep);
  border-color: var(--plum-deep);
  color: var(--gold);
}

.btn-primary:hover {
  box-shadow: 4px 4px 0 #f4f1f5;
}

.btn-ghost {
  color: var(--plum-deep);
  border-color: color-mix(in srgb, var(--plum-deep) 35%, transparent);
}

.btn-ghost:hover {
  border-color: var(--plum-deep);
  box-shadow: 4px 4px 0 var(--plum-deep);
}

.offers {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: grid;
  gap: 10px;
  font-weight: 500;
}

.offers li {
  display: flex;
  align-items: center;
  gap: 10px;
}

.form {
  position: relative;
  display: grid;
  gap: 16px;
  align-content: start;
  padding: 24px;
  border-radius: 24px;
  background: var(--plum-deep);
  color: #ece9f0;
}

@media (min-width: 768px) {
  .form {
    padding: 32px;
  }
}

label {
  display: grid;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
}

input,
select,
textarea {
  width: 100%;
  padding: 13px 16px;
  border-radius: 14px;
  border: 1px solid rgba(232, 222, 240, 0.16);
  background: rgba(255, 255, 255, 0.04);
  color: #ece9f0;
  font: inherit;
  font-size: 15px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

input::placeholder,
textarea::placeholder {
  color: rgba(236, 233, 240, 0.4);
}

select option {
  background: var(--plum-deep);
}

textarea {
  resize: vertical;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--gold);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--gold) 20%, transparent);
}

.form .btn-primary {
  background: var(--gold);
  border-color: var(--gold);
  color: var(--plum-deep);
}

.form .btn-primary:hover {
  box-shadow: 4px 4px 0 #ece9f0;
}
</style>
