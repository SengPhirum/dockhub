<script setup lang="ts">
import type { ListSortOption, SortDirection } from '~/composables/useListControls'

const props = withDefaults(defineProps<{
  search: string
  sortBy: string
  sortDir: SortDirection
  sortOptions: Array<ListSortOption>
  placeholder?: string
}>(), {
  placeholder: 'Search'
})

const emit = defineEmits<{
  'update:search': [value: string]
  'update:sortBy': [value: string]
  'update:sortDir': [value: SortDirection]
}>()

const searchModel = computed({
  get: () => props.search,
  set: (value: string) => emit('update:search', value || '')
})
const sortModel = computed({
  get: () => props.sortBy,
  set: (value: string) => emit('update:sortBy', value)
})
const sortDirModel = computed({
  get: () => props.sortDir,
  set: (value: SortDirection) => emit('update:sortDir', value)
})
const selectItems = computed(() => props.sortOptions.map(({ label, value }) => ({ label, value })))

function toggleDirection() {
  sortDirModel.value = sortDirModel.value === 'asc' ? 'desc' : 'asc'
}
</script>

<template>
  <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <UInput
      v-model="searchModel"
      icon="i-lucide-search"
      :placeholder="placeholder"
      class="w-full sm:max-w-xs"
    />
    <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:w-auto">
      <USelect
        v-model="sortModel"
        :items="selectItems"
        value-key="value"
        label-key="label"
        icon="i-lucide-arrow-up-down"
        aria-label="Sort by"
        class="min-w-0 sm:w-44"
      />
      <UButton
        color="neutral"
        variant="soft"
        :icon="sortDirModel === 'asc' ? 'i-lucide-arrow-up-a-z' : 'i-lucide-arrow-down-z-a'"
        :title="sortDirModel === 'asc' ? 'Ascending' : 'Descending'"
        :aria-label="sortDirModel === 'asc' ? 'Sort ascending' : 'Sort descending'"
        @click="toggleDirection"
      />
    </div>
  </div>
</template>
