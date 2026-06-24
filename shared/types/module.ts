import type { Permission } from '../utils/permissions'

export type ModuleType = 'local' | 'remote'

/**
 * Describes one KNetraHub subsystem (KNetraHub-Docker, KNetraHub-Net, ...)
 * for the sidebar/system menu and the remote module loader. Frontend-only
 * metadata - never a substitute for backend permission checks (each
 * subsystem API re-validates the same permission independently).
 */
export interface ModuleDefinition {
  /** Stable identifier, e.g. 'docker' | 'net' | 'server' | 'ipmgt'. */
  key: string
  /** Display name, e.g. "KNetraHub-Net". */
  name: string
  description: string
  /** Route the sidebar links to and the module mounts at. */
  routePath: string
  /** Lucide icon name (i-lucide-*), matching the rest of the sidebar. */
  icon: string
  /** Permission required for the entry to be visible/clickable in the UI. */
  permission: Permission
  type: ModuleType
  /** Module Federation remote name (remote modules only), e.g. 'knetrahub_net'. */
  remoteName?: string
  /** Exposed module path on the remote, e.g. './NetApp'. */
  exposedModule?: string
  /** Resolved at runtime from NUXT_PUBLIC_*; not hardcoded here. */
  remoteEntryUrl?: string
  apiBaseUrl?: string
  healthCheckUrl?: string
  enabled: boolean
  /** Lower sorts first in the menu. */
  order: number
  /** Semver range the host expects the remote to satisfy, e.g. '^1.0.0'. */
  versionCompat?: string
}
