import { createApp } from 'vue'
import App from './App.vue'
import { vReveal } from './directives/reveal'
import { vMagnetic, vParallax, vTilt } from './directives/motion'
import './styles/main.css'

createApp(App)
  .directive('reveal', vReveal)
  .directive('parallax', vParallax)
  .directive('tilt', vTilt)
  .directive('magnetic', vMagnetic)
  .mount('#app')
