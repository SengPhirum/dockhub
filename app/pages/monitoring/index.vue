<script setup lang="ts">
// Unified Monitoring overview: a cross-domain landing that summarises the two
// sections of the merged Monitoring app - Network (device/ping/SNMP) and Server
// (host/CPU/memory) - and links into each. The section dashboards still live at
// /monitoring/network and /monitoring/server; the data is served by the
// unchanged /api/net and /api/server routes. Gated by the monitoring tier.
const { hasApp } = useAuth()

const { data: devices } = useAsyncData('monitorNetDevices', () => $fetch<any[]>('/api/net/devices'), { default: () => [], server: false })
const { data: netAlerts } = useAsyncData('monitorNetAlerts', () => $fetch<any[]>('/api/net/alerts'), { default: () => [], server: false })
const { data: hosts } = useAsyncData('monitorSrvHosts', () => $fetch<any[]>('/api/server/hosts'), { default: () => [], server: false })
const { data: problems } = useAsyncData('monitorSrvProblems', () => $fetch<any[]>('/api/server/problems'), { default: () => [], server: false })

const net = computed(() => {
  const d = devices.value || []
  const a = netAlerts.value || []
  return {
    total: d.length,
    up: d.filter((x: any) => x.status === 'up').length,
    down: d.filter((x: any) => x.status === 'down').length,
    alerts: a.filter((x: any) => x.status === 'active').length
  }
})

const srv = computed(() => {
  const h = hosts.value || []
  const p = problems.value || []
  return {
    total: h.length,
    problems: p.length,
    high: p.filter((x: any) => x.severity === 'High' || x.severity === 'Disaster').length
  }
})

const netLinks = [
  { label: 'Devices', to: '/monitoring/network/devices', icon: 'i-lucide-router' },
  { label: 'Sensors', to: '/monitoring/network/sensors', icon: 'i-lucide-gauge' },
  { label: 'Maps', to: '/monitoring/maps', icon: 'i-lucide-map' },
  { label: 'Problems', to: '/monitoring/problems', icon: 'i-lucide-triangle-alert' },
  { label: 'Discovery', to: '/monitoring/discovery', icon: 'i-lucide-scan-line' }
]
const srvLinks = [
  { label: 'Hosts', to: '/monitoring/server/hosts', icon: 'i-lucide-server' },
  { label: 'Problems', to: '/monitoring/problems', icon: 'i-lucide-triangle-alert' },
  { label: 'Maps', to: '/monitoring/maps', icon: 'i-lucide-map' }
]
</script>

<template>
  <div>
    <PageHeader title="Monitoring" subtitle="Unified network and server infrastructure health" icon="i-lucide-activity" />

    <div v-if="!hasApp('monitoring')" class="panel flex flex-col items-center gap-2 p-10 text-center">
      <UIcon name="i-lucide-lock" class="size-6 text-faint" />
      <p class="text-sm text-(--color-muted)">You don't have access to KNetraHub-Monitoring.</p>
    </div>

    <div v-else class="grid gap-4 xl:grid-cols-2">
      <!-- Network section -->
      <section class="panel p-5">
        <div class="mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-network" class="size-5 text-beacon" />
          <h2 class="font-display text-sm font-semibold uppercase tracking-wider text-foam">Network</h2>
          <NuxtLink to="/monitoring/network" class="ml-auto text-xs text-beacon hover:underline">Open dashboard -></NuxtLink>
        </div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="flex flex-col justify-center rounded-lg bg-surface-2 px-4 py-3">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-faint">Devices</span>
            <span class="mt-1 font-display text-2xl font-bold text-foam">{{ net.total }}</span>
          </div>
          <div class="flex flex-col justify-center rounded-lg bg-surface-2 px-4 py-3">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-faint">Up</span>
            <span class="mt-1 font-display text-2xl font-bold text-green-500">{{ net.up }}</span>
          </div>
          <div class="flex flex-col justify-center rounded-lg bg-surface-2 px-4 py-3">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-faint">Down</span>
            <span class="mt-1 font-display text-2xl font-bold text-red-500">{{ net.down }}</span>
          </div>
          <div class="flex flex-col justify-center rounded-lg bg-surface-2 px-4 py-3">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-faint">Active Alerts</span>
            <span class="mt-1 font-display text-2xl font-bold text-orange-500">{{ net.alerts }}</span>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <UButton v-for="l in netLinks" :key="l.to" :to="l.to" :icon="l.icon" size="xs" color="neutral" variant="soft" :label="l.label" />
        </div>
      </section>

      <!-- Server section -->
      <section class="panel p-5">
        <div class="mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-server-cog" class="size-5 text-beacon" />
          <h2 class="font-display text-sm font-semibold uppercase tracking-wider text-foam">Server</h2>
          <NuxtLink to="/monitoring/server" class="ml-auto text-xs text-beacon hover:underline">Open dashboard -></NuxtLink>
        </div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div class="flex flex-col justify-center rounded-lg bg-surface-2 px-4 py-3">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-faint">Hosts</span>
            <span class="mt-1 font-display text-2xl font-bold text-foam">{{ srv.total }}</span>
          </div>
          <div class="flex flex-col justify-center rounded-lg bg-surface-2 px-4 py-3">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-faint">Problems</span>
            <span class="mt-1 font-display text-2xl font-bold text-orange-500">{{ srv.problems }}</span>
          </div>
          <div class="flex flex-col justify-center rounded-lg bg-surface-2 px-4 py-3">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-faint">High Severity</span>
            <span class="mt-1 font-display text-2xl font-bold text-red-500">{{ srv.high }}</span>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <UButton v-for="l in srvLinks" :key="l.to" :to="l.to" :icon="l.icon" size="xs" color="neutral" variant="soft" :label="l.label" />
        </div>
      </section>
    </div>
  </div>
</template>
