<script setup lang="ts">
import { registerRemotes, loadRemote } from '@module-federation/runtime'
import type { ModuleDefinition } from '../../shared/types/module'

const props = defineProps<{ moduleKey: string }>()

type LoadState = 'loading' | 'ready' | 'error'

const registry = getModuleRegistry()
const moduleDef = computed<ModuleDefinition | undefined>(() => registry.find((m) => m.key === props.moduleKey))

const state = ref<LoadState>('loading')
const errorMessage = ref('')
const RemoteComponent = shallowRef<any>(null)
// Short-lived token the remote forwards to its own API (Authorization:
// Bearer) - never the portal's own httpOnly session cookie. See
// server/api/auth/subsystem-token.get.ts and Step 14 in the architecture docs.
const authToken = ref('')

// Registering the same remote name twice throws in some MF runtime versions -
// track what this client has already registered across retries/navigations.
const registeredRemotes = useState<Set<string>>('mf_registered_remotes', () => new Set())

async function logFailure(def: ModuleDefinition | undefined, message: string) {
  try {
    await $fetch('/api/modules/load-failure', {
      method: 'POST',
      body: { moduleKey: def?.key, remoteName: def?.remoteName, remoteEntryUrl: def?.remoteEntryUrl, error: message }
    })
  } catch {
    // Best-effort only - a logging failure must never block the UI.
  }
}

async function load() {
  state.value = 'loading'
  errorMessage.value = ''
  RemoteComponent.value = null
  const def = moduleDef.value

  if (!def) {
    state.value = 'error'
    errorMessage.value = `Unknown module "${props.moduleKey}".`
    return
  }
  if (def.type !== 'remote' || !def.remoteName || !def.exposedModule || !def.remoteEntryUrl) {
    state.value = 'error'
    errorMessage.value = 'This module is not configured as a remote.'
    return
  }

  try {
    const tokenRes = await $fetch<{ token: string }>('/api/auth/subsystem-token')
    authToken.value = tokenRes.token

    if (!registeredRemotes.value.has(def.remoteName)) {
      // type: 'module' is required - @module-federation/vite builds remoteEntry.js
      // as an ES module (it ends in `export { get, init }`), but the runtime
      // defaults to injecting a classic <script>, which throws "Unexpected
      // token 'export'" and silently fails the load without this.
      registerRemotes([{ name: def.remoteName, entry: def.remoteEntryUrl, type: 'module' }])
      registeredRemotes.value.add(def.remoteName)
    }
    const exposedPath = def.exposedModule.replace(/^\.\//, '')
    const mod = await loadRemote<any>(`${def.remoteName}/${exposedPath}`)
    const comp = mod?.default ?? mod
    if (!comp) throw new Error('Remote loaded but exposed no component.')
    RemoteComponent.value = comp
    state.value = 'ready'
  } catch (err: any) {
    state.value = 'error'
    errorMessage.value = err?.message || `Could not reach ${def.remoteEntryUrl}`
    await logFailure(def, errorMessage.value)
  }
}

// Contains crashes thrown while *rendering* the remote component too, not
// just load failures - the host must never go down because a remote did.
onErrorCaptured((err: any) => {
  state.value = 'error'
  errorMessage.value = err?.message || 'The remote module crashed while rendering.'
  logFailure(moduleDef.value, errorMessage.value)
  return false
})

onMounted(load)
</script>

<template>
  <div>
    <div v-if="state === 'loading'" class="panel flex flex-col items-center gap-3 p-10 text-center">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-beacon" />
      <p class="text-sm text-(--color-muted)">Loading {{ moduleDef?.name || moduleKey }}…</p>
    </div>

    <div v-else-if="state === 'error'" class="panel flex flex-col items-center gap-3 p-10 text-center">
      <UIcon name="i-lucide-plug-zap" class="size-8 text-faint" />
      <div>
        <p class="font-medium text-foam">{{ moduleDef?.name || moduleKey }} is unavailable</p>
        <p class="mt-1 max-w-md text-xs text-(--color-muted)">{{ errorMessage }}</p>
      </div>
      <UButton color="neutral" variant="soft" icon="i-lucide-rotate-ccw" label="Retry" @click="load" />
    </div>

    <component :is="RemoteComponent" v-else :auth-token="authToken" />
  </div>
</template>
