import type { ModuleDefinition } from '../../shared/types/module'

/**
 * KNetraHub module registry - the apps shown on the home launcher. Every app
 * is now served in-process by this app (SPA pages under app/pages + Nitro API
 * routes); there are no Module-Federation remotes anymore. A new app only
 * needs a registry entry plus its access wiring (permission + nav group), not
 * bespoke nav code.
 */
export function getModuleRegistry(): ModuleDefinition[] {
  const modules: ModuleDefinition[] = [
    {
      key: 'docker',
      name: 'Docker',
      description: 'Docker Swarm management - nodes, services, stacks, tasks, and data resources.',
      routePath: '/docker',
      icon: 'i-lucide-container',
      permission: 'docker.view',
      type: 'local',
      enabled: true,
      order: 10
    },
    {
      key: 'monitoring',
      name: 'Monitoring',
      description: 'Unified infrastructure monitoring - network devices (ping/SNMP) and server hosts (CPU/memory/disk), with sensors, alerts, and problems.',
      routePath: '/monitoring',
      icon: 'i-lucide-activity',
      permission: 'monitoring.view',
      type: 'local',
      enabled: true,
      order: 20
    },
    {
      key: 'ipmgt',
      name: 'IP Management',
      description: 'IP address management - subnets, address inventory, assignment, and utilization.',
      routePath: '/ipmgt',
      icon: 'i-lucide-id-card',
      permission: 'ipmgt.view',
      type: 'local',
      enabled: true,
      order: 40
    }
  ]
  return modules.sort((a, b) => a.order - b.order)
}
