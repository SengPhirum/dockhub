<script setup lang="ts">
const { hasApp } = useAuth()

const { data: subnets } = useAsyncData('ipmgtSubnets', () => $fetch('/api/ipmgt/subnets'))

const summary = computed(() => {
  const subs = subnets.value || []
  const totalIPs = subs.length * 254 // Approximation based on /24
  const usedIPs = subs.reduce((acc, s) => acc + Math.floor(254 * ((s.usage || 0) / 100)), 0)
  return {
    totalSubnets: subs.length,
    totalIPs: totalIPs,
    usedIPs: usedIPs,
    usagePercent: subs.length ? Math.round((usedIPs / totalIPs) * 100) : 0
  }
})

const topSubnets = computed(() => {
  return [...(subnets.value || [])]
    .sort((a, b) => (b.usage || 0) - (a.usage || 0))
    .slice(0, 5)
    .map(s => ({
      id: s.id,
      name: s.name,
      subnet: s.network,
      used: Math.floor(254 * ((s.usage || 0) / 100)),
      total: 254,
      usage: s.usage || 0
    }))
})
</script>

<template>
  <div>
    <PageHeader title="IPAM Dashboard" subtitle="IP Address Management overview" icon="i-lucide-id-card" />

    <div v-if="!hasApp('ipmgt')" class="panel flex flex-col items-center gap-2 p-10 text-center">
      <UIcon name="i-lucide-lock" class="size-6 text-faint" />
      <p class="text-sm text-(--color-muted)">You don't have access to KNetraHub-IPMgt.</p>
    </div>

    <div v-else class="space-y-6">
      <div class="grid gap-4 md:grid-cols-4">
        <div class="panel p-5 flex flex-col items-center text-center">
          <span class="text-xs font-semibold uppercase text-(--color-muted)">Managed Subnets</span>
          <span class="mt-2 text-3xl font-bold text-foam">{{ summary.totalSubnets }}</span>
        </div>
        <div class="panel p-5 flex flex-col items-center text-center">
          <span class="text-xs font-semibold uppercase text-(--color-muted)">Total IP Space</span>
          <span class="mt-2 text-3xl font-bold text-foam">{{ summary.totalIPs }}</span>
        </div>
        <div class="panel p-5 flex flex-col items-center text-center">
          <span class="text-xs font-semibold uppercase text-(--color-muted)">Allocated IPs</span>
          <span class="mt-2 text-3xl font-bold text-beacon">{{ summary.usedIPs }}</span>
        </div>
        <div class="panel p-5 flex flex-col items-center text-center border-b-4 border-beacon">
          <span class="text-xs font-semibold uppercase text-(--color-muted)">Overall Usage</span>
          <span class="mt-2 text-3xl font-bold text-beacon">{{ summary.usagePercent }}%</span>
        </div>
      </div>

      <div class="grid gap-4 xl:grid-cols-2">
        <section class="panel p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-display text-sm font-semibold uppercase tracking-wider text-(--color-muted)">Highest Utilization Subnets</h2>
            <NuxtLink to="/ipmgt/subnets" class="text-xs text-beacon hover:underline">View all subnets -></NuxtLink>
          </div>
          <div class="space-y-4">
            <div v-for="sub in topSubnets" :key="sub.id" class="flex flex-col gap-2">
              <div class="flex justify-between items-center text-sm">
                <span class="font-medium text-foam">{{ sub.name }} <span class="text-xs font-mono text-(--color-muted) ml-1">{{ sub.subnet }}</span></span>
                <span class="text-xs text-faint">{{ sub.used }} / {{ sub.total }} ({{ sub.usage }}%)</span>
              </div>
              <div class="h-2 w-full bg-surface-2 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all" 
                     :class="sub.usage > 80 ? 'bg-red-500' : (sub.usage > 60 ? 'bg-orange-500' : 'bg-green-500')"
                     :style="{ width: `${sub.usage}%` }">
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="panel p-5 flex flex-col items-center justify-center min-h-[300px]">
          <UIcon name="i-lucide-pie-chart" class="size-12 text-faint mb-3" />
          <p class="text-sm text-(--color-muted)">Address Space Distribution Chart Placeholder</p>
        </section>
      </div>
    </div>
  </div>
</template>
