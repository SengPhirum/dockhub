<script setup lang="ts">
type NodeViewMode = 'cards' | 'list'
type NodeUsage = {
  id: string
  available: boolean
  sampledAt: string
  error?: string
  cpu: { cores: number; percent: number }
  memory: { usedBytes: number; totalBytes: number; percent: number }
  disk: { usedBytes: number; totalBytes?: number; percent?: number }
  containers: { running: number; sampled: number }
}
type NodeUsageMetric = {
  key: 'cpu' | 'memory' | 'disk'
  label: string
  value: string
  hint: string
  percent?: number
  available: boolean
}

const { can } = useAuth()
const { bytes, cpus, short } = useFormat()
const { prefs } = usePreferences()
const toast = useToast()

const viewMode = useLocalStorage<NodeViewMode>('dockhub:nodes:view', 'cards')

const { data, status, error, refreshing, refresh } = useApiCache('nodes', () => $fetch<any[]>('/api/nodes'))
const usageData = useState<{ sampledAt: string; nodes: NodeUsage[] } | null>('nodes:usage', () => null)
const usageRefreshing = ref(false)

onMounted(() => {
  refresh()
  refreshUsage()
})

const nodes = computed(() => data.value ?? [])
const usageById = computed(() => new Map((usageData.value?.nodes || []).map((usage) => [usage.id, usage])))

const viewOptions: Array<{ value: NodeViewMode; icon: string; label: string }> = [
  { value: 'cards', icon: 'i-lucide-layout-grid', label: 'Cards' },
  { value: 'list', icon: 'i-lucide-list', label: 'List' }
]

const { connected } = useDockerEvents((evt) => {
  if (evt.type === 'node') {
    refresh()
    refreshUsage()
  }
})
useIntervalFn(() => {
  if (!connected.value && prefs.value.refreshInterval > 0) {
    refresh()
    refreshUsage()
  }
}, computed(() => prefs.value.refreshInterval > 0 ? prefs.value.refreshInterval * 1000 : 60_000), { immediate: false })
useIntervalFn(refreshUsage, 5000, { immediate: false })

async function refreshAll() {
  await Promise.all([refresh(), refreshUsage()])
}

async function refreshUsage() {
  if (usageRefreshing.value) return
  usageRefreshing.value = true
  try {
    usageData.value = await $fetch('/api/nodes/usage')
  } catch {
    // Keep the last good sample on screen; the base node list still owns visible errors.
  } finally {
    usageRefreshing.value = false
  }
}

async function patch(node: any, body: any, label: string) {
  const saved = [...(data.value ?? [])]
  const idx = saved.findIndex((n) => n.id === node.id)
  if (idx !== -1) data.value = saved.map((n, i) => i === idx ? { ...n, ...body } : n)
  try {
    await $fetch(`/api/nodes/${node.id}`, { method: 'PATCH', body })
    toast.add({ title: `${node.hostname}: ${label}`, color: 'primary', icon: 'i-lucide-server' })
    refresh()
  } catch (e: any) {
    data.value = saved
    toast.add({ title: 'Action failed', description: e?.data?.statusMessage, color: 'error' })
  }
}

function menu(n: any) {
  const items: any[] = [[{ label: 'Inspect', icon: 'i-lucide-eye', to: `/nodes/${n.id}` }]]
  if (can('operator')) {
    const avail: any[] = []
    if (n.availability !== 'active') avail.push({ label: 'Activate', icon: 'i-lucide-play', onSelect: () => patch(n, { availability: 'active' }, 'activated') })
    if (n.availability !== 'pause') avail.push({ label: 'Pause', icon: 'i-lucide-pause', onSelect: () => patch(n, { availability: 'pause' }, 'paused') })
    if (n.availability !== 'drain') avail.push({ label: 'Drain', icon: 'i-lucide-download', onSelect: () => patch(n, { availability: 'drain' }, 'draining') })
    items.push(avail)
    items.push([
      n.role === 'worker'
        ? { label: 'Promote to manager', icon: 'i-lucide-arrow-up', onSelect: () => patch(n, { role: 'manager' }, 'promoted') }
        : { label: 'Demote to worker', icon: 'i-lucide-arrow-down', onSelect: () => patch(n, { role: 'worker' }, 'demoted') }
    ])
  }
  return items
}

