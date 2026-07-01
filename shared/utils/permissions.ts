// Type-only import (erased at build time, so this never bundles server code
// into the client) - server/utils/store.ts's Role stays the single source
// of truth rather than duplicating the union type here.
import type { Role } from '../../server/utils/store'

/**
 * Fine-grained permission model. Originally layered on the global
 * viewer/operator/admin role; now it is *also* the vocabulary for per-app
 * access (see shared/utils/entitlements.ts): every permission belongs to an
 * app, and an app tier (viewer/operator/admin) grants a subset of that app's
 * permissions. ROLE_PERMISSIONS (by global role) is kept for portal-level
 * checks (admin.* / dashboard.view) and as the source of truth for which
 * permissions exist.
 *
 * Frontend checks using these are for menu visibility/UX only. Every
 * subsystem API must re-check the same permission server-side; the portal
 * never substitutes a frontend check for a backend one.
 */
export const PERMISSIONS = [
  // Global
  'dashboard.view', 'alert.view', 'alert.manage', 'audit.view', 'report.view', 'report.export',
  // KNetraHub-Docker
  'docker.view', 'docker.manage', 'docker.deploy', 'docker.audit',
  // KNetraHub-Monitoring (merged Network + Server)
  'monitoring.view', 'monitoring.manage', 'monitoring.scan', 'monitoring.configure',
  'monitoring.metrics', 'monitoring.service.manage', 'monitoring.alert',
  // KNetraHub-IPMgt
  'ipmgt.view', 'ipmgt.create', 'ipmgt.update', 'ipmgt.delete', 'ipmgt.assign', 'ipmgt.export',
  // Admin
  'admin.users', 'admin.roles', 'admin.permissions', 'admin.settings', 'admin.modules'
] as const

export type Permission = typeof PERMISSIONS[number]

/**
 * Per-app permissions, split by tier. viewer ⊂ operator ⊂ admin within each
 * app. This is the single source of truth that both the global-role mapping
 * (below) and the per-app entitlement model (entitlements.ts) build on.
 */
type AppTierPermissions = { viewer: Permission[]; operator: Permission[]; admin: Permission[] }

export const APP_PERMISSIONS: Record<'docker' | 'monitoring' | 'ipmgt', AppTierPermissions> = {
  docker: {
    viewer: ['docker.view'],
    operator: ['docker.manage', 'docker.deploy'],
    admin: ['docker.audit']
  },
  monitoring: {
    viewer: ['monitoring.view'],
    operator: ['monitoring.scan', 'monitoring.metrics'],
    admin: ['monitoring.manage', 'monitoring.configure', 'monitoring.service.manage', 'monitoring.alert']
  },
  ipmgt: {
    viewer: ['ipmgt.view', 'ipmgt.export'],
    operator: ['ipmgt.create', 'ipmgt.update', 'ipmgt.assign'],
    admin: ['ipmgt.delete']
  }
}

// Global permissions every authenticated viewer gets regardless of app access.
const VIEWER_GLOBAL: Permission[] = ['dashboard.view', 'alert.view', 'report.view']
const OPERATOR_GLOBAL: Permission[] = ['alert.manage']

/**
 * Cumulative permission list for an app at a given tier (viewer..tier).
 * e.g. cumulativeAppPermissions('docker', 'operator') = view + manage + deploy.
 */
export function cumulativeAppPermissions(
  app: keyof typeof APP_PERMISSIONS,
  tier: 'viewer' | 'operator' | 'admin'
): Permission[] {
  const set = APP_PERMISSIONS[app]
  const out = [...set.viewer]
  if (tier === 'operator' || tier === 'admin') out.push(...set.operator)
  if (tier === 'admin') out.push(...set.admin)
  return out
}

const ALL_APP_VIEWER = Object.keys(APP_PERMISSIONS).flatMap((a) =>
  cumulativeAppPermissions(a as keyof typeof APP_PERMISSIONS, 'viewer')
)
const ALL_APP_OPERATOR = Object.keys(APP_PERMISSIONS).flatMap((a) =>
  cumulativeAppPermissions(a as keyof typeof APP_PERMISSIONS, 'operator')
)

/**
 * Global-role → permissions. Retained for portal-level checks (admin pages,
 * dashboard) and backward compatibility. App-scoped access is now resolved
 * per app via entitlements.ts; this mapping reflects what a *global* role
 * implies (e.g. the local-admin superuser).
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: [...VIEWER_GLOBAL, ...ALL_APP_VIEWER],
  operator: [...VIEWER_GLOBAL, ...OPERATOR_GLOBAL, ...ALL_APP_OPERATOR],
  admin: [...PERMISSIONS]
}

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}
