import type { AppKey } from '../../shared/utils/entitlements'

/**
 * Which page routes belong to which app. The "Dock" app keeps the original
 * Docker Swarm page paths (no mass URL rewrite); its dashboard lives at /dock.
 * Monitoring (merged Network + Server) and IP Management are in-process SPA
 * modules owning the /monitoring and /ipmgt route subtrees respectively.
 * Legacy /net and /server links are redirected to /monitoring/network and
 * /monitoring/server by legacy-monitoring.global.ts. Used by the contextual
 * sidebar (useNav) and the client access guard (route-access).
 */
export const DOCKER_ROUTE_PREFIXES = [
  '/docker',
  '/nodes',
  '/stacks',
  '/services',
  '/tasks',
  '/containers',
  '/networks',
  '/volumes',
  '/secrets',
  '/configs',
  '/registry',
  '/registries'
]

export const MONITORING_ROUTE_PREFIXES = ['/monitoring']
export const IPMGT_ROUTE_PREFIXES = ['/ipmgt']

function matches(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix + '/')
}

/** The app a given route belongs to, or null for portal pages (launcher, settings…). */
export function appKeyForRoute(path: string): AppKey | null {
  if (DOCKER_ROUTE_PREFIXES.some((p) => matches(path, p))) return 'docker'
  if (MONITORING_ROUTE_PREFIXES.some((p) => matches(path, p))) return 'monitoring'
  if (IPMGT_ROUTE_PREFIXES.some((p) => matches(path, p))) return 'ipmgt'
  return null
}