function availabilityState(n: any) {
  return n.availability === 'active' ? n.state : n.availability
}

function engineVersion(n: any) {
  return n.engine ? `docker ${n.engine}` : 'docker -'
}

function platformLabel(n: any) {
  return n.platform || '-'
}

function labelEntries(n: any) {
  return Object.entries(n.labels || {}) as Array<[string, string]>
}

function labelSummary(n: any) {
  const entries = labelEntries(n)
  if (!entries.length) return '-'
  const shown = entries.slice(0, 2).map(([k, v]) => `${k}=${v}`).join(', ')
  return entries.length > 2 ? `${shown}, +${entries.length - 2}` : shown
}

function percentLabel(value: number | undefined) {
  if (value == null || !Number.isFinite(value)) return '-'
  return `${Math.round(value)}%`
}

function nodeUsage(n: any) {
  return usageById.value.get(n.id)
}

function metricMeterStyle(percent: number | undefined, available: boolean) {
  const safePercent = available && percent != null ? Math.max(3, Math.min(100, Math.round(percent))) : 0
  const color = !available
    ? 'var(--color-idle)'
    : safePercent >= 90
      ? 'var(--color-down)'
      : safePercent >= 75
        ? 'var(--color-pending)'
        : 'var(--color-running)'
  return {
    background: `conic-gradient(${color} ${safePercent}%, color-mix(in srgb, var(--color-hull) 82%, transparent) 0)`
  }
}

function usageMetrics(n: any): NodeUsageMetric[] {
  const usage = nodeUsage(n)
  const available = !!usage?.available
  const diskHasPercent = usage?.disk.percent != null

  return [
    {
      key: 'cpu',
      label: 'cpu',
      value: available ? percentLabel(usage?.cpu.percent) : '-',
      hint: available ? `${Number(usage?.cpu.cores || 0).toFixed(1)} used / ${cpus(n.cpus)}` : usage?.error || 'Metrics unavailable',
      percent: usage?.cpu.percent,
      available
    },
    {
      key: 'memory',
      label: 'ram',
      value: available ? percentLabel(usage?.memory.percent) : '-',
      hint: available ? `${bytes(usage?.memory.usedBytes || 0)} / ${bytes(usage?.memory.totalBytes || n.memory || 0)}` : usage?.error || 'Metrics unavailable',
      percent: usage?.memory.percent,
      available
    },
    {
      key: 'disk',
      label: 'disk',
      value: available ? (diskHasPercent ? percentLabel(usage?.disk.percent) : bytes(usage?.disk.usedBytes || 0)) : '-',
      hint: available
        ? diskHasPercent
          ? `${bytes(usage?.disk.usedBytes || 0)} / ${bytes(usage?.disk.totalBytes || 0)}`
          : `${bytes(usage?.disk.usedBytes || 0)} Docker data`
        : usage?.error || 'Metrics unavailable',
      percent: usage?.disk.percent,
      available
    }
  ]
}

function badgeClass(kind: string) {
  const state = (kind || '').toLowerCase()
  if (['ready', 'active', 'reachable'].includes(state)) return 'bg-running/15 text-(--color-running-ink) ring-running/25'
  if (['leader'].includes(state)) return 'bg-pending/20 text-(--color-pending-ink) ring-pending/30'
  if (['manager'].includes(state)) return 'bg-beacon/15 text-beacon ring-beacon/25'
  if (['worker'].includes(state)) return 'bg-idle/15 text-(--color-idle-ink) ring-idle/25'
  if (['pause', 'paused', 'drain', 'drained'].includes(state)) return 'bg-idle/15 text-(--color-idle-ink) ring-idle/25'
  if (['down', 'failed'].includes(state)) return 'bg-down/15 text-(--color-down-ink) ring-down/25'
  return 'bg-surface-2 text-(--color-muted) ring-hull'
}

function nodeBadges(n: any) {
  const badges = [
    n.state || 'unknown',
    ...(n.leader ? ['leader'] : []),
    n.role || 'unknown',
    n.availability || 'unknown'
  ]
  return badges.map((label) => ({
    label: String(label).toUpperCase(),
    class: badgeClass(String(label))
  }))
}
</script>

