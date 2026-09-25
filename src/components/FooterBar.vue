<script setup lang="ts">
import { profile } from '@/data/profile'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="container">
      <p class="giant" aria-hidden="true" v-reveal.clip>
        {{ profile.middleName }}<span class="star">✳</span>
      </p>
      <div class="inner">
        <p>
          © {{ year }} {{ profile.firstName }} {{ profile.middleName }} {{ profile.lastName }} — Développeur &amp; Formateur
        </p>
        <nav aria-label="Réseaux sociaux">
          <a v-for="s in profile.socials" :key="s.label" :href="s.url" target="_blank" rel="noopener">
            {{ s.label }}
          </a>
          <a href="#top" class="top">Haut de page ↑</a>
        </nav>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  padding: 24px 0 32px;
  font-size: 14px;
  color: var(--text-muted);
  overflow: hidden;
}

.giant {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(5rem, 24vw, 20rem);
  line-height: 0.85;
  letter-spacing: -0.07em;
  color: var(--text);
  margin: 0 0 24px -0.04em;
  white-space: nowrap;
}

.star {
  display: inline-block;
  margin-left: 0.08em;
  font-size: 0.6em;
  vertical-align: 0.35em;
  color: var(--accent);
  animation: spin 12s linear infinite;
}

@keyframes spin {
  to {
    rotate: 360deg;
  }
}

.inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

nav {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

a {
  transition: color 0.2s;
}

a:hover {
  color: var(--accent);
}

.top {
  color: var(--text);
}
</style>
