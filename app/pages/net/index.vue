<script setup lang="ts">
const { hasApp } = useAuth()

const { data: devices } = useAsyncData('netDevicesMap', () => $fetch('/api/net/devices'))
const { data: alerts } = useAsyncData('netAlertsDash', () => $fetch('/api/net/alerts'))
const { data: flows } = useAsyncData('netFlowsDash', () => $fetch('/api/net/flows'))

const summary = computed(() => {
  const devs = devices.value || []
  const alts = alerts.value || []
  return {
    totalDevices: devs.length,
    upDevices: devs.filter(d => d.status === 'up').length,
    downDevices: devs.filter(d => d.status === 'down').length,
    activeAlerts: alts.filter(a => a.status === 'active').length
  }
})

const recentAlerts = computed(() => (alerts.value || []).slice(0, 5))
const topTalkers = computed(() => (flows.value || []).slice(0, 5))

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<template>
  <div>
    <PageHeader title="Network Dashboard" subtitle="Network monitoring overview" icon="i-lucide-network" />

    <div v-if="!hasApp('net')" class="panel flex flex-col items-center gap-2 p-10 text-center">
      <UIcon name="i-lucide-lock" class="size-6 text-faint" />
      <p class="text-sm text-(--color-muted)">You don't have access to KNetraHub-Net.</p>
    </div>

    <div v-else class="space-y-6">
      <div class="grid gap-4 md:grid-cols-4">
        <div class="panel p-5 flex flex-col">
          <span class="text-xs font-semibold uppercase text-(--color-muted)">Total Devices</span>
          <span class="mt-2 text-3xl font-bold text-foam">{{ summary.totalDevices }}</span>
        </div>
        <div class="panel p-5 flex flex-col">
          <span class="text-xs font-semibold uppercase text-(--color-muted)">Up Devices</span>
          <span class="mt-2 text-3xl font-bold text-green-500">{{ summary.upDevices }}</span>
        </div>
        <div class="panel p-5 flex flex-col">
          <span class="text-xs font-semibold uppercase text-(--color-muted)">Down Devices</span>
          <span class="mt-2 text-3xl font-bold text-red-500">{{ summary.downDevices }}</span>
        </div>
        <div class="panel p-5 flex flex-col">
          <span class="text-xs font-semibold uppercase text-(--color-muted)">Active Alerts</span>
          <span class="mt-2 text-3xl font-bold text-orange-500">{{ summary.activeAlerts }}</span>
        </div>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <section class="panel p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-display text-sm font-semibold uppercase tracking-wider text-(--color-muted)">Recent Alerts</h2>
            <NuxtLink to="/net/alerts" class="text-xs text-primary-400 hover:text-primary-300">View All</NuxtLink>
          </div>
          <div v-if="!recentAlerts.length" class="text-sm text-(--color-muted)">No alerts.</div>
          <div v-else class="space-y-3">
            <div v-for="alert in recentAlerts" :key="alert.id" class="flex items-start gap-3 p-3 rounded-lg bg-surface-2 border border-surface">
              <UIcon 
                :name="alert.status === 'active' ? 'i-lucide-alert-triangle' : 'i-lucide-check-circle'" 
                :class="alert.status === 'active' ? (alert.severity === 'critical' ? 'text-red-500' : 'text-orange-500') : 'text-green-500'" 
                class="size-5 mt-0.5 shrink-0" 
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-foam truncate">
                  <NuxtLink :to="`/net/devices/${alert.device_id}`" class="hover:underline">{{ alert.device_name }}</NuxtLink>
                </p>
                <p class="text-xs text-(--color-muted) mt-1">{{ alert.message }}</p>
                <p class="text-xs text-faint mt-1">{{ new Date(alert.timestamp).toLocaleString() }}</p>
              </div>
            </div>
          </div>
        </section>

        <section class="panel p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-display text-sm font-semibold uppercase tracking-wider text-(--color-muted)">Top Talkers (NetFlow)</h2>
            <NuxtLink to="/net/flows" class="text-xs text-primary-400 hover:text-primary-300">View All</NuxtLink>
          </div>
          <div v-if="!topTalkers.length" class="text-sm text-(--color-muted)">No flow data.</div>
          <div v-else class="space-y-3">
            <div v-for="flow in topTalkers" :key="flow.id" class="flex flex-col gap-1 p-3 rounded-lg bg-surface-2 border border-surface">
              <div class="flex justify-between items-center text-sm">
                <span class="font-medium text-foam">{{ flow.device_name }}</span>
                <span class="text-primary-400 font-mono">{{ formatBytes(flow.bytes) }}</span>
              </div>
              <div class="flex justify-between items-center text-xs text-faint">
                <span class="font-mono">{{ flow.src_ip }} &rarr; {{ flow.dst_ip }}</span>
                <span>{{ flow.protocol }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="panel p-5 md:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-display text-sm font-semibold uppercase tracking-wider text-(--color-muted)">Availability Map</h2>
          </div>
          <div class="flex gap-4 overflow-x-auto pb-4">
            <NuxtLink v-for="dev in devices" :key="dev.id" :to="`/net/devices/${dev.id}`" 
              class="flex flex-col items-center justify-center p-4 rounded-xl border transition shrink-0 w-32"
              :class="dev.status === 'up' ? 'border-green-500/20 bg-green-500/5 hover:border-green-500/50' : 'border-red-500/20 bg-red-500/5 hover:border-red-500/50'">
              <UIcon :name="dev.category === 'network' ? 'i-lucide-network' : dev.category === 'storage' ? 'i-lucide-database' : dev.category === 'iot' ? 'i-lucide-cpu' : 'i-lucide-server'" 
                class="size-8 mb-2" :class="dev.status === 'up' ? 'text-green-500' : 'text-red-500'" />
              <span class="text-xs font-medium text-foam text-center truncate w-full">{{ dev.hostname }}</span>
              <span class="text-[10px] text-faint mt-1 uppercase">{{ dev.status }}</span>
            </NuxtLink>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