<template>
  <div>
    <PageHeader title="Nodes" subtitle="Managers and workers in the swarm fleet" icon="i-lucide-server">
      <template #actions>
        <div class="flex rounded-md border border-hull bg-surface p-0.5" aria-label="Node view">
          <button
            v-for="opt in viewOptions"
            :key="opt.value"
            type="button"
            class="flex size-8 items-center justify-center rounded text-(--color-muted) transition hover:text-foam"
            :class="viewMode === opt.value ? 'bg-beacon/15 text-beacon ring-1 ring-inset ring-beacon/25' : ''"
            :title="opt.label"
            :aria-label="`${opt.label} view`"
            :aria-pressed="viewMode === opt.value"
            @click="viewMode = opt.value"
          >
            <UIcon :name="opt.icon" class="size-4" />
          </button>
        </div>
        <div class="flex items-center gap-1.5 text-xs text-faint select-none">
          <span class="dot" :class="connected ? 'dot-running' : 'dot-idle'" />
          {{ connected ? 'Live' : prefs.refreshInterval > 0 ? `${prefs.refreshInterval}s` : 'Manual' }}
        </div>
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" :loading="refreshing || usageRefreshing" @click="refreshAll()" />
      </template>
    </PageHeader>

    <DataState :status="status" :error="error" :empty="!nodes.length" :refreshing="refreshing" empty-label="No nodes found." empty-icon="i-lucide-server">
      <TransitionGroup
        v-if="viewMode === 'cards'"
        name="list"
        tag="div"
        class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3"
      >
        <article
          v-for="n in nodes"
          :key="n.id"
          class="panel-flush rounded-lg p-4 transition hover:ring-1 hover:ring-beacon/30"
        >
          <div class="flex items-start justify-between gap-3">
            <NuxtLink :to="`/nodes/${n.id}`" class="group flex min-w-0 items-start gap-3">
              <span
                class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-(--color-muted) ring-1 ring-hull"
                :class="n.leader ? 'sonar text-beacon ring-beacon/35' : ''"
              >
                <UIcon :name="n.leader ? 'i-lucide-anchor' : 'i-lucide-server'" class="size-5" />
              </span>
              <span class="min-w-0">
                <span class="block truncate font-display text-base font-semibold text-foam group-hover:text-beacon">{{ n.hostname || '-' }}</span>
                <span class="mt-0.5 block truncate font-mono text-xs text-faint">{{ n.addr || '-' }}</span>
              </span>
            </NuxtLink>
            <UDropdownMenu :items="menu(n)" :content="{ align: 'end' }">
              <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="sm" aria-label="Actions" />
            </UDropdownMenu>
          </div>

          <div class="mt-4 flex items-center gap-2 text-sm text-foam">
            <UIcon name="i-lucide-box" class="size-4 text-faint" />
            <span>{{ engineVersion(n) }}</span>
            <span class="min-w-0 truncate font-mono text-xs text-faint">{{ platformLabel(n) }}</span>
          </div>

          <div class="mt-4 flex flex-wrap gap-1.5">
            <span
              v-for="badge in nodeBadges(n)"
              :key="badge.label"
              class="rounded px-2 py-1 text-[11px] font-semibold leading-none ring-1"
              :class="badge.class"
            >
              {{ badge.label }}
            </span>
          </div>

          <div class="mt-5 grid gap-3 sm:grid-cols-3">
            <div
              v-for="metric in usageMetrics(n)"
              :key="metric.key"
              class="flex items-center gap-3 rounded-md bg-surface/70 p-3 ring-1 ring-hull-soft"
              :title="metric.hint"
            >
              <div class="node-meter" :style="metricMeterStyle(metric.percent, metric.available)">
                <div class="node-meter-core">
                  <span class="font-display text-[13px] font-semibold text-foam">{{ metric.value }}</span>
                  <span class="text-[11px] leading-none text-faint">{{ metric.label }}</span>
                </div>
              </div>
              <div class="min-w-0">
                <p class="text-xs font-medium uppercase text-faint">{{ metric.label }}</p>
                <p class="truncate font-mono text-xs text-foam">{{ metric.hint }}</p>
              </div>
            </div>
          </div>

          <dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-hull-soft pt-3 text-xs">
            <div>
              <dt class="text-faint">Reachability</dt>
              <dd class="mt-0.5 truncate font-mono text-(--color-muted)">{{ n.reachability || '-' }}</dd>
            </div>
            <div>
              <dt class="text-faint">Node ID</dt>
              <dd class="mt-0.5 truncate font-mono text-(--color-muted)">{{ short(n.id, 10) || '-' }}</dd>
            </div>
            <div class="col-span-2">
              <dt class="text-faint">Labels</dt>
              <dd class="mt-0.5 truncate font-mono text-(--color-muted)" :title="labelSummary(n)">{{ labelSummary(n) }}</dd>
            </div>
          </dl>
        </article>
      </TransitionGroup>

      <div v-else class="space-y-2">
        <div class="hidden rounded-md px-3.5 text-[11px] font-semibold uppercase tracking-wide text-faint xl:grid xl:grid-cols-[minmax(0,1.35fr)_1.15fr_1.05fr_1.2fr_1.05fr_auto] xl:items-center xl:gap-4">
          <span>Node</span>
          <span>Status</span>
          <span>Engine</span>
          <span>Usage</span>
          <span>Labels</span>
          <span class="text-right">Actions</span>
        </div>
        <TransitionGroup name="list" tag="div" class="space-y-2">
          <div
            v-for="n in nodes"
            :key="n.id"
            class="panel-flush grid gap-3 rounded-lg p-3.5 transition hover:ring-1 hover:ring-beacon/30 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_1.15fr_1.05fr_1.2fr_1.05fr_auto] xl:items-center xl:gap-4"
          >
            <div class="min-w-0 sm:col-span-2 xl:col-span-1">
              <NuxtLink :to="`/nodes/${n.id}`" class="group flex items-center gap-2">
                <span v-if="n.leader" class="sonar text-beacon"><UIcon name="i-lucide-anchor" class="size-4" /></span>
                <span v-else class="dot" :class="n.state === 'ready' ? 'dot-running' : 'dot-down'" />
                <span class="truncate font-medium text-foam group-hover:text-beacon">{{ n.hostname || '-' }}</span>
              </NuxtLink>
              <p class="mt-1 truncate pl-6 font-mono text-xs text-faint">{{ n.addr || '-' }} - {{ platformLabel(n) }}</p>
            </div>

            <div class="flex min-w-0 flex-wrap gap-1.5">
              <span
                v-for="badge in nodeBadges(n)"
                :key="badge.label"
                class="rounded px-2 py-1 text-[11px] font-semibold leading-none ring-1"
                :class="badge.class"
              >
                {{ badge.label }}
              </span>
            </div>

            <div class="min-w-0">
              <p class="truncate text-sm text-foam">{{ engineVersion(n) }}</p>
              <p class="truncate font-mono text-xs text-faint">{{ n.reachability || availabilityState(n) || '-' }}</p>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <div
                v-for="metric in usageMetrics(n)"
                :key="metric.key"
                class="min-w-0 rounded bg-surface/70 px-2 py-1.5 ring-1 ring-hull-soft"
                :title="metric.hint"
              >
                <p class="text-[10px] font-semibold uppercase text-faint">{{ metric.label }}</p>
                <p class="truncate font-mono text-xs text-foam">{{ metric.value }}</p>
              </div>
            </div>

            <div class="min-w-0 font-mono text-xs text-(--color-muted)" :title="labelSummary(n)">
              <span class="block truncate">{{ labelSummary(n) }}</span>
            </div>

            <div class="flex justify-end sm:col-span-2 xl:col-span-1">
              <UDropdownMenu :items="menu(n)" :content="{ align: 'end' }">
                <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="sm" aria-label="Actions" />
              </UDropdownMenu>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </DataState>
  </div>
</template>

<style scoped>
.node-meter {
  display: grid;
  width: 4.25rem;
  height: 4.25rem;
  flex: none;
  place-items: center;
  border-radius: 9999px;
}

.node-meter-core {
  display: flex;
  width: 3.25rem;
  height: 3.25rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: var(--color-abyss);
  text-align: center;
}
</style>
