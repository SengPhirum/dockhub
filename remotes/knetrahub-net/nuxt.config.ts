import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { federation } from '@module-federation/vite'

// KNetraHub-Net remote UI. CSR-only (ssr: false) - sidesteps SSR/Module
// Federation conflicts entirely; the KNetraHub portal loads this remote's
// exposed component purely client-side via @module-federation/runtime
// (see app/components/RemoteModuleLoader.vue in the portal repo).
export default defineNuxtConfig({
  compatibilityDate: '2025-06-01',
  devtools: { enabled: false },
  ssr: false,

  css: ['~/assets/main.css'],

  vite: {
    // Build-time constant, not runtime config: once ./NetApp is loaded into
    // the portal via Module Federation, it executes inside the *portal's*
    // Vue/Nuxt instance, not its own - useRuntimeConfig() there resolves to
    // the portal's runtime config (no apiBase key), not this remote's.
    // Confirmed live: without this, the exposed component's API call went to
    // "http://localhost:3000/undefined/net/summary" (the portal's own
    // origin). A compile-time define works in both standalone preview mode
    // and federated mode, since it's baked into the chunk either way.
    define: {
      __KNETRAHUB_NET_API_BASE__: JSON.stringify(process.env.NUXT_PUBLIC_KNETRAHUB_NET_API_BASE || 'http://localhost:4101/api')
    },
    plugins: [
      tailwindcss(),
      federation({
        name: 'knetrahub_net',
        filename: 'remoteEntry.js',
        exposes: {
          './NetApp': './app/components/NetApp.vue'
        },
        shared: {
          vue: { singleton: true, requiredVersion: false }
        }
      })
    ]
  },

  app: {
    head: { title: 'KNetraHub-Net' }
  },

  // remoteEntry.js (and the chunks it dynamically imports from /_nuxt/) are
  // loaded as a cross-origin ES module by the portal (different port/origin
  // in dev, likely a different subdomain in production) - browsers enforce
  // CORS for module imports unlike classic <script> tags, so without this
  // the load fails with "blocked by CORS policy" even though the request
  // itself succeeds. These are public, non-sensitive JS bundles, so a
  // permissive origin is the standard, expected posture for an MF remote.
  routeRules: {
    '/remoteEntry.js': { headers: { 'Access-Control-Allow-Origin': '*' } },
    '/_nuxt/**': { headers: { 'Access-Control-Allow-Origin': '*' } }
  },

  hooks: {
    // @module-federation/vite emits remoteEntry.js as a client build chunk
    // that no page actually references in its own <script> tags (the host
    // portal fetches it independently) - Nitro's default public-asset copy
    // only follows each page's referenced assets, so without this it never
    // makes it from the Vite build cache into .output/public. Confirmed by
    // building once without this hook: remoteEntry.js landed at
    // node_modules/.cache/nuxt/.nuxt/dist/client/remoteEntry.js but was
    // absent from .output/public entirely.
    'nitro:config': (nitroConfig) => {
      nitroConfig.publicAssets = nitroConfig.publicAssets || []
      nitroConfig.publicAssets.push({
        dir: resolve(process.cwd(), 'node_modules/.cache/nuxt/.nuxt/dist/client'),
        baseURL: '/',
        maxAge: 0
      })
    }
  }
})
