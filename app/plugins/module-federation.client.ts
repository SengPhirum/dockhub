import { init } from '@module-federation/runtime'
import { version as vueVersion } from 'vue'

/**
 * Initializes the Module Federation host once. Remotes aren't registered
 * here - RemoteModuleLoader registers each one dynamically, right before
 * loading it, since the set of enabled remotes comes from the module
 * registry (app/utils/moduleRegistry.ts) and can change without a rebuild.
 *
 * Sharing vue as a singleton is required, not optional: without the host
 * contributing its own Vue instance to the share scope, a remote's
 * `shared: { vue: { singleton: true } }` has nothing to negotiate against
 * and silently falls back to its own bundled Vue copy. The remote still
 * *renders* fine (the host's renderer mounts it), but its own ref()/reactive()
 * calls run on a different reactivity system than the one driving its
 * render - confirmed live: KNetraHub-Net's mock-data fallback assignment
 * logged correctly to the console but never updated the rendered DOM until
 * this fix was added.
 */
export default defineNuxtPlugin(() => {
  init({
    name: 'knetrahub_portal',
    remotes: [],
    shared: {
      vue: {
        version: vueVersion,
        scope: 'default',
        lib: () => import('vue'),
        shareConfig: { singleton: true, requiredVersion: false }
      }
    }
  })
})
