<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { clearAuth, getUsername } from '../api/client'
import SiteFooter from './SiteFooter.vue'

const route = useRoute()
const username = getUsername() || 'armin'

const links = [
  { to: '/transform', label: 'Transform' },
  { to: '/history', label: 'History' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/stats', label: 'Stats' },
  { to: '/settings', label: 'Settings' },
]

function logout() {
  clearAuth()
  window.location.href = '/login'
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <header class="border-b border-surface-border bg-surface-raised">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div class="flex items-center gap-8">
          <RouterLink
            to="/transform"
            class="flex shrink-0 items-center gap-2.5"
            aria-label="Lexmora home"
          >
            <img
              src="/logo-mark.png"
              alt=""
              class="h-11 w-auto object-contain"
              width="80"
              height="44"
            />
            <span class="text-lg font-semibold tracking-tight text-white">Lexmora</span>
          </RouterLink>
          <nav class="flex gap-1">
            <RouterLink
              v-for="link in links"
              :key="link.to"
              :to="link.to"
              class="rounded-lg px-3 py-2 text-sm transition"
              :class="
                route.path === link.to
                  ? 'bg-accent/20 text-accent'
                  : 'text-gray-400 hover:bg-surface-border/50 hover:text-white'
              "
            >
              {{ link.label }}
            </RouterLink>
          </nav>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-400">{{ username }}</span>
          <button class="btn-ghost text-sm" @click="logout">Logout</button>
        </div>
      </div>
    </header>
    <main
      class="mx-auto w-full flex-1 px-4 py-8"
      :class="route.path === '/history' ? 'max-w-none' : 'max-w-6xl'"
    >
      <RouterView />
    </main>
    <SiteFooter />
  </div>
</template>
