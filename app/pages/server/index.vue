<script setup lang="ts">
const { hasApp } = useAuth()

const { data: hosts } = useAsyncData('serverHosts', () => $fetch('/api/server/hosts'))
const { data: problems } = useAsyncData('serverProblems', () => $fetch('/api/server/problems'))

const summary = computed(() => {
  const allProblems = problems.value || []
  return {
    totalHosts: (hosts.value || []).length,
    problems: allProblems.length,
    highSeverity: allProblems.filter(p => p.severity === 'High' || p.severity === 'Disaster').length
  }
})

const recentProblems = computed(() => {
  return (problems.value || []).slice(0, 5).map(p => ({
    id: p.id,
    host: p.host || 'Unknown',
    trigger: p.trigger,
    severity: p.severity,
    time: p.duration
  }))
})
</script>

<template>
  <div>
    <PageHeader title="Server Dashboard" subtitle="Overview of server infrastructure health" icon="i-lucide-server-cog" />

    <div v-if="!hasApp('server')" class="panel flex flex-col items-center gap-2 p-10 text-center">
      <UIcon name="i-lucide-lock" class="size-6 text-faint" />
      <p class="text-sm text-(--color-muted)">You don't have access to KNetraHub-Server.</p>
    </div>

    <div v-else class="space-y-6">
      <div class="grid gap-4 md:grid-cols-3">
        <div class="panel p-5 flex flex-col items-center justify-center text-center">
          <span class="text-xs font-semibold uppercase text-(--color-muted)">Monitored Hosts</span>
          <span class="mt-2 text-4xl font-bold text-foam">{{ summary.totalHosts }}</span>
        </div>
        <div class="panel p-5 flex flex-col items-center justify-center text-center border-l-4 border-orange-500">
          <span class="text-xs font-semibold uppercase text-(--color-muted)">Active Problems</span>
          <span class="mt-2 text-4xl font-bold text-orange-500">{{ summary.problems }}</span>
        </div>
        <div class="panel p-5 flex flex-col items-center justify-center text-center border-l-4 border-red-500">
          <span class="text-xs font-semibold uppercase text-(--color-muted)">High Severity</span>
          <span class="mt-2 text-4xl font-bold text-red-500">{{ summary.highSeverity }}</span>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-2">
        <section class="panel p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-display text-sm font-semibold uppercase tracking-wider text-(--color-muted)">Top Problems</h2>
            <NuxtLink to="/server/problems" class="text-xs text-beacon hover:underline">View all -></NuxtLink>
          </div>
          <div class="space-y-3">
            <div v-for="problem in recentProblems" :key="problem.id" class="flex flex-col gap-1 p-3 rounded-lg bg-surface-2 border border-surface">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium px-2 py-0.5 rounded" 
                      :class="{
                        'bg-red-500/20 text-red-400': problem.severity === 'High',
                        'bg-orange-500/20 text-orange-400': problem.severity === 'Average',
                        'bg-yellow-500/20 text-yellow-400': problem.severity === 'Warning'
                      }">
                  {{ problem.severity }}
                </span>
                <span class="text-xs text-faint">{{ problem.time }}</span>
              </div>
              <p class="text-sm font-medium text-foam mt-1">{{ problem.host }}</p>
              <p class="text-xs text-(--color-muted)">{{ problem.trigger }}</p>
            </div>
          </div>
        </section>

        <section class="panel p-5 flex flex-col items-center justify-center min-h-[300px]">
          <UIcon name="i-lucide-activity" class="size-12 text-faint mb-3" />
          <p class="text-sm text-(--color-muted)">Global Performance Metrics Placeholder</p>
        </section>
      </div>
    </div>
  </div>
</template>
