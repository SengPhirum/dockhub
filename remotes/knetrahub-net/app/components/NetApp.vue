<script setup lang="ts">
// This is the component exposed as "./NetApp" via Module Federation - it's
// what actually mounts inside the KNetraHub portal at /net. No login here:
// the portal already authenticated the user before loading this remote.
import { useNetApi, type NetSummary } from '../composables/useNetApi'

// Provided by RemoteModuleLoader (see portal repo) - the portal's own
// session cookie is httpOnly and unreachable from this remote's JS by
// design, so the portal mints this short-lived token instead.
const props = defineProps<{ authToken?: string }>()

const { getSummary } = useNetApi(props.authToken)
const summary = ref<NetSummary | null>(null)
const note = ref('')

async function load() {
  note.value = ''
  try {
    summary.value = await getSummary()
  } catch {
    // KNetraHub-Net-API isn't required to be running for this example to
    // render - falls back to mock numbers, same "never crash" approach the
    // portal's RemoteModuleLoader takes toward this remote.
    summary.value = { devicesOnline: 42, devicesDown: 2, avgLatencyMs: 18, bandwidthWarnings: 1 }
    note.value = 'Could not reach KNetraHub-Net-API - showing mock data.'
  }
}

onMounted(load)
</script>

<template>
  <div class="rounded-xl border border-slate-700 bg-slate-900 p-5 text-slate-100">
    <div class="mb-4 flex items-center gap-2">
      <span class="flex size-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
        <svg viewBox="0 0 24 24" fill="none" class="size-4"><path stroke="currentColor" stroke-width="2" d="M3 12h4l3 8 4-16 3 8h4" /></svg>
      </span>
      <div>
        <h2 class="text-sm font-semibold">KNetraHub-Net</h2>
        <p class="text-xs text-slate-400">Network Monitoring</p>
      </div>
    </div>

    <p v-if="note" class="mb-3 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-300">{{ note }}</p>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-lg border border-slate-700 bg-slate-800 p-3 text-center">
        <p class="text-2xl font-bold text-emerald-400">{{ summary?.devicesOnline ?? '-' }}</p>
        <p class="mt-1 text-[11px] text-slate-400">Devices Online</p>
      </div>
      <div class="rounded-lg border border-slate-700 bg-slate-800 p-3 text-center">
        <p class="text-2xl font-bold text-rose-400">{{ summary?.devicesDown ?? '-' }}</p>
        <p class="mt-1 text-[11px] text-slate-400">Devices Down</p>
      </div>
      <div class="rounded-lg border border-slate-700 bg-slate-800 p-3 text-center">
        <p class="text-2xl font-bold text-slate-100">{{ summary?.avgLatencyMs ?? '-' }}<span class="text-sm">ms</span></p>
        <p class="mt-1 text-[11px] text-slate-400">Average Latency</p>
      </div>
      <div class="rounded-lg border border-slate-700 bg-slate-800 p-3 text-center">
        <p class="text-2xl font-bold text-amber-400">{{ summary?.bandwidthWarnings ?? '-' }}</p>
        <p class="mt-1 text-[11px] text-slate-400">Bandwidth Warning</p>
      </div>
    </div>
  </div>
</template>
