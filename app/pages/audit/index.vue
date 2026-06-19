<script setup lang="ts">
const { relative } = useFormat()

const { data, status, error, refreshing, refresh } = useApiCache('audit', () => $fetch<any[]>('/api/system/audit'))
onMounted(refresh)

const auditSortOptions = [
  { label: 'Time', value: 'ts' },
  { label: 'Actor', value: 'actor' },
  { label: 'Action', value: 'action' },
  { label: 'Target', value: 'target' }
]
const { items: filtered, search, sortBy, sortDir, sortOptions } = useListControls('audit', data, {
  sortOptions: auditSortOptions,
  defaultSortBy: 'ts',
  defaultSortDir: 'desc'
})

const icon: Record<string, string> = {
  deploy: 'i-lucide-rocket', rollback: 'i-lucide-history', create: 'i-lucide-plus',
  update: 'i-lucide-pencil', delete: 'i-lucide-trash-2', add: 'i-lucide-plus',
  scale: 'i-lucide-scaling', login: 'i-lucide-log-in'
}
function actionIcon(action: string) {
  const verb = action.split('.')[1] || action
  return icon[verb] || 'i-lucide-activity'
}
</script>

<template>
  <div>
    <PageHeader title="Audit log" subtitle="Every state-changing action, with actor and target" icon="i-lucide-scroll">
      <template #actions>
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" :loading="refreshing" @click="refresh()" />
      </template>
    </PageHeader>

    <ListControls
      v-model:search="search"
      v-model:sort-by="sortBy"
      v-model:sort-dir="sortDir"
      :sort-options="sortOptions"
      placeholder="Search audit log"
    />

    <DataState :status="status" :error="error" :empty="!filtered.length" :refreshing="refreshing" empty-label="No audit entries yet." empty-icon="i-lucide-scroll">
      <div class="space-y-1.5">
        <div v-for="a in filtered" :key="a.id" class="panel-flush p-3 flex items-center gap-3 text-sm">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2">
            <UIcon :name="actionIcon(a.action)" class="size-4 text-beacon" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-foam">
              <span class="font-medium">{{ a.actor || '—' }}</span>
              <span class="text-(--color-muted)"> · </span>
              <span class="font-mono text-xs text-(--color-muted)">{{ a.action || '—' }}</span>
              <span v-if="a.target" class="text-faint"> → </span>
              <span v-if="a.target" class="font-mono text-xs text-foam">{{ a.target }}</span>
            </p>
            <p v-if="a.detail" class="truncate text-xs text-faint">{{ a.detail }}</p>
          </div>
          <span class="shrink-0 text-xs text-faint">{{ relative(a.ts) }}</span>
        </div>
      </div>
    </DataState>
  </div>
</template>
