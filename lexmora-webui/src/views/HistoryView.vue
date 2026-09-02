<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { api, type HistoryRecord } from '../api/client'
import HistoryModal from '../components/HistoryModal.vue'
import { HISTORY_TYPE_OPTIONS } from '../constants/historyTypes'
import { formatLocalDateTime } from '../utils/datetime'

const PAGE_SIZE = 50

const items = ref<HistoryRecord[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const error = ref('')
const sortBy = ref('datetime')
const sortOrder = ref('desc')
const typeFilters = ref<string[]>([])
const typeMenuOpen = ref(false)
const typeMenuRoot = ref<HTMLElement | null>(null)
const fromDate = ref('')
const toDate = ref('')
const showResultColumn = ref(false)
const selected = ref<HistoryRecord | null>(null)
const checkedIds = ref<Set<string>>(new Set())
const deleting = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

const typeFilterLabel = computed(() => {
  if (!typeFilters.value.length) return 'All types'
  if (typeFilters.value.length === 1) {
    return HISTORY_TYPE_OPTIONS.find((t) => t.value === typeFilters.value[0])?.label ?? '1 type'
  }
  return `${typeFilters.value.length} types`
})

const showFilterFields = computed(
  () =>
    items.value.length > 0 ||
    total.value > 0 ||
    typeFilters.value.length > 0 ||
    !!fromDate.value ||
    !!toDate.value
)

const allChecked = computed(
  () => items.value.length > 0 && items.value.every((item) => checkedIds.value.has(item.id))
)

const someChecked = computed(() => checkedIds.value.size > 0)

function displayDate(item: HistoryRecord) {
  return formatLocalDateTime(item.created_at, item.formatted_date)
}

async function load(resetPage = false) {
  if (resetPage) page.value = 1
  loading.value = true
  error.value = ''
  try {
    const result = await api.getHistory({
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
      type: typeFilters.value.length ? typeFilters.value : undefined,
      from: fromDate.value || undefined,
      to: toDate.value || undefined,
      limit: PAGE_SIZE,
      offset: (page.value - 1) * PAGE_SIZE,
    })
    items.value = result.items
    total.value = result.total
    const visible = new Set(items.value.map((i) => i.id))
    checkedIds.value = new Set([...checkedIds.value].filter((id) => visible.has(id)))
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load history'
  } finally {
    loading.value = false
  }
}

function toggleType(value: string) {
  const next = new Set(typeFilters.value)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  typeFilters.value = [...next]
  load(true)
}

function clearTypes() {
  typeFilters.value = []
  load(true)
}

function onDocClick(event: MouseEvent) {
  if (!typeMenuOpen.value || !typeMenuRoot.value) return
  if (!typeMenuRoot.value.contains(event.target as Node)) {
    typeMenuOpen.value = false
  }
}

function toggleSort(column: string) {
  if (sortBy.value === column) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = column
    sortOrder.value = column === 'datetime' ? 'desc' : 'asc'
  }
  load(true)
}

function toggleCheck(id: string, event: Event) {
  event.stopPropagation()
  const next = new Set(checkedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  checkedIds.value = next
}

function toggleSelectAll(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.checked) {
    checkedIds.value = new Set(items.value.map((i) => i.id))
  } else {
    checkedIds.value = new Set()
  }
}

async function remove(id: string, event: Event) {
  event.stopPropagation()
  if (!confirm('Delete this history entry?')) return
  try {
    await api.deleteHistory(id)
    await load()
    const next = new Set(checkedIds.value)
    next.delete(id)
    checkedIds.value = next
    if (selected.value?.id === id) selected.value = null
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Delete failed')
  }
}

async function removeChecked() {
  if (!checkedIds.value.size) return
  const count = checkedIds.value.size
  if (!confirm(`Delete ${count} selected histor${count === 1 ? 'y entry' : 'y entries'}?`)) return

  deleting.value = true
  error.value = ''
  const ids = [...checkedIds.value]
  const results = await Promise.allSettled(ids.map((id) => api.deleteHistory(id)))
  const failed = results.filter((r) => r.status === 'rejected').length
  const deleted = new Set(ids.filter((_, i) => results[i].status === 'fulfilled'))

  checkedIds.value = new Set([...checkedIds.value].filter((id) => !deleted.has(id)))
  if (selected.value && deleted.has(selected.value.id)) selected.value = null

  if (failed) {
    error.value = `Failed to delete ${failed} of ${ids.length} entries`
  }
  deleting.value = false
  await load()
}

function sortIcon(column: string) {
  if (sortBy.value !== column) return '↕'
  return sortOrder.value === 'asc' ? '↑' : '↓'
}

function clearFilters() {
  typeFilters.value = []
  fromDate.value = ''
  toDate.value = ''
  load(true)
}

function goToPage(next: number) {
  if (next < 1 || next > totalPages.value || next === page.value) return
  page.value = next
  load()
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  load()
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
})
</script>

