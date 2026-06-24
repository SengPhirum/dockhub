import type { ModuleDefinition } from '../../shared/types/module'

/**
 * KNetraHub module registry - the apps shown on the home launcher. `docker`
 * ("Dock") is served in-process by this app (its dashboard lives at /dock and
 * the existing Docker Swarm pages keep their original paths); net/server/ipmgt
 * are loaded as remotes via Module Federation. A new app only needs a registry
 * entry plus its access wiring, not bespoke nav code.
 */
export function getModuleRegistry(): ModuleDefinition[] {
  const config = useRuntimeConfig().public.knetrahub

  const modules: ModuleDefinition[] = [
    {
      key: 'docker',
      name: 'Dock',
      description: 'Docker Swarm management - nodes, services, stacks, tasks, and data resources.',
      routePath: '/dock',
      icon: 'i-lucide-container',
      permission: 'docker.view',
      type: 'local',
      enabled: true,
      order: 10
    },
    {
      key: 'net',
      name: 'KNetraHub-Net',
      description: 'Network monitoring - device inventory, ping/SNMP checks, bandwidth, and alerts.',
      routePath: '/net',
      icon: 'i-lucide-network',
      permission: 'net.view',
      type: 'remote',
      remoteName: 'knetrahub_net',
      exposedModule: './NetApp',
      remoteEntryUrl: config.netRemoteEntry,
      apiBaseUrl: config.netApiBase,
      enabled: true,
      order: 20,
      versionCompat: '^1.0.0'
    },
    {
      key: 'server',
      name: 'KNetraHub-Server',
      description: 'Server monitoring - CPU/memory/disk metrics, service status, and agent heartbeats.',
      routePath: '/server',
      icon: 'i-lucide-server-cog',
      permission: 'server.view',
      type: 'remote',
      remoteName: 'knetrahub_server',
      exposedModule: './ServerApp',
      remoteEntryUrl: config.serverRemoteEntry,
      apiBaseUrl: config.serverApiBase,
      enabled: true,
      order: 30,
      versionCompat: '^1.0.0'
    },
    {
      key: 'ipmgt',
      name: 'KNetraHub-IPMgt',
      description: 'IT asset and IP address management - ownership, warranty, and lifecycle tracking.',
      routePath: '/ipmgt',
      icon: 'i-lucide-id-card',
      permission: 'ipmgt.view',
      type: 'remote',
      remoteName: 'knetrahub_ipmgt',
      exposedModule: './IPMgtApp',
      remoteEntryUrl: config.ipmgtRemoteEntry,
      apiBaseUrl: config.ipmgtApiBase,
      enabled: true,
      order: 40,
      versionCompat: '^1.0.0'
    }
  ]
  return modules.sort((a, b) => a.order - b.order)
}
