<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { api } from '../api/client'
import {
  buildInstructionKey,
  instructionKeyFilename,
  type InstructionContext,
} from '../utils/instructionKey'
import { textDir } from '../utils/textDirection'

const route = useRoute()

const content = ref('')
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const saved = ref(false)

const context = computed<InstructionContext>(() => ({
  operation: String(route.query.operation ?? ''),
  direction: route.query.direction ? String(route.query.direction) : undefined,
  mode: route.query.mode ? String(route.query.mode) : undefined,
  style: route.query.style ? String(route.query.style) : undefined,
  language: route.query.language ? String(route.query.language) : undefined,
}))

const instructionKey = computed(() => buildInstructionKey(context.value))

const hasContext = computed(() => !!context.value.operation && !!instructionKey.value)

async function load() {
  if (!instructionKey.value) {
    loading.value = false
    content.value = ''
    return
  }

  loading.value = true
  error.value = ''
  saved.value = false
  try {
    const item = await api.getInstruction(instructionKey.value)
    content.value = item.content
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load instruction'
    content.value = ''
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!instructionKey.value) return
  saving.value = true
  error.value = ''
  saved.value = false
  try {
    await api.updateInstruction(instructionKey.value, content.value)
    saved.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}

watch(instructionKey, load, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <div v-if="!hasContext" class="card space-y-3">
      <p class="text-gray-300">
        Open an instruction from Transform using the Instruction button for the current operation.
      </p>
      <RouterLink to="/transform" class="btn-ghost inline-block text-sm">Back to Transform</RouterLink>
    </div>

    <div v-else class="card space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-medium text-white">{{ instructionKeyFilename(instructionKey!) }}</h2>
        <RouterLink to="/transform" class="btn-ghost text-sm">Back to Transform</RouterLink>
      </div>

      <div v-if="loading" class="text-sm text-gray-500">Loading...</div>

      <template v-else>
        <textarea
          v-model="content"
          rows="20"
          class="input-field font-mono text-sm"
          :dir="textDir(content)"
        />

        <div class="flex items-center gap-4">
          <button class="btn-primary" :disabled="saving" @click="save">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
          <span v-if="saved" class="text-sm text-green-400">Saved</span>
          <span v-if="error" class="text-sm text-red-400">{{ error }}</span>
        </div>
      </template>
    </div>
  </div>
</template>
