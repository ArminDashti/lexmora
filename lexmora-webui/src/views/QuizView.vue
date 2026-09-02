<script setup lang="ts">
import { computed, ref } from 'vue'
import { api, type QuizQuestion } from '../api/client'

type Phase = 'setup' | 'play' | 'done'

const phase = ref<Phase>('setup')
const count = ref(10)
const loading = ref(false)
const deleting = ref(false)
const error = ref('')

const questions = ref<QuizQuestion[]>([])
const index = ref(0)
const revealed = ref(false)

const current = computed(() => questions.value[index.value] ?? null)
const isLast = computed(() => index.value >= questions.value.length - 1)

async function startQuiz() {
  error.value = ''
  const n = Math.floor(Number(count.value))
  if (!Number.isFinite(n) || n < 1 || n > 50) {
    error.value = 'Number of questions must be between 1 and 50'
    return
  }
  loading.value = true
  try {
    const result = await api.createQuiz({ count: n })
    questions.value = result.questions
    index.value = 0
    revealed.value = false
    phase.value = 'play'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to start quiz'
  } finally {
    loading.value = false
  }
}

function showResult() {
  revealed.value = true
}

function nextQuestion() {
  if (!revealed.value) return
  if (isLast.value) {
    phase.value = 'done'
    return
  }
  index.value += 1
  revealed.value = false
}

async function deleteCurrent() {
  if (!current.value || deleting.value) return
  deleting.value = true
  error.value = ''
  const id = current.value.history_id
  try {
    await api.deleteHistory(id)
    questions.value = questions.value.filter((q) => q.history_id !== id)
    if (!questions.value.length) {
      phase.value = 'done'
      return
    }
    if (index.value >= questions.value.length) {
      index.value = questions.value.length - 1
    }
    revealed.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete'
  } finally {
    deleting.value = false
  }
}

function restart() {
  phase.value = 'setup'
  questions.value = []
  index.value = 0
  revealed.value = false
  error.value = ''
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-white">Quiz</h1>
      <p class="mt-1 text-sm text-gray-400">
        Guess the Persian for each English prompt. Questions come from your English↔Persian translate history.
      </p>
    </div>

    <div v-if="error" class="text-sm text-red-400">{{ error }}</div>

    <div v-if="phase === 'setup'" class="card space-y-5">
      <div class="w-full max-w-[12rem]">
        <label class="mb-1 block text-sm text-gray-400">Number of questions</label>
        <input
          v-model.number="count"
          type="number"
          min="1"
          max="50"
          class="input-field"
        />
      </div>

      <button type="button" class="btn-primary" :disabled="loading" @click="startQuiz">
        {{ loading ? 'Starting...' : 'Start quiz' }}
      </button>
    </div>

    <div v-else-if="phase === 'play' && current" class="card space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-400">
        <span>Question {{ index + 1 }} of {{ questions.length }}</span>
        <span>{{ current.type_display }}</span>
      </div>

      <div>
        <p class="mb-1 text-xs uppercase tracking-wide text-gray-500">English</p>
        <div class="rounded-lg border border-surface-border bg-surface p-4 text-gray-100 whitespace-pre-wrap">
          {{ current.prompt }}
        </div>
      </div>

      <div v-if="revealed">
        <p class="mb-1 text-xs uppercase tracking-wide text-gray-500">Persian</p>
        <div
          class="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-100 whitespace-pre-wrap"
          dir="rtl"
        >
          {{ current.answer }}
        </div>
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          class="btn-primary"
          :disabled="!revealed"
          @click="nextQuestion"
        >
          {{ isLast ? 'Finish' : 'Next' }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-300 transition hover:border-red-400 hover:bg-red-500/10"
          :disabled="deleting"
          @click="deleteCurrent"
        >
          {{ deleting ? 'Deleting...' : 'Delete' }}
        </button>
        <button
          type="button"
          class="btn-primary"
          :disabled="revealed"
          @click="showResult"
        >
          Answer
        </button>
      </div>
    </div>

    <div v-else-if="phase === 'done'" class="card space-y-5 text-center">
      <h2 class="text-xl font-semibold text-white">Quiz complete</h2>
      <button type="button" class="btn-primary" @click="restart">Restart</button>
    </div>
  </div>
</template>
