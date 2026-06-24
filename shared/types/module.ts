import type { Permission } from '../utils/permissions'

export type ModuleType = 'local'

/**
 * Describes one KNetraHub subsystem (Dock, Network, Server, IP Management)
 * for the app launcher and the contextual sidebar. Every module is now served
 * in-process by this app (SPA pages under app/pages + Nitro API routes); the
 * former Module-Federation remote fields are gone. Frontend-only metadata -
 * never a substitute for backend permission checks (each module's API
 * re-validates the same permission independently via requireApp).
 */
export interface ModuleDefinition {
  /** Stable identifier, e.g. 'docker' | 'net' | 'server' | 'ipmgt'. */
  key: string
  /** Display name, e.g. "Network". */
  name: string
  description: string
  /** Route the launcher/sidebar links to and the module mounts at. */
  routePath: string
  /** Lucide icon name (i-lucide-*), matching the rest of the sidebar. */
  icon: string
  /** Permission required for the entry to be visible/clickable in the UI. */
  permission: Permission
  type: ModuleType
  enabled: boolean
  /** Lower sorts first in the menu. */
  order: number
}
