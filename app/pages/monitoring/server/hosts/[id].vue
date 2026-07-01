<script setup lang="ts">
const route = useRoute()
const { hasApp } = useAuth()

const { data: host } = useAsyncData(`serverHost-${route.params.id}`, () => $fetch(`/api/server/hosts/${route.params.id}`))
</script>

<template>
  <div>
    <PageHeader :title="host?.name || 'Loading...'" subtitle="Host Metrics" icon="i-lucide-activity">
      <template #actions>
        <NuxtLink to="/monitoring/server/hosts" class="text-sm font-medium text-(--color-muted) hover:text-foam flex items-center gap-1">
          <UIcon name="i-lucide-arrow-left" class="size-4" /> Back to Hosts
        </NuxtLink>
      </template>
    </PageHeader>

    <div v-if="!hasApp('monitoring')" class="panel flex flex-col items-center gap-2 p-10 text-center">
      <UIcon name="i-lucide-lock" class="size-6 text-faint" />
      <p class="text-sm text-(--color-muted)">You don't have access to KNetraHub-Monitoring.</p>
    </div>

    <div v-else-if="host" class="space-y-6">
      <div class="panel p-5 flex flex-wrap gap-x-10 gap-y-4">
        <div>
          <span class="text-xs font-medium uppercase text-(--color-muted)">IP Address</span>
          <p class="mt-1 font-mono text-sm text-foam">{{ host.ip }}</p>
        </div>
        <div>
          <span class="text-xs font-medium uppercase text-(--color-muted)">OS</span>
          <p class="mt-1 text-sm text-foam">{{ host.os }}</p>
        </div>
        <div>
          <span class="text-xs font-medium uppercase text-(--color-muted)">Uptime</span>
          <p class="mt-1 text-sm text-foam">{{ host.uptime }}</p>
        </div>
        <div>
          <span class="text-xs font-medium uppercase text-(--color-muted)">Agent</span>
          <p class="mt-1 text-sm text-foam">{{ host.agent }}</p>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <section class="panel p-5 flex flex-col items-center justify-center min-h-[250px]">
          <UIcon name="i-lucide-cpu" class="size-10 text-faint mb-3" />
          <p class="text-sm font-medium text-foam">CPU Utilization</p>
          <p class="text-xs text-(--color-muted)">Chart Placeholder</p>
        </section>
        <section class="panel p-5 flex flex-col items-center justify-center min-h-[250px]">
          <UIcon name="i-lucide-memory-stick" class="size-10 text-faint mb-3" />
          <p class="text-sm font-medium text-foam">Memory Usage</p>
          <p class="text-xs text-(--color-muted)">Chart Placeholder</p>
        </section>
        <section class="panel p-5 flex flex-col items-center justify-center min-h-[250px] lg:col-span-2">
          <UIcon name="i-lucide-hard-drive" class="size-10 text-faint mb-3" />
          <p class="text-sm font-medium text-foam">Disk Space</p>
          <p class="text-xs text-(--color-muted)">Chart Placeholder</p>
        </section>
      </div>
    </div>
  </div>
</template>
