<script setup lang="ts">
const { hasApp } = useAuth()

const { data: groups, status } = useAsyncData('netGroups', () => $fetch('/api/net/groups'))
</script>

<template>
  <div>
    <PageHeader title="Device Groups" subtitle="Logical organization and maintenance" icon="i-lucide-folder-tree">
      <template #actions>
        <UButton v-if="hasApp('net')" icon="i-lucide-plus" size="sm">Create Group</UButton>
      </template>
    </PageHeader>

    <div v-if="!hasApp('net')" class="panel flex flex-col items-center gap-2 p-10 text-center">
      <UIcon name="i-lucide-lock" class="size-6 text-faint" />
      <p class="text-sm text-(--color-muted)">You don't have access to KNetraHub-Net.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div v-if="status === 'pending' && !groups" class="col-span-3 text-center text-faint p-10 panel">Loading groups...</div>
      
      <div v-for="group in groups" :key="group.id" class="panel p-5">
        <div class="flex items-start justify-between mb-2">
          <h3 class="text-foam font-semibold">{{ group.name }}</h3>
          <UIcon name="i-lucide-folder" class="size-5 text-(--color-muted)" />
        </div>
        <p class="text-sm text-(--color-muted) mb-4">{{ group.description }}</p>
        <div class="flex items-center justify-between mt-auto pt-4 border-t border-surface">
          <span class="text-xs text-faint font-medium uppercase">{{ group.device_count }} Devices</span>
          <UButton size="xs" variant="ghost">Manage</UButton>
        </div>
      </div>
    </div>
  </div>
</template>
