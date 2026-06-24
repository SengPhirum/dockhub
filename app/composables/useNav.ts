export interface NavItem {
  label: string
  to: string
  icon: string
  minRole?: 'viewer' | 'operator' | 'admin'
  permission?: Permission
  target?: string
}
export interface NavGroup {
  label: string
  items: NavItem[]
}

// The Dock app's own navigation (the former global sidebar). Shown only while
// the user is inside the Dock app. Items gated by docker.* permissions resolve
// against the user's per-app docker tier (see useAuth.hasPermission).
const DOCK_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/docker', icon: 'i-lucide-radar', permission: 'docker.view' }]
  },
  {
    label: 'Fleet',
    items: [{ label: 'Nodes', to: '/nodes', icon: 'i-lucide-server', permission: 'docker.view' }]
  },
  {
    label: 'Workloads',
    items: [
      { label: 'Stacks',     to: '/stacks',     icon: 'i-lucide-layers',      permission: 'docker.view' },
      { label: 'Services',   to: '/services',   icon: 'i-lucide-boxes',       permission: 'docker.view' },
      { label: 'Tasks',      to: '/tasks',      icon: 'i-lucide-list-checks', permission: 'docker.view' },
      { label: 'Containers', to: '/containers', icon: 'i-lucide-container',   permission: 'docker.view' }
    ]
  },
  {
    label: 'Data',
    items: [
      { label: 'Networks', to: '/networks', icon: 'i-lucide-network',    permission: 'docker.view' },
      { label: 'Volumes',  to: '/volumes',  icon: 'i-lucide-hard-drive', permission: 'docker.view' },
      { label: 'Secrets',  to: '/secrets',  icon: 'i-lucide-key-round',  permission: 'docker.view' },
      { label: 'Configs',  to: '/configs',  icon: 'i-lucide-file-cog',   permission: 'docker.view' }
    ]
  },
  {
    label: 'Dock admin',
    items: [
      { label: 'Registries', to: '/registries', icon: 'i-lucide-package', permission: 'docker.manage' }
    ]
  }
]

// The Network app's navigation (LibreNMS-style monitoring). Shown only while
// the user is inside the Network app; items gated by the user's per-app net tier.
const NET_GROUPS: NavGroup[] = [
  {
    label: 'Network',
    items: [
      { label: 'Overview', to: '/net',         icon: 'i-lucide-radar',          permission: 'net.view' },
      { label: 'Devices',  to: '/net/devices', icon: 'i-lucide-router',         permission: 'net.view' },
      { label: 'Alerts',   to: '/net/alerts',  icon: 'i-lucide-bell-ring',      permission: 'net.view' }
    ]
  }
]

// The Server app's navigation (Zabbix-style monitoring).
const SERVER_GROUPS: NavGroup[] = [
  {
    label: 'Server',
    items: [
      { label: 'Overview', to: '/server',          icon: 'i-lucide-radar',          permission: 'server.view' },
      { label: 'Hosts',    to: '/server/hosts',    icon: 'i-lucide-server',         permission: 'server.view' },
      { label: 'Problems', to: '/server/problems', icon: 'i-lucide-triangle-alert', permission: 'server.view' }
    ]
  }
]

// The IP Management app's navigation.
const IPMGT_GROUPS: NavGroup[] = [
  {
    label: 'IP Management',
    items: [
      { label: 'Overview',  to: '/ipmgt',           icon: 'i-lucide-radar',       permission: 'ipmgt.view' },
      { label: 'Subnets',   to: '/ipmgt/subnets',   icon: 'i-lucide-network',     permission: 'ipmgt.view' },
      { label: 'Addresses', to: '/ipmgt/addresses', icon: 'i-lucide-list-ordered',permission: 'ipmgt.view' }
    ]
  }
]

/**
 * Contextual navigation. The sidebar shows:
 *  - always: a link back to the app launcher;
 *  - inside the Dock app: the Dock navigation above;
 *  - for global admins: portal Administration (users/audit/settings);
 *  - always: Documentation, pinned to the bottom.
 * Returns a ComputedRef so it reacts to route (current app) changes.
 */
export function useNav(): ComputedRef<NavGroup[]> {
  const route = useRoute()
  return computed<NavGroup[]>(() => {
    const currentApp = appKeyForRoute(route.path)
    const groups: NavGroup[] = [
      { label: '', items: [{ label: 'Apps', to: '/', icon: 'i-lucide-layout-grid' }] }
    ]

    if (currentApp === 'docker') groups.push(...DOCK_GROUPS)
    else if (currentApp === 'net') groups.push(...NET_GROUPS)
    else if (currentApp === 'server') groups.push(...SERVER_GROUPS)
    else if (currentApp === 'ipmgt') groups.push(...IPMGT_GROUPS)

    groups.push({
      label: 'Administration',
      items: [
        { label: 'Users',     to: '/users',    icon: 'i-lucide-users',       minRole: 'admin' },
        { label: 'Audit log', to: '/audit',    icon: 'i-lucide-scroll-text', minRole: 'admin' },
        { label: 'Settings',  to: '/settings', icon: 'i-lucide-settings',    minRole: 'admin' }
      ]
    })

    groups.push({
      label: 'Documentation',
      items: [
        { label: 'Documentation and API', to: '/documentation', icon: 'i-lucide-book-open-text' }
      ]
    })

    return groups
  })
}
