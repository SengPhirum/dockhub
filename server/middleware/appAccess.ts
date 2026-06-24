import { readSession, resolveUserEntitlements } from '~~/server/utils/auth'

/**
 * Authoritative per-app access gate (KNetraHub). The "Dock" app is the existing
 * Docker Swarm feature set, still served by this app's own API. This middleware
 * is the real security boundary for it: any request to a Docker API route is
 * allowed only if the caller has a `docker` entitlement (resolved from their
 * Keycloak realm roles + the Settings app-role map, or the local-admin
 * superuser bypass). It also publishes the caller's effective tier on
 * event.context so the existing endpoint handlers' requireRole/requirePermission
 * checks enforce the per-app tier instead of the global role - without any of
 * those handlers changing.
 *
 * Net/Server/IPMgt are separate services with their own gates; their access is
 * carried in the short-lived subsystem token (issueSubsystemToken).
 *
 * Routes NOT in the Docker set (auth, user prefs, settings, portal audit, the
 * launcher's own data) fall through untouched and keep their original handler
 * guards (e.g. requireRole('admin') for portal administration).
 */

// Prefixes whose endpoints belong to the Dock app. system/overview + system/metrics
// are swarm dashboard data; system/audit is portal-admin and intentionally excluded.
const DOCKER_PREFIXES = [
  '/api/services',
  '/api/stacks',
  '/api/nodes',
  '/api/tasks',
  '/api/containers',
  '/api/networks',
  '/api/volumes',
  '/api/secrets',
  '/api/configs',
  '/api/registries',
  '/api/alerts',
  '/api/gitlab',
  '/api/sse',
  '/api/system/overview',
  '/api/system/metrics'
]

function isDockerRoute(path: string): boolean {
  return DOCKER_PREFIXES.some((p) => path === p || path.startsWith(p + '/') || path.startsWith(p + '?'))
}

export default defineEventHandler(async (event) => {
  const path = event.path || ''
  if (!path.startsWith('/api/') || !isDockerRoute(path)) return

  const user = await readSession(event)
  // Unauthenticated: let the handler's requireUser produce a clean 401.
  if (!user) return

  const apps = await resolveUserEntitlements(user)
  const tier = apps.docker
  if (!tier) {
    throw createError({ statusCode: 403, statusMessage: 'No access to the Dock app' })
  }

  // Hand the resolved tier to requireRole/requirePermission downstream.
  event.context.effectiveApp = 'docker'
  event.context.effectiveTier = tier
})
