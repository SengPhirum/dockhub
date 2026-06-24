<script setup lang="ts">
const { hasApp } = useAuth()

const { data: problems } = useAsyncData('serverProblemsList', () => $fetch('/api/server/problems'))
</script>

<template>
  <div>
    <PageHeader title="Problems" subtitle="Active alerts and triggers" icon="i-lucide-alert-triangle" />

    <div v-if="!hasApp('server')" class="panel flex flex-col items-center gap-2 p-10 text-center">
      <UIcon name="i-lucide-lock" class="size-6 text-faint" />
      <p class="text-sm text-(--color-muted)">You don't have access to KNetraHub-Server.</p>
    </div>

    <div v-else class="panel">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-(--color-muted)">
          <thead class="bg-surface-2 text-xs uppercase text-faint">
            <tr>
              <th class="px-4 py-3 font-medium">Time</th>
              <th class="px-4 py-3 font-medium">Host</th>
              <th class="px-4 py-3 font-medium">Problem</th>
              <th class="px-4 py-3 font-medium">Severity</th>
              <th class="px-4 py-3 font-medium">Duration</th>
              <th class="px-4 py-3 font-medium text-center">Ack</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface">
            <tr v-for="prob in problems" :key="prob.id" class="hover:bg-surface-2/50 transition">
              <td class="px-4 py-3 whitespace-nowrap text-xs">{{ prob.fired_at }}</td>
              <td class="px-4 py-3 font-medium text-foam">{{ prob.host }}</td>
              <td class="px-4 py-3">{{ prob.trigger }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-xs font-medium"
                      :class="{
                        'bg-red-500/20 text-red-400': prob.severity === 'High',
                        'bg-orange-500/20 text-orange-400': prob.severity === 'Average',
                        'bg-yellow-500/20 text-yellow-400': prob.severity === 'Warning'
                      }">
                  {{ prob.severity }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs">{{ prob.duration }}</td>
              <td class="px-4 py-3 text-center">
                <UIcon v-if="prob.ack" name="i-lucide-check-square" class="size-4 text-green-500" />
                <UIcon v-else name="i-lucide-square" class="size-4 text-faint" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
