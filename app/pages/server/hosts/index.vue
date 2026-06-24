<script setup lang="ts">
const { hasApp } = useAuth()

const { data: hosts } = useAsyncData('serverHostsList', () => $fetch('/api/server/hosts'))
</script>

<template>
  <div>
    <PageHeader title="Hosts" subtitle="Inventory of monitored servers" icon="i-lucide-server" />

    <div v-if="!hasApp('server')" class="panel flex flex-col items-center gap-2 p-10 text-center">
      <UIcon name="i-lucide-lock" class="size-6 text-faint" />
      <p class="text-sm text-(--color-muted)">You don't have access to KNetraHub-Server.</p>
    </div>

    <div v-else class="panel">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-(--color-muted)">
          <thead class="bg-surface-2 text-xs uppercase text-faint">
            <tr>
              <th class="px-4 py-3 font-medium">Host</th>
              <th class="px-4 py-3 font-medium">Interface</th>
              <th class="px-4 py-3 font-medium">OS</th>
              <th class="px-4 py-3 font-medium">Availability</th>
              <th class="px-4 py-3 font-medium">CPU</th>
              <th class="px-4 py-3 font-medium">Memory</th>
              <th class="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface">
            <tr v-for="host in hosts" :key="host.id" class="hover:bg-surface-2/50 transition">
              <td class="px-4 py-3 font-medium text-foam">{{ host.name }}</td>
              <td class="px-4 py-3 font-mono text-xs">{{ host.ip }}:10050</td>
              <td class="px-4 py-3">{{ host.os }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium" 
                      :class="host.status === 'Available' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'">
                  {{ host.status }}
                </span>
              </td>
              <td class="px-4 py-3">{{ host.cpu }}</td>
              <td class="px-4 py-3">{{ host.memory }}</td>
              <td class="px-4 py-3 text-right">
                <NuxtLink :to="`/server/hosts/${host.id}`" class="text-beacon hover:underline">Metrics</NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
