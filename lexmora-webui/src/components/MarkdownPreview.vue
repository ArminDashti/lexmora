<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { textDir } from '../utils/textDirection'

const props = defineProps<{
  content: string
  class?: string
  dir?: 'rtl' | 'ltr' | 'auto'
}>()

marked.setOptions({ breaks: true, gfm: true })

const html = computed(() => {
  const raw = marked.parse(props.content || '') as string
  return DOMPurify.sanitize(raw)
})

const dir = computed(() => {
  if (props.dir && props.dir !== 'auto') return props.dir
  return textDir(props.content || '')
})
</script>

<template>
  <div
    class="markdown-preview rounded-lg border border-surface-border bg-surface p-4 text-gray-100"
    :class="props.class"
    :dir="dir"
    v-html="html"
  />
</template>
