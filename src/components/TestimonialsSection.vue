<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import SectionHeading from './SectionHeading.vue'
import { references, testimonials } from '@/data/profile'
import { mailtoLink, whatsappLink } from '@/utils/contact'

const requestMessage = 'Bonjour Salvador, je consulte votre portfolio. Pourriez-vous me communiquer les coordonnées de vos références ?'
</script>

<template>
  <section v-if="testimonials.length || references.length" id="references" class="section">
    <div class="container">
      <SectionHeading
        v-if="testimonials.length"
        eyebrow="Témoignages"
        title="Ils en"
        highlight="parlent."
        center
      />
      <SectionHeading
        v-else
        eyebrow="Références"
        title="Ils peuvent"
        highlight="en parler."
        text="Des professionnels avec qui j'ai travaillé. Leurs coordonnées sont communiquées sur simple demande."
        center
      />

      <div v-if="testimonials.length" class="grid quotes">
        <figure v-for="(t, i) in testimonials" :key="i" class="quote" :class="{ alt: i % 2 }" v-reveal.clip="i * 150">
          <AppIcon name="quote" :size="34" class="mark" />
          <blockquote>« {{ t.quote }} »</blockquote>
          <figcaption>
            <span class="avatar">{{ t.author.charAt(0) }}</span>
            <span>
              <strong>{{ t.author }}</strong>
              <small>{{ t.role }}</small>
            </span>
          </figcaption>
        </figure>
      </div>

      <template v-if="references.length">
        <ul class="grid refs">
          <li v-for="(r, i) in references" :key="r.company" v-tilt="5" class="ref" :class="{ alt: i === 1 }" v-reveal.rotate="i * 120">
            <span class="initial" aria-hidden="true">{{ r.company.charAt(0) }}</span>
            <div class="who">
              <strong>{{ r.role }}</strong>
              <span class="company serif">{{ r.company }}</span>
            </div>
            <p class="context">{{ r.context }}</p>
            <span class="badge"><AppIcon name="check" :size="14" /> Coordonnées sur demande</span>
          </li>
        </ul>

        <div class="ask" v-reveal="200">
          <p>Besoin de vérifier une référence ? Je vous mets en relation rapidement.</p>
          <div class="ask-actions">
            <a class="btn btn-primary" :href="whatsappLink(requestMessage)" target="_blank" rel="noopener">
              <AppIcon name="whatsapp" :size="18" /> Demander les coordonnées
            </a>
            <a class="btn btn-ghost" :href="mailtoLink('Demande de références', requestMessage)">
              <AppIcon name="mail" :size="18" /> Par e-mail
            </a>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  gap: 20px;
  margin: 0 auto;
}

/* ---------- Témoignages ---------- */
.quotes {
  max-width: 1040px;
  margin-bottom: 64px;
}

@media (min-width: 760px) {
  .quotes {
    grid-template-columns: repeat(2, 1fr);
  }
  .quotes .alt {
    margin-top: 56px;
  }
}

.quote {
  margin: 0;
  padding: 34px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  border-radius: 24px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
}

.quote.alt {
  background: var(--lime);
  color: var(--navy-deep);
  border-color: var(--lime);
}

.mark {
  color: var(--accent);
}

.quote.alt .mark {
  color: var(--navy-deep);
}

blockquote {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(1.4rem, 2.4vw, 1.75rem);
  line-height: 1.3;
  flex: 1;
}

figcaption {
  display: flex;
  align-items: center;
  gap: 12px;
}

figcaption strong {
  display: block;
}

figcaption small {
  color: var(--text-muted);
}

.quote.alt figcaption small {
  color: color-mix(in srgb, var(--navy-deep) 70%, transparent);
}

.avatar {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--lime);
  color: var(--navy-deep);
  font-weight: 700;
}

.quote.alt .avatar {
  background: var(--navy-deep);
  color: var(--lime);
}

/* ---------- Références ---------- */
.refs {
  list-style: none;
  padding: 0;
  max-width: 1100px;
}

@media (min-width: 860px) {
  .refs {
    grid-template-columns: repeat(3, 1fr);
  }
}

.ref {
  position: relative;
  overflow: hidden;
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  border-radius: 24px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  transition: border-color 0.3s;
}

.ref:hover {
  border-color: color-mix(in srgb, var(--lime) 55%, transparent);
}

.ref.alt {
  background: var(--lime);
  border-color: var(--lime);
  color: var(--navy-deep);
}

.initial {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 800;
  background: var(--navy);
  color: var(--lime);
  border: 1px solid var(--border);
}

.ref.alt .initial {
  background: var(--navy-deep);
}

.who {
  display: grid;
  gap: 2px;
}

.who strong {
  font-family: var(--font-display);
  font-size: 1.35rem;
  letter-spacing: -0.03em;
}

.company {
  font-size: 1.3rem;
  color: var(--accent);
}

.ref.alt .company {
  color: var(--navy-deep);
}

.context {
  color: var(--text-muted);
  flex: 1;
}

.ref.alt .context {
  color: color-mix(in srgb, var(--navy-deep) 75%, transparent);
}

.badge {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 11px;
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.badge :deep(svg) {
  color: var(--accent);
}

.ref.alt .badge {
  border-color: color-mix(in srgb, var(--navy-deep) 30%, transparent);
  color: var(--navy-deep);
}

.ref.alt .badge :deep(svg) {
  color: var(--navy-deep);
}

.ask {
  margin: 48px auto 0;
  max-width: 1100px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 18px 24px;
  padding-top: 28px;
  border-top: 1px solid var(--border);
}

.ask p {
  font-size: 1.1rem;
  color: var(--text-muted);
}

.ask-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
