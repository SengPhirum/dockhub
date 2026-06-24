import type { AppKey } from '../../shared/utils/entitlements'

/**
 * Which page routes belong to which app. The "Dock" app keeps the original
 * Docker Swarm page paths (no mass URL rewrite); its dashboard lives at /dock.
 * net/server/ipmgt each own their single remote-host route. Used by the
 * contextual sidebar (useNav) and the client access guard (route-access).
 */
export const DOCKER_ROUTE_PREFIXES = [
  '/dock',
  '/nodes',
  '/stacks',
  '/services',
  '/tasks',
  '/containers',
  '/networks',
  '/volumes',
  '/secrets',
  '/configs',
  '/registries'
]

function matches(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix + '/')
}

/** The app a given route belongs to, or null for portal pages (launcher, settings…). */
export function appKeyForRoute(path: string): AppKey | null {
  if (DOCKER_ROUTE_PREFIXES.some((p) => matches(path, p))) return 'docker'
  if (matches(path, '/net')) return 'net'
  if (matches(path, '/server')) return 'server'
  if (matches(path, '/ipmgt')) return 'ipmgt'
  return null
}
