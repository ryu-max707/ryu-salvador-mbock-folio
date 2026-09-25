<script setup lang="ts">
import IntroLoader from './components/IntroLoader.vue'
import CustomCursor from './components/CustomCursor.vue'
import ScrollProgress from './components/ScrollProgress.vue'
import PhotoBackdrop from './components/PhotoBackdrop.vue'
import NavBar from './components/NavBar.vue'
import HeroSection from './components/HeroSection.vue'
import AboutSection from './components/AboutSection.vue'
import MarqueeBand from './components/MarqueeBand.vue'
import ExpertiseSection from './components/ExpertiseSection.vue'
import ProjectsSection from './components/ProjectsSection.vue'
import TrainingSection from './components/TrainingSection.vue'
import TimelineSection from './components/TimelineSection.vue'
import TestimonialsSection from './components/TestimonialsSection.vue'
import BugGame from './components/BugGame.vue'
import ContactSection from './components/ContactSection.vue'
import FooterBar from './components/FooterBar.vue'
import CvViewer from './components/CvViewer.vue'
</script>

<template>
  <IntroLoader />
  <CustomCursor />
  <ScrollProgress />
  <PhotoBackdrop />
  <NavBar />
  <main>
    <HeroSection />
    <AboutSection />
    <MarqueeBand />
    <ExpertiseSection />
    <ProjectsSection />
    <TrainingSection />
    <TimelineSection />
    <TestimonialsSection />
    <BugGame />
    <ContactSection />
  </main>
  <FooterBar />
  <CvViewer />
</template>
