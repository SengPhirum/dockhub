import type { H3Event } from 'h3'
import { jwtVerify } from 'jose'

export type Role = 'admin' | 'operator' | 'viewer'

export interface AuthUser {
  id: string
  username: string
  /** The user's global role (kept for reference/logging). */
  role: Role
  /** The user's access tier for THIS app (net), or null if they have none. */
  tier: Role | null
}

// Same union as the portal's shared/utils/permissions.ts, duplicated here
// rather than imported - this service has no dependency on the portal's
// codebase (it's meant to become its own repository). Keep in sync by hand
// until a real KNetraHub-Shared-Types package exists.
export type Permission =
  | 'net.view' | 'net.manage' | 'net.scan' | 'net.configure' | 'net.alert'

const VIEWER_PERMISSIONS: Permission[] = ['net.view']
const OPERATOR_PERMISSIONS: Permission[] = [...VIEWER_PERMISSIONS, 'net.scan']
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: VIEWER_PERMISSIONS,
  operator: OPERATOR_PERMISSIONS,
  admin: ['net.view', 'net.manage', 'net.scan', 'net.configure', 'net.alert']
}

function secret() {
  // Must match the portal's NUXT_JWT_SECRET exactly - this is what lets this
  // API verify a token the portal issued without sharing a database or
  // calling back to the portal on every request.
  const value = process.env.NUXT_NET_JWT_SECRET
  if (!value) throw createError({ statusCode: 500, statusMessage: 'NUXT_NET_JWT_SECRET is not configured' })
  return new TextEncoder().encode(value)
}

/**
 * Verifies the Bearer token from KNetraHub portal's
 * server/api/auth/subsystem-token.get.ts. Fails closed: any missing,
 * malformed, expired, or wrong-audience token is a 401, full stop - this
 * API never trusts the frontend's own permission checks.
 *
 * The portal resolves the caller's per-app access and stamps it into the
 * token's `apps` claim; this API enforces against `apps.net` so a Keycloak
 * net-operator (who may be a global viewer) gets exactly their net tier.
 */
export async function requireUser(event: H3Event): Promise<AuthUser> {
  const authHeader = getRequestHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Missing bearer token' })
  }
  try {
    const { payload } = await jwtVerify(authHeader.slice(7), secret(), { audience: 'knetrahub-subsystem' })
    const apps = (payload.apps || {}) as Record<string, Role | null>
    const tier = apps.net ?? null
    return { id: String(payload.id), username: String(payload.username), role: payload.role as Role, tier }
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired token' })
  }
}

export async function requirePermission(event: H3Event, permission: Permission): Promise<AuthUser> {
  const user = await requireUser(event)
  if (!user.tier || !ROLE_PERMISSIONS[user.tier].includes(permission)) {
    throw createError({ statusCode: 403, statusMessage: `Requires permission: ${permission}` })
  }
  return user
}