<template>
  <div class="space-y-6">
    <div v-if="error" class="text-sm text-red-400">{{ error }}</div>

    <div class="card flex flex-wrap items-end gap-3">
      <template v-if="showFilterFields">
        <div ref="typeMenuRoot" class="relative w-full max-w-[16rem]">
          <label class="mb-1 block text-sm text-gray-400">Type</label>
          <button
            type="button"
            class="select-field select-compact flex w-full items-center justify-between text-left"
            @click="typeMenuOpen = !typeMenuOpen"
          >
            <span class="truncate">{{ typeFilterLabel }}</span>
            <span class="text-gray-500">▾</span>
          </button>
          <div
            v-if="typeMenuOpen"
            class="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-surface-border bg-surface-raised p-2 shadow-lg"
          >
            <button
              type="button"
              class="mb-1 w-full rounded px-2 py-1.5 text-left text-sm text-gray-400 hover:bg-surface hover:text-white"
              @click="clearTypes"
            >
              All types
            </button>
            <label
              v-for="t in HISTORY_TYPE_OPTIONS"
              :key="t.value"
              class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-200 hover:bg-surface"
            >
              <input
                type="checkbox"
                class="accent-accent"
                :checked="typeFilters.includes(t.value)"
                @change="toggleType(t.value)"
              />
              {{ t.label }}
            </label>
          </div>
        </div>
        <div class="w-full max-w-[11rem]">
          <label class="mb-1 block text-sm text-gray-400">From</label>
          <input v-model="fromDate" type="date" class="input-field" @change="load(true)" />
        </div>
        <div class="w-full max-w-[11rem]">
          <label class="mb-1 block text-sm text-gray-400">To</label>
          <input v-model="toDate" type="date" class="input-field" @change="load(true)" />
        </div>
        <button
          v-if="fromDate || toDate || typeFilters.length"
          type="button"
          class="text-sm text-gray-400 hover:text-white"
          @click="clearFilters"
        >
          Clear filters
        </button>
      </template>
      <button
        type="button"
        class="btn-ghost text-sm"
        @click="showResultColumn = !showResultColumn"
      >
        {{ showResultColumn ? 'Hide result' : 'Show result' }}
      </button>
      <button
        type="button"
        class="btn-danger ml-auto"
        :disabled="!someChecked || deleting"
        @click="removeChecked"
      >
        {{ deleting ? 'Deleting...' : 'Delete' }}
      </button>
    </div>

    <div class="card overflow-hidden p-0">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-surface-border bg-surface text-gray-400">
            <tr>
              <th class="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  class="accent-accent"
                  :checked="allChecked"
                  :disabled="items.length === 0"
                  @click.stop
                  @change="toggleSelectAll"
                />
              </th>
              <th class="cursor-pointer px-4 py-3 hover:text-white" @click="toggleSort('type')">
                Type {{ sortIcon('type') }}
              </th>
              <th class="px-4 py-3">Input</th>
              <th v-if="showResultColumn" class="px-4 py-3">Result</th>
              <th class="cursor-pointer px-4 py-3 hover:text-white" @click="toggleSort('model')">
                Model {{ sortIcon('model') }}
              </th>
              <th class="cursor-pointer px-4 py-3 hover:text-white" @click="toggleSort('datetime')">
                DateTime {{ sortIcon('datetime') }}
              </th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td :colspan="showResultColumn ? 7 : 6" class="px-4 py-8 text-center text-gray-500">
                Loading...
              </td>
            </tr>
            <tr v-else-if="items.length === 0">
              <td :colspan="showResultColumn ? 7 : 6" class="px-4 py-8 text-center text-gray-500">
                No history yet
              </td>
            </tr>
            <tr
              v-for="item in items"
              :key="item.id"
              class="cursor-pointer border-b border-surface-border transition hover:bg-surface"
              @click="selected = item"
            >
              <td class="px-4 py-3" @click.stop>
                <input
                  type="checkbox"
                  class="accent-accent"
                  :checked="checkedIds.has(item.id)"
                  @change="toggleCheck(item.id, $event)"
                />
              </td>
              <td class="px-4 py-3">
                <span class="table-cell-truncate block">{{ item.type_display }}</span>
              </td>
              <td class="px-4 py-3">
                <span class="table-cell-truncate block" :title="item.input_text">{{
                  item.input_text
                }}</span>
              </td>
              <td v-if="showResultColumn" class="px-4 py-3">
                <span class="table-cell-truncate block" :title="item.result_text">{{
                  item.result_text
                }}</span>
              </td>
              <td class="px-4 py-3">
                <span class="table-cell-truncate block">{{ item.model }}</span>
              </td>
              <td class="px-4 py-3 whitespace-nowrap">{{ displayDate(item) }}</td>
              <td class="px-4 py-3">
                <button
                  class="text-red-400 hover:text-red-300"
                  title="Delete"
                  @click="remove(item.id, $event)"
                >
                  ✕
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="total > PAGE_SIZE"
      class="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400"
    >
      <span>
        Page {{ page }} of {{ totalPages }} · {{ total }} entries
      </span>
      <div class="flex gap-2">
        <button
          type="button"
          class="btn-ghost px-3 py-1 text-sm"
          :disabled="page <= 1 || loading"
          @click="goToPage(page - 1)"
        >
          Previous
        </button>
        <button
          type="button"
          class="btn-ghost px-3 py-1 text-sm"
          :disabled="page >= totalPages || loading"
          @click="goToPage(page + 1)"
        >
          Next
        </button>
      </div>
    </div>

    <HistoryModal v-if="selected" :item="selected" @close="selected = null" />
  </div>
</template>
