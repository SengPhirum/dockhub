export interface NetSummary {
  devicesOnline: number
  devicesDown: number
  avgLatencyMs: number
  bandwidthWarnings: number
}

// Build-time constant (see nuxt.config.ts's vite.define) rather than
// useRuntimeConfig() - once exposed via Module Federation, this component
// runs inside the portal's own Nuxt/Vue instance, not its own, so runtime
// config would resolve to the portal's, not this remote's.
declare const __KNETRAHUB_NET_API_BASE__: string

/**
 * Example API client for KNetraHub-Net-API. Talks to the subsystem's own
 * API (NUXT_PUBLIC_KNETRAHUB_NET_API_BASE), never to the portal's database -
 * the portal and this remote are both just frontends to their own backends.
 *
 * `authToken` is the short-lived token RemoteModuleLoader fetched from the
 * portal (not the portal's own session cookie, which this remote's JS can't
 * read) - forwarded as Authorization: Bearer so KNetraHub-Net-API can verify
 * who's calling and check their permission itself. No token means no auth
 * header; the API must reject the request rather than treat it as trusted.
 */
export function useNetApi(authToken?: string) {
  async function getSummary(): Promise<NetSummary> {
    return await $fetch<NetSummary>(`${__KNETRAHUB_NET_API_BASE__}/net/summary`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
    })
  }

  return { getSummary }
}
