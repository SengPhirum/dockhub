<script setup lang="ts">
definePageMeta({
  middleware: [
    function () {
      const { can } = useAuth()
      if (!can('admin')) return navigateTo('/')
    }
  ]
})

interface LdapSettings {
  enabled: boolean
  url: string
  bindDN: string
  bindCredentials: string
  hasBindCredentials: boolean
  searchBase: string
  searchFilter: string
  groupSearchBase: string
  groupSearchFilter: string
  adminGroup: string
  operatorGroup: string
  overridden: boolean
}

interface OidcSettings {
  enabled: boolean
  issuer: string
  clientId: string
  clientSecret: string
  hasClientSecret: boolean
  redirectUri: string
  effectiveRedirectUri: string
  scope: string
  usernameClaim: string
  displayNameClaim: string
  groupsClaim: string
  rolesClaim: string
  adminGroup: string
  operatorGroup: string
  providerName: string
  overridden: boolean
}

interface AuthSettingsResponse {
  ldap: LdapSettings
  oidc: OidcSettings
}

interface GitlabStatus {
  configured: boolean
  connected: boolean
  error?: string
  url: string
  projectId: string
  branch: string
  stacksPath: string
  enabled: boolean
  hasToken: boolean
  overridden: boolean
}

interface AlertChannel {
  id: string
  name: string
  type: 'telegram' | 'teams' | 'webhook'
  enabled: boolean
  createdAt: string
  updatedAt: string
}

interface AlertRule {
  type: string
  enabled: boolean
  config: Record<string, any>
  template: string
  placeholders: string[]
}

const toast = useToast()

const { appearance, overridden: appearanceOverridden, previewAppearance, saveAppearance, resetAppearance, fetchAppearance } = useAppearance()

const { data: gl, refresh: refreshGitlab } = useFetch<GitlabStatus>('/api/gitlab/status', { lazy: true })
const {
  data: auth,
  status: authStatus,
  error: authError,
  refresh: refreshAuth
} = useFetch<AuthSettingsResponse>('/api/auth/settings', { lazy: true })

const tabs = [
  { label: 'Appearance', icon: 'i-lucide-paintbrush', slot: 'appearance' as const },
  { label: 'Apps & Access', icon: 'i-lucide-layout-grid', slot: 'access' as const },
  { label: 'Integrations', icon: 'i-lucide-plug', slot: 'integrations' as const },
  { label: 'Authentication', icon: 'i-lucide-shield-check', slot: 'authentication' as const },
  { label: 'Alerts', icon: 'i-lucide-bell', slot: 'alerts' as const },
  { label: 'Reference', icon: 'i-lucide-book-open', slot: 'reference' as const }
]

// ─── Apps & Access ───────────────────────────────────────────────────────────
// Maps Keycloak realm roles to per-app access tiers (viewer/operator/admin).
// Stored in the DB; the local admin is always a superuser regardless of this.
const APP_TIERS = ['viewer', 'operator', 'admin'] as const
const accessApps = getModuleRegistry()
type RoleMap = Record<string, Record<string, string[]>>
const { data: appRoleMap, refresh: refreshAppRoles } = useFetch<RoleMap>('/api/settings/app-roles', { lazy: true })
// Editable comma/newline-separated role names per app+tier.
const accessForm = reactive<Record<string, Record<string, string>>>({})
const savingAccess = ref(false)

watch(appRoleMap, (value) => {
  for (const app of accessApps) {
    accessForm[app.key] = accessForm[app.key] || {}
    for (const tier of APP_TIERS) {
      accessForm[app.key]![tier] = (value?.[app.key]?.[tier] || []).join(', ')
    }
  }
}, { immediate: true })

function parseRoles(s: string): string[] {
  return [...new Set(s.split(/[,\n]/).map((r) => r.trim()).filter(Boolean))]
}

async function saveAccess() {
  savingAccess.value = true
  try {
    const map: RoleMap = {}
    for (const app of accessApps) {
      map[app.key] = {}
      for (const tier of APP_TIERS) map[app.key]![tier] = parseRoles(accessForm[app.key]?.[tier] || '')
    }
    await $fetch('/api/settings/app-roles', { method: 'PUT', body: map })
    toast.add({ title: 'Access map saved', color: 'primary', icon: 'i-lucide-check' })
    await refreshAppRoles()
  } catch (e: any) {
    toast.add({ title: 'Save failed', description: e?.data?.statusMessage, color: 'error' })
  } finally {
    savingAccess.value = false
  }
}

// ─── GitLab ───────────────────────────────────────────────────────────────────
const gitlabForm = reactive({ enabled: false, url: '', token: '', projectId: '', branch: '', stacksPath: '' })
const savingGitlab = ref(false)
const resettingGitlab = ref(false)
const testingGitlab = ref(false)

watch(gl, (value) => {
  if (!value) return
  Object.assign(gitlabForm, {
    enabled: value.enabled,
    url: value.url,
    token: '',
    projectId: value.projectId,
    branch: value.branch,
    stacksPath: value.stacksPath
  })
}, { immediate: true })

function gitlabStatusLabel() {
  if (!gl.value) return 'Loading...'
  if (!gl.value.configured) return 'Not configured'
  if (gl.value.connected) return 'Connected'
  return `Unreachable${gl.value.error ? ': ' + gl.value.error : ''}`
}
function gitlabDotClass() {
  if (!gl.value?.configured) return 'dot-idle'
  return gl.value.connected ? 'dot-running' : 'dot-down'
}
function gitlabStatusClass() {
  if (!gl.value?.configured) return 'text-(--color-muted)'
  return gl.value.connected ? 'status-running' : 'status-down'
}

async function saveGitlab() {
  savingGitlab.value = true
  try {
    await $fetch('/api/gitlab/settings', { method: 'PUT', body: { ...gitlabForm } })
    toast.add({ title: 'GitLab settings saved', color: 'primary', icon: 'i-lucide-check' })
    await refreshGitlab()
  } catch (e: any) {
    toast.add({ title: 'Save failed', description: e?.data?.statusMessage, color: 'error' })
  } finally {
    savingGitlab.value = false
  }
}

async function testGitlabConnection() {
  testingGitlab.value = true
  try {
    await refreshGitlab()
    if (gl.value?.connected) toast.add({ title: 'GitLab connection OK', color: 'primary', icon: 'i-lucide-check' })
    else toast.add({ title: 'GitLab connection failed', description: gl.value?.error, color: 'error' })
  } finally {
    testingGitlab.value = false
  }
}

async function resetGitlab() {
  if (!confirm('Reset GitLab settings to environment defaults?')) return
  resettingGitlab.value = true
  try {
    await $fetch('/api/gitlab/settings', { method: 'DELETE' })
    toast.add({ title: 'GitLab now follows environment defaults', color: 'primary', icon: 'i-lucide-rotate-ccw' })
    await refreshGitlab()
  } catch (e: any) {
    toast.add({ title: 'Reset failed', description: e?.data?.statusMessage, color: 'error' })
  } finally {
    resettingGitlab.value = false
  }
}

// ─── Alerts: channels ──────────────────────────────────────────────────────────
const { data: channels, refresh: refreshChannels } = useFetch<AlertChannel[]>('/api/alerts/channels', { lazy: true, default: () => [] })
const { data: rules, refresh: refreshRules } = useFetch<AlertRule[]>('/api/alerts/rules', { lazy: true, default: () => [] })

const channelTypeItems = [
  { label: 'Telegram', value: 'telegram' },
  { label: 'Microsoft Teams', value: 'teams' },
  { label: 'Webhook', value: 'webhook' }
]

const channelModalOpen = ref(false)
const channelModalMode = ref<'create' | 'edit'>('create')
const channelForm = reactive({ id: '', name: '', type: 'telegram' as 'telegram' | 'teams' | 'webhook', enabled: true, botToken: '', chatId: '', webhookUrl: '', url: '', headersText: '' })
const savingChannel = ref(false)
const testingChannelId = ref<string | null>(null)
const deletingChannelId = ref<string | null>(null)

function channelTypeIcon(type: string) {
  if (type === 'telegram') return 'i-lucide-send'
  if (type === 'teams') return 'i-lucide-users'
  return 'i-lucide-webhook'
}
function channelTypeLabel(type: string) {
  return channelTypeItems.find((i) => i.value === type)?.label || type
}

// Vue's template parser closes a mustache interpolation at the first "}}"
// it sees, even inside a JS string - a literal "{{x}}" placeholder chip
// can't be built inline in the template, so it's built here instead.
function placeholderChip(name: string) {
  return '{' + '{' + name + '}' + '}'
}

function openCreateChannel() {
  channelModalMode.value = 'create'
  Object.assign(channelForm, { id: '', name: '', type: 'telegram', enabled: true, botToken: '', chatId: '', webhookUrl: '', url: '', headersText: '' })
  channelModalOpen.value = true
}
function openEditChannel(ch: AlertChannel) {
  channelModalMode.value = 'edit'
  Object.assign(channelForm, { id: ch.id, name: ch.name, type: ch.type, enabled: ch.enabled, botToken: '', chatId: '', webhookUrl: '', url: '', headersText: '' })
  channelModalOpen.value = true
}

function buildChannelConfig(): Record<string, any> {
  if (channelForm.type === 'telegram') return { botToken: channelForm.botToken, chatId: channelForm.chatId }
  if (channelForm.type === 'teams') return { webhookUrl: channelForm.webhookUrl }
  const headers: Record<string, string> = {}
  for (const line of channelForm.headersText.split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    if (key) headers[key] = line.slice(idx + 1).trim()
  }
  return { url: channelForm.url, headers }
}

async function saveChannel() {
  savingChannel.value = true
  try {
    const config = buildChannelConfig()
    if (channelModalMode.value === 'create') {
      await $fetch('/api/alerts/channels', { method: 'POST', body: { name: channelForm.name, type: channelForm.type, enabled: channelForm.enabled, config } })
      toast.add({ title: 'Channel added', color: 'primary', icon: 'i-lucide-check' })
    } else {
      await $fetch(`/api/alerts/channels/${channelForm.id}`, { method: 'PATCH', body: { name: channelForm.name, enabled: channelForm.enabled, config } })
      toast.add({ title: 'Channel updated', color: 'primary', icon: 'i-lucide-check' })
    }
    channelModalOpen.value = false
    await refreshChannels()
  } catch (e: any) {
    toast.add({ title: 'Save failed', description: e?.data?.statusMessage, color: 'error' })
  } finally {
    savingChannel.value = false
  }
}

async function testChannel(id: string) {
  testingChannelId.value = id
  try {
    const res = await $fetch<{ ok: boolean; error?: string }>(`/api/alerts/channels/${id}/test`, { method: 'POST' })
    if (res.ok) toast.add({ title: 'Test message sent', color: 'primary', icon: 'i-lucide-check' })
    else toast.add({ title: 'Test failed', description: res.error, color: 'error' })
  } catch (e: any) {
    toast.add({ title: 'Test failed', description: e?.data?.statusMessage, color: 'error' })
  } finally {
    testingChannelId.value = null
  }
}

async function deleteChannel(ch: AlertChannel) {
  if (!confirm(`Delete channel "${ch.name}"?`)) return
  deletingChannelId.value = ch.id
  try {
    await $fetch(`/api/alerts/channels/${ch.id}`, { method: 'DELETE' })
    toast.add({ title: 'Channel deleted', color: 'primary' })
    await refreshChannels()
  } catch (e: any) {
    toast.add({ title: 'Delete failed', description: e?.data?.statusMessage, color: 'error' })
  } finally {
    deletingChannelId.value = null
  }
}

// ─── Alerts: rules ─────────────────────────────────────────────────────────────
const RULE_LABELS: Record<string, { label: string; icon: string }> = {
  deploy_failed: { label: 'Deploy failed', icon: 'i-lucide-circle-x' },
  usage_threshold: { label: 'Usage threshold', icon: 'i-lucide-gauge' },
  node_down: { label: 'Node down', icon: 'i-lucide-server-off' },
  replicas_degraded: { label: 'Replicas degraded', icon: 'i-lucide-trending-down' },
  disk_usage_threshold: { label: 'Disk usage threshold', icon: 'i-lucide-hard-drive' }
}

const ruleEdits = reactive<Record<string, { enabled: boolean; config: Record<string, any>; template: string; templateOpen: boolean }>>({})
watch(rules, (list) => {
  if (!list) return
  for (const r of list) {
    ruleEdits[r.type] = { enabled: r.enabled, config: { ...r.config }, template: r.template, templateOpen: ruleEdits[r.type]?.templateOpen ?? false }
  }
}, { immediate: true })

const savingRule = ref<string | null>(null)
const resettingRule = ref<string | null>(null)

async function saveRule(type: string) {
  savingRule.value = type
  try {
    const edit = ruleEdits[type]!
    await $fetch(`/api/alerts/rules/${type}`, { method: 'PUT', body: { enabled: edit.enabled, config: edit.config, template: edit.template } })
    toast.add({ title: 'Rule saved', color: 'primary', icon: 'i-lucide-check' })
    await refreshRules()
  } catch (e: any) {
    toast.add({ title: 'Save failed', description: e?.data?.statusMessage, color: 'error' })
  } finally {
    savingRule.value = null
  }
}

async function resetRule(type: string) {
  if (!confirm('Reset this rule to its default configuration and template?')) return
  resettingRule.value = type
  try {
    await $fetch(`/api/alerts/rules/${type}/reset`, { method: 'POST' })
    toast.add({ title: 'Rule reset to default', color: 'primary', icon: 'i-lucide-rotate-ccw' })
    await refreshRules()
  } catch (e: any) {
    toast.add({ title: 'Reset failed', description: e?.data?.statusMessage, color: 'error' })
  } finally {
    resettingRule.value = null
  }
}

const PRESET_COLORS = ['#2496ED', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#D97706', '#16A34A', '#0D9488', '#0284C7', '#475569']
const MAX_LOGO_BYTES = 1.5 * 1024 * 1024

const savingAppearance = ref(false)
const resettingAppearance = ref(false)
const logoHorizontalInput = ref<HTMLInputElement | null>(null)
const logoIconInput = ref<HTMLInputElement | null>(null)
const faviconInput = ref<HTMLInputElement | null>(null)
const pwaIconInput = ref<HTMLInputElement | null>(null)

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function onLogoFileChange(e: Event, field: 'logoHorizontalUrl' | 'logoIconUrl' | 'faviconUrl' | 'pwaIconUrl') {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.add({ title: 'Invalid file', description: 'Please choose an image file.', color: 'error' })
  } else if (file.size > MAX_LOGO_BYTES) {
    toast.add({ title: 'Image too large', description: 'Please choose an image under 1.5 MB.', color: 'error' })
  } else {
    previewAppearance({ [field]: await readFileAsDataUrl(file) })
  }
  input.value = ''
}

function clearLogo(field: 'logoHorizontalUrl' | 'logoIconUrl' | 'faviconUrl' | 'pwaIconUrl') {
  previewAppearance({ [field]: '' })
}

async function saveAppearanceSettings() {
  savingAppearance.value = true
  try {
    await saveAppearance({ ...appearance.value })
    toast.add({ title: 'Appearance saved', description: 'Applied for every user.', color: 'primary', icon: 'i-lucide-check' })
  } catch (e: any) {
    toast.add({ title: 'Save failed', description: e?.data?.statusMessage, color: 'error' })
  } finally {
    savingAppearance.value = false
  }
}

async function revertAppearancePreview() {
  await fetchAppearance()
}

async function resetAppearanceToDefaults() {
  if (!confirm('Reset appearance to the built-in KNetraHub defaults?')) return
  resettingAppearance.value = true
  try {
    await resetAppearance()
    toast.add({ title: 'Appearance reset to defaults', color: 'primary', icon: 'i-lucide-rotate-ccw' })
  } catch (e: any) {
    toast.add({ title: 'Reset failed', description: e?.data?.statusMessage, color: 'error' })
  } finally {
    resettingAppearance.value = false
  }
}

const oidcGuide = {
  checklist: [
    'Create an OIDC/OAuth client in the identity provider.',
    'Register the effective callback URL as an allowed redirect URI.',
    'Copy the issuer, client ID, and client secret into KNetraHub.',
    'Include scopes that expose profile, email, and group claims.',
    'Map the admin and operator groups, then save and test SSO login.'
  ],
  fields: [
    { name: 'Issuer URL', detail: 'Use the exact issuer from provider discovery, without the /.well-known/openid-configuration suffix.' },
    { name: 'Redirect URI', detail: 'Leave blank to use the shown effective URL, or set a public URL when KNetraHub is behind a proxy.' },
    { name: 'Scope', detail: 'Keep openid. Add profile, email, and groups when your provider requires scopes for those claims.' },
    { name: 'Claims', detail: 'Username, display name, and groups can use plain claim names or dot paths such as realm_access.roles.' },
    { name: 'Groups', detail: 'OIDC group values are matched to KNetraHub roles. Users without a match become viewers.' }
  ]
}

const ldapGuide = {
  checklist: [
    'Use an LDAP or LDAPS URL reachable from the KNetraHub server.',
    'Enter a bind DN that can search users, or leave it blank for anonymous bind if allowed.',
    'Set the user search base and a filter that includes {{username}}.',
    'Map the directory groups that should become KNetraHub admins or operators.',
    'Save, then test with a directory user before relying on LDAP broadly.'
  ],
  fields: [
    { name: 'Server URL', detail: 'Prefer ldaps:// on port 636 when available. ldap:// on port 389 depends on your directory policy.' },
    { name: 'Bind DN', detail: 'Use a service account DN, for example cn=dockhub,ou=service,dc=example,dc=com.' },
    { name: 'Search base', detail: 'Point this at the subtree containing user accounts, not the whole directory when you can avoid it.' },
    { name: 'Search filter', detail: 'Active Directory often uses (sAMAccountName={{username}}); OpenLDAP commonly uses (uid={{username}}).' },
    { name: 'Groups', detail: 'KNetraHub checks the user memberOf values against the admin and operator group fields.' }
  ]
}

const envVars = [
  { k: 'NUXT_JWT_SECRET', d: 'Secret for signing session tokens (required in production)' },
  { k: 'NUXT_DOCKER_SOCKET_PATH', d: 'Path to Docker socket (default /var/run/docker.sock)' },
  { k: 'NUXT_DOCKER_HOST / NUXT_DOCKER_PORT', d: 'Remote Docker engine over TCP (overrides socket)' },
  { k: 'NUXT_DOCKER_CA / CERT / KEY', d: 'TLS certificate chain for mutual-TLS remote Docker' },
  { k: 'NUXT_LDAP_ENABLED', d: 'Default LDAP / AD authentication state' },
  { k: 'NUXT_LDAP_URL', d: 'e.g. ldaps://ldap.example.com:636' },
  { k: 'NUXT_LDAP_BIND_DN / BIND_CREDENTIALS', d: 'Service account credentials for directory search' },
  { k: 'NUXT_LDAP_SEARCH_BASE', d: 'Base DN for user lookups' },
  { k: 'NUXT_LDAP_SEARCH_FILTER', d: 'User lookup filter (default: (uid={{username}}))' },
  { k: 'NUXT_LDAP_ADMIN_GROUP / OPERATOR_GROUP', d: 'Group DNs mapped to KNetraHub roles' },
  { k: 'NUXT_OIDC_ENABLED', d: 'Default OIDC single sign-on state' },
  { k: 'NUXT_OIDC_ISSUER', d: 'Provider issuer URL; endpoints are discovered automatically' },
  { k: 'NUXT_OIDC_CLIENT_ID / CLIENT_SECRET', d: 'OAuth client registered at the provider' },
  { k: 'NUXT_OIDC_REDIRECT_URI', d: 'Override the callback URL (default: {origin}/api/auth/oidc/callback)' },
  { k: 'NUXT_OIDC_SCOPE', d: 'Requested scopes (default: openid profile email groups)' },
  { k: 'NUXT_OIDC_USERNAME_CLAIM', d: 'Claim used as the KNetraHub username (default: preferred_username)' },
  { k: 'NUXT_OIDC_GROUPS_CLAIM', d: 'Claim carrying group names; dot-paths work (default: groups)' },
  { k: 'NUXT_OIDC_ADMIN_GROUP / OPERATOR_GROUP', d: 'Group names mapped to KNetraHub roles' },
  { k: 'NUXT_OIDC_PROVIDER_NAME', d: 'Label for the SSO login button' },
  { k: 'NUXT_GITLAB_TOKEN', d: 'Personal/project access token with api scope (or configure under Settings -> Integrations)' },
  { k: 'NUXT_GITLAB_PROJECT_ID', d: 'Numeric project ID where compose files are stored' },
  { k: 'NUXT_GITLAB_BRANCH / STACKS_PATH', d: 'Branch (default: main) and folder (default: stacks)' },
  { k: 'NUXT_ALERTS_ENABLED', d: 'Default alert poller state (default: true)' },
  { k: 'NUXT_ALERTS_INTERVAL_MINUTES', d: 'How often usage/node/replica/disk conditions are checked (default: 3)' },
  { k: 'NUXT_DB_HOST / PORT / NAME / USER / PASSWORD', d: 'Postgres + TimescaleDB connection (app data and metrics history)' },
  { k: 'NUXT_METRICS_RETENTION_DAYS', d: 'Days of metrics history kept before retention drops it (default: 30)' },
  { k: 'NUXT_PUBLIC_APP_NAME', d: 'Default app name in the header (Settings -> Appearance can override it)' }
]
const envSortOptions = [
  { label: 'Variable', value: 'k' },
  { label: 'Description', value: 'd' }
]
const {
  items: filteredEnvVars,
  search: envSearch,
  sortBy: envSortBy,
  sortDir: envSortDir,
  sortOptions: envSortOptionsState
} = useListControls('settings:env', () => envVars, {
  sortOptions: envSortOptions,
  defaultSortBy: 'k'
})

const ldapForm = reactive({
  enabled: false,
  url: '',
  bindDN: '',
  bindCredentials: '',
  searchBase: '',
  searchFilter: '',
  groupSearchBase: '',
  groupSearchFilter: '',
  adminGroup: '',
  operatorGroup: ''
})

const oidcForm = reactive({
  enabled: false,
  issuer: '',
  clientId: '',
  clientSecret: '',
  redirectUri: '',
  scope: '',
  usernameClaim: '',
  displayNameClaim: '',
  groupsClaim: '',
  rolesClaim: '',
  adminGroup: '',
  operatorGroup: '',
  providerName: ''
})

const savingProvider = ref<'ldap' | 'oidc' | null>(null)
const resettingProvider = ref<'ldap' | 'oidc' | null>(null)

const authLoadStatus = computed(() => authStatus.value === 'idle' ? 'pending' : authStatus.value)

watch(auth, (value) => {
  if (!value) return
  Object.assign(ldapForm, {
    enabled: value.ldap.enabled,
    url: value.ldap.url,
    bindDN: value.ldap.bindDN,
    bindCredentials: '',
    searchBase: value.ldap.searchBase,
    searchFilter: value.ldap.searchFilter,
    groupSearchBase: value.ldap.groupSearchBase,
    groupSearchFilter: value.ldap.groupSearchFilter,
    adminGroup: value.ldap.adminGroup,
    operatorGroup: value.ldap.operatorGroup
  })
  Object.assign(oidcForm, {
    enabled: value.oidc.enabled,
    issuer: value.oidc.issuer,
    clientId: value.oidc.clientId,
    clientSecret: '',
    redirectUri: value.oidc.redirectUri,
    scope: value.oidc.scope,
    usernameClaim: value.oidc.usernameClaim,
    displayNameClaim: value.oidc.displayNameClaim,
    groupsClaim: value.oidc.groupsClaim,
    rolesClaim: value.oidc.rolesClaim,
    adminGroup: value.oidc.adminGroup,
    operatorGroup: value.oidc.operatorGroup,
    providerName: value.oidc.providerName
  })
}, { immediate: true })

function sourceLabel(overridden?: boolean) {
  return overridden ? 'DB override' : 'Env default'
}

function sourceColor(overridden?: boolean) {
  return overridden ? 'primary' : 'neutral'
}

async function saveProvider(provider: 'ldap' | 'oidc') {
  savingProvider.value = provider
  try {
    await $fetch('/api/auth/settings', {
      method: 'PUT',
      body: {
        provider,
        settings: provider === 'ldap' ? { ...ldapForm } : { ...oidcForm }
      }
    })
    toast.add({
      title: provider === 'ldap' ? 'LDAP settings saved' : 'OIDC settings saved',
      color: 'primary',
      icon: 'i-lucide-check'
    })
    await refreshAuth()
  } catch (e: any) {
    toast.add({
      title: 'Save failed',
      description: e?.data?.statusMessage,
      color: 'error'
    })
  } finally {
    savingProvider.value = null
  }
}

async function resetProvider(provider: 'ldap' | 'oidc') {
  if (!confirm(`Reset ${provider.toUpperCase()} settings to environment defaults?`)) return
  resettingProvider.value = provider
  try {
    await $fetch(`/api/auth/settings?provider=${provider}`, { method: 'DELETE' })
    toast.add({
      title: `${provider.toUpperCase()} now follows environment defaults`,
      color: 'primary',
      icon: 'i-lucide-rotate-ccw'
    })
    await refreshAuth()
  } catch (e: any) {
    toast.add({
      title: 'Reset failed',
      description: e?.data?.statusMessage,
      color: 'error'
    })
  } finally {
    resettingProvider.value = null
  }
}
</script>

<template>
  <div>
    <PageHeader title="System settings" subtitle="Infrastructure, integrations, and persisted configuration" icon="i-lucide-settings">
      <template #actions>
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" :loading="authStatus === 'pending'" @click="refreshAuth()" />
      </template>
    </PageHeader>

    <UTabs :items="tabs" variant="link" class="max-w-5xl" :unmount-on-hide="false">
      <template #appearance>
        <div class="grid gap-4 pt-4 xl:grid-cols-2">
          <section class="panel p-5 space-y-5">
            <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <h3 class="font-display text-sm font-semibold text-foam flex items-center gap-2">
                  <UIcon name="i-lucide-paintbrush" class="size-4 text-beacon" />
                  Branding
                </h3>
                <p class="mt-1 text-xs text-(--color-muted)">
                  Changes preview live across the whole app as you edit. Nothing is shared with other users until you save.
                </p>
              </div>
              <UBadge :color="sourceColor(appearanceOverridden)" variant="subtle" :label="sourceLabel(appearanceOverridden)" class="self-start" />
            </header>

            <UFormField label="App name" description="Shown in the sidebar header and browser tab title.">
              <UInput v-model="appearance.appName" class="w-full sm:w-72" placeholder="KNetraHub" />
            </UFormField>

            <UFormField label="Primary color" description="Drives buttons, links, and accents across the app.">
              <div class="flex flex-wrap items-center gap-3">
                <input v-model="appearance.primaryColor" type="color" class="size-10 cursor-pointer rounded border border-hull bg-transparent p-0.5">
                <UInput v-model="appearance.primaryColor" class="w-32 font-mono" placeholder="#2496ED" />
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="c in PRESET_COLORS"
                    :key="c"
                    type="button"
                    class="size-6 rounded-full ring-1 ring-hull transition hover:scale-110"
                    :style="{ background: c }"
                    :aria-label="c"
                    @click="appearance.primaryColor = c"
                  />
                </div>
              </div>
            </UFormField>

            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Horizontal logo" description="Used on the login screen.">
                <div class="flex items-center gap-3 rounded-lg border border-dashed border-hull p-3">
                  <div class="flex h-12 w-32 items-center justify-center overflow-hidden rounded bg-surface-2">
                    <img v-if="appearance.logoHorizontalUrl" :src="appearance.logoHorizontalUrl" alt="" class="max-h-full max-w-full object-contain">
                    <DockHubLogo v-else size="sm" />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-upload" label="Upload" @click="logoHorizontalInput?.click()" />
                    <UButton v-if="appearance.logoHorizontalUrl" size="xs" color="neutral" variant="ghost" icon="i-lucide-x" label="Use default" @click="clearLogo('logoHorizontalUrl')" />
                  </div>
                  <input ref="logoHorizontalInput" type="file" accept="image/*" class="hidden" @change="onLogoFileChange($event, 'logoHorizontalUrl')">
                </div>
              </UFormField>
              <UFormField label="Icon logo" description="Used in the sidebar and header.">
                <div class="flex items-center gap-3 rounded-lg border border-dashed border-hull p-3">
                  <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded bg-surface-2">
                    <img v-if="appearance.logoIconUrl" :src="appearance.logoIconUrl" alt="" class="max-h-full max-w-full object-contain">
                    <DockHubLogo v-else variant="icon" size="sm" />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-upload" label="Upload" @click="logoIconInput?.click()" />
                    <UButton v-if="appearance.logoIconUrl" size="xs" color="neutral" variant="ghost" icon="i-lucide-x" label="Use default" @click="clearLogo('logoIconUrl')" />
                  </div>
                  <input ref="logoIconInput" type="file" accept="image/*" class="hidden" @change="onLogoFileChange($event, 'logoIconUrl')">
                </div>
              </UFormField>
              <UFormField label="Favicon" description="Browser tab icon. Small and square, e.g. 32x32 or 64x64.">
                <div class="flex items-center gap-3 rounded-lg border border-dashed border-hull p-3">
                  <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded bg-surface-2">
                    <img v-if="appearance.faviconUrl" :src="appearance.faviconUrl" alt="" class="max-h-full max-w-full object-contain">
                    <DockHubLogo v-else variant="icon" size="sm" />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-upload" label="Upload" @click="faviconInput?.click()" />
                    <UButton v-if="appearance.faviconUrl" size="xs" color="neutral" variant="ghost" icon="i-lucide-x" label="Use default" @click="clearLogo('faviconUrl')" />
                  </div>
                  <input ref="faviconInput" type="file" accept="image/*" class="hidden" @change="onLogoFileChange($event, 'faviconUrl')">
                </div>
              </UFormField>
              <UFormField label="PWA / app icon" description="Installed-app and home-screen icon. Square, ideally 512x512 with safe padding.">
                <div class="flex items-center gap-3 rounded-lg border border-dashed border-hull p-3">
                  <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded bg-surface-2">
                    <img v-if="appearance.pwaIconUrl" :src="appearance.pwaIconUrl" alt="" class="max-h-full max-w-full object-contain">
                    <DockHubLogo v-else variant="icon" size="sm" />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-upload" label="Upload" @click="pwaIconInput?.click()" />
                    <UButton v-if="appearance.pwaIconUrl" size="xs" color="neutral" variant="ghost" icon="i-lucide-x" label="Use default" @click="clearLogo('pwaIconUrl')" />
                  </div>
                  <input ref="pwaIconInput" type="file" accept="image/*" class="hidden" @change="onLogoFileChange($event, 'pwaIconUrl')">
                </div>
              </UFormField>
            </div>

            <footer class="flex flex-col gap-2 border-t border-hull pt-4 sm:flex-row sm:justify-end">
              <UButton color="neutral" variant="ghost" label="Revert preview" icon="i-lucide-undo-2" @click="revertAppearancePreview" />
              <UButton
                color="neutral"
                variant="ghost"
                label="Reset to defaults"
                icon="i-lucide-rotate-ccw"
                :disabled="!appearanceOverridden"
                :loading="resettingAppearance"
                @click="resetAppearanceToDefaults"
              />
              <UButton color="primary" label="Save appearance" icon="i-lucide-save" :loading="savingAppearance" @click="saveAppearanceSettings" />
            </footer>
          </section>

          <section class="panel p-5">
            <h3 class="font-display text-sm font-semibold text-foam flex items-center gap-2 mb-4">
              <UIcon name="i-lucide-eye" class="size-4 text-beacon" />
              Live preview
            </h3>
            <div class="overflow-hidden rounded-lg border border-hull">
              <div class="flex items-center gap-3 border-b border-hull-soft bg-ink px-4 py-3">
                <DockHubLogo variant="icon" class="size-8 shrink-0" />
                <span class="font-display text-sm font-semibold tracking-tight text-foam">{{ appearance.appName }}</span>
              </div>
              <div class="space-y-3 bg-surface p-4">
                <DockHubLogo size="sm" />
                <div class="flex flex-wrap gap-2">
                  <UButton color="primary" label="Primary action" icon="i-lucide-rocket" />
                  <UButton color="primary" variant="soft" label="Soft" />
                  <UButton color="primary" variant="outline" label="Outline" />
                  <UBadge color="primary" variant="subtle" label="Badge" />
                </div>
                <p class="text-xs text-(--color-muted)">
                  This preview reflects the same CSS variables used across the whole console, including this Settings page.
                </p>
              </div>
            </div>
          </section>
        </div>
      </template>

      <template #access>
        <div class="pt-4 space-y-4">
          <section class="panel p-5">
            <header class="mb-2 flex flex-col gap-1">
              <h3 class="font-display text-sm font-semibold text-foam flex items-center gap-2">
                <UIcon name="i-lucide-layout-grid" class="size-4 text-beacon" />
                App access by identity-provider role
              </h3>
              <p class="text-xs text-(--color-muted)">
                Map your Keycloak realm roles (the <code class="font-mono text-beacon">{{ oidcForm.rolesClaim || 'realm_access.roles' }}</code>
                claim) to each app and tier. A user gets the highest tier whose role list
                matches one of their realm roles; with no match, the app is hidden. Separate
                multiple roles with commas. The local admin always sees every app.
              </p>
            </header>

            <div class="grid gap-4 lg:grid-cols-2">
              <div v-for="app in accessApps" :key="app.key" class="rounded-lg border border-hull-soft bg-surface-2/40 p-4">
                <div class="mb-3 flex items-center gap-2">
                  <UIcon :name="app.icon" class="size-4 text-beacon" />
                  <p class="text-sm font-semibold text-foam">{{ app.name }}</p>
                  <UBadge color="neutral" variant="subtle" size="sm" :label="app.type === 'local' ? 'Built in' : 'Subsystem'" class="ml-auto" />
                </div>
                <div v-if="accessForm[app.key]" class="space-y-3">
                  <UFormField
                    v-for="tier in APP_TIERS"
                    :key="tier"
                    :label="tier.charAt(0).toUpperCase() + tier.slice(1)"
                    :description="tier === 'viewer' ? 'Read-only' : tier === 'operator' ? 'Day-to-day actions' : 'Full control'"
                  >
                    <UInput
                      v-model="accessForm[app.key]![tier]"
                      class="w-full font-mono text-xs"
                      placeholder="e.g. team-ops, sre"
                    />
                  </UFormField>
                </div>
              </div>
            </div>

            <footer class="mt-4 flex justify-end border-t border-hull pt-4">
              <UButton color="primary" label="Save access map" icon="i-lucide-save" :loading="savingAccess" @click="saveAccess" />
            </footer>
          </section>
        </div>
      </template>

      <template #integrations>
        <div class="grid gap-4 pt-4 xl:grid-cols-2">
          <section class="panel p-5 space-y-5">
            <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <h3 class="font-display text-sm font-semibold text-foam flex items-center gap-2">
                  <UIcon name="i-lucide-git-branch" class="size-4 text-beacon" />
                  GitLab
                </h3>
                <div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span class="dot" :class="gitlabDotClass()" />
                  <span :class="gitlabStatusClass()">{{ gitlabStatusLabel() }}</span>
                  <UBadge :color="sourceColor(gl?.overridden)" variant="subtle" :label="sourceLabel(gl?.overridden)" />
                </div>
              </div>
              <USwitch v-model="gitlabForm.enabled" color="primary" class="self-start" />
            </header>

            <div class="grid gap-3 sm:grid-cols-2">
              <UFormField label="GitLab URL">
                <UInput v-model="gitlabForm.url" class="w-full font-mono" placeholder="https://gitlab.com" />
              </UFormField>
              <UFormField label="Project ID">
                <UInput v-model="gitlabForm.projectId" class="w-full font-mono" />
              </UFormField>
              <UFormField label="Branch">
                <UInput v-model="gitlabForm.branch" class="w-full font-mono" placeholder="main" />
              </UFormField>
              <UFormField label="Stacks path">
                <UInput v-model="gitlabForm.stacksPath" class="w-full font-mono" placeholder="stacks" />
              </UFormField>
              <UFormField label="Access token" class="sm:col-span-2">
                <UInput
                  v-model="gitlabForm.token"
                  type="password"
                  class="w-full font-mono"
                  :placeholder="gl?.hasToken ? 'Configured - leave blank to keep' : 'Not set'"
                />
              </UFormField>
            </div>

            <footer class="flex flex-col gap-2 border-t border-hull pt-4 sm:flex-row sm:justify-end">
              <UButton color="neutral" variant="ghost" label="Test connection" icon="i-lucide-plug-zap" :loading="testingGitlab" @click="testGitlabConnection" />
              <UButton color="neutral" variant="ghost" label="Use env defaults" icon="i-lucide-rotate-ccw" :disabled="!gl?.overridden" :loading="resettingGitlab" @click="resetGitlab" />
              <UButton color="primary" label="Save GitLab" icon="i-lucide-save" :loading="savingGitlab" @click="saveGitlab" />
            </footer>
          </section>
        </div>
      </template>

      <template #authentication>
        <div class="pt-4">
          <DataState :status="authLoadStatus" :error="authError" :empty="false">
            <div class="grid gap-5 xl:grid-cols-2">
              <section class="panel p-5 space-y-5">
                <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div class="min-w-0">
                    <h3 class="font-display text-sm font-semibold text-foam flex items-center gap-2">
                      <UIcon name="i-lucide-key-round" class="size-4 text-beacon" />
                      OIDC single sign-on
                    </h3>
                    <div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <span class="dot" :class="oidcForm.enabled ? 'dot-running' : 'dot-idle'" />
                      <span :class="oidcForm.enabled ? 'status-running' : 'text-(--color-muted)'">
                        {{ oidcForm.enabled ? `Enabled - ${oidcForm.providerName || 'SSO'}` : 'Disabled' }}
                      </span>
                      <UBadge :color="sourceColor(auth?.oidc.overridden)" variant="subtle" :label="sourceLabel(auth?.oidc.overridden)" />
                    </div>
                  </div>
                  <div class="flex items-center gap-2 self-start">
                    <UPopover :content="{ align: 'end', sideOffset: 8 }">
                      <UButton icon="i-lucide-circle-help" color="neutral" variant="ghost" aria-label="OIDC setup guide" />
                      <template #content>
                        <div class="w-96 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] overflow-y-auto p-4">
                          <div class="flex items-center gap-2">
                            <UIcon name="i-lucide-key-round" class="size-4 text-beacon" />
                            <p class="text-sm font-semibold text-foam">OIDC setup guide</p>
                          </div>
                          <ol class="mt-3 space-y-2 text-sm text-(--color-muted)">
                            <li v-for="(item, index) in oidcGuide.checklist" :key="item" class="flex gap-2">
                              <span class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-beacon">
                                {{ index + 1 }}
                              </span>
                              <span>{{ item }}</span>
                            </li>
                          </ol>
                          <div class="mt-4 border-t border-hull pt-3">
                            <p class="mb-2 text-xs font-semibold uppercase text-faint">Field notes</p>
                            <div class="space-y-2">
                              <div v-for="field in oidcGuide.fields" :key="field.name">
                                <p class="text-xs font-medium text-foam">{{ field.name }}</p>
                                <p class="text-xs text-(--color-muted)">{{ field.detail }}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </template>
                    </UPopover>
                    <USwitch v-model="oidcForm.enabled" color="primary" />
                  </div>
                </header>

                <div class="grid gap-3 sm:grid-cols-2">
                  <UFormField label="Provider label">
                    <UInput v-model="oidcForm.providerName" class="w-full" placeholder="SSO" />
                  </UFormField>
                  <UFormField label="Issuer URL">
                    <UInput v-model="oidcForm.issuer" class="w-full font-mono" placeholder="https://idp.example.com/realms/main" />
                  </UFormField>
                  <UFormField label="Client ID">
                    <UInput v-model="oidcForm.clientId" class="w-full font-mono" />
                  </UFormField>
                  <UFormField label="Client secret">
                    <UInput
                      v-model="oidcForm.clientSecret"
                      type="password"
                      class="w-full"
                      :placeholder="auth?.oidc.hasClientSecret ? 'Configured - leave blank to keep' : 'Not set'"
                    />
                  </UFormField>
                  <UFormField label="Redirect URI" class="min-w-0">
                    <UInput v-model="oidcForm.redirectUri" class="w-full font-mono" placeholder="Auto from request origin" />
                    <p
                      class="mt-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs text-faint"
                      :title="auth?.oidc.effectiveRedirectUri"
                    >
                      Effective: <span class="font-mono">{{ auth?.oidc.effectiveRedirectUri || 'auto' }}</span>
                    </p>
                  </UFormField>
                  <UFormField label="Scope">
                    <UInput v-model="oidcForm.scope" class="w-full font-mono" />
                  </UFormField>
                  <UFormField label="Username claim">
                    <UInput v-model="oidcForm.usernameClaim" class="w-full font-mono" />
                  </UFormField>
                  <UFormField label="Display name claim">
                    <UInput v-model="oidcForm.displayNameClaim" class="w-full font-mono" />
                  </UFormField>
                  <UFormField label="Groups claim">
                    <UInput v-model="oidcForm.groupsClaim" class="w-full font-mono" />
                  </UFormField>
                  <UFormField label="Realm roles claim" description="Drives per-app access (Apps & Access tab).">
                    <UInput v-model="oidcForm.rolesClaim" class="w-full font-mono" placeholder="realm_access.roles" />
                  </UFormField>
                  <UFormField label="Admin group">
                    <UInput v-model="oidcForm.adminGroup" class="w-full font-mono" />
                  </UFormField>
                  <UFormField label="Operator group">
                    <UInput v-model="oidcForm.operatorGroup" class="w-full font-mono" />
                  </UFormField>
                </div>

                <footer class="flex flex-col gap-2 border-t border-hull pt-4 sm:flex-row sm:justify-end">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    label="Use env defaults"
                    icon="i-lucide-rotate-ccw"
                    :disabled="!auth?.oidc.overridden"
                    :loading="resettingProvider === 'oidc'"
                    @click="resetProvider('oidc')"
                  />
                  <UButton
                    color="primary"
                    label="Save OIDC"
                    icon="i-lucide-save"
                    :loading="savingProvider === 'oidc'"
                    @click="saveProvider('oidc')"
                  />
                </footer>
              </section>

              <section class="panel p-5 space-y-5">
                <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div class="min-w-0">
                    <h3 class="font-display text-sm font-semibold text-foam flex items-center gap-2">
                      <UIcon name="i-lucide-building-2" class="size-4 text-beacon" />
                      LDAP / Active Directory
                    </h3>
                    <div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <span class="dot" :class="ldapForm.enabled ? 'dot-running' : 'dot-idle'" />
                      <span :class="ldapForm.enabled ? 'status-running' : 'text-(--color-muted)'">
                        {{ ldapForm.enabled ? 'Enabled' : 'Disabled - local auth only' }}
                      </span>
                      <UBadge :color="sourceColor(auth?.ldap.overridden)" variant="subtle" :label="sourceLabel(auth?.ldap.overridden)" />
                    </div>
                  </div>
                  <div class="flex items-center gap-2 self-start">
                    <UPopover :content="{ align: 'end', sideOffset: 8 }">
                      <UButton icon="i-lucide-circle-help" color="neutral" variant="ghost" aria-label="LDAP setup guide" />
                      <template #content>
                        <div class="w-96 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] overflow-y-auto p-4">
                          <div class="flex items-center gap-2">
                            <UIcon name="i-lucide-building-2" class="size-4 text-beacon" />
                            <p class="text-sm font-semibold text-foam">LDAP setup guide</p>
                          </div>
                          <ol class="mt-3 space-y-2 text-sm text-(--color-muted)">
                            <li v-for="(item, index) in ldapGuide.checklist" :key="item" class="flex gap-2">
                              <span class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-semibold text-beacon">
                                {{ index + 1 }}
                              </span>
                              <span>{{ item }}</span>
                            </li>
                          </ol>
                          <div class="mt-4 border-t border-hull pt-3">
                            <p class="mb-2 text-xs font-semibold uppercase text-faint">Field notes</p>
                            <div class="space-y-2">
                              <div v-for="field in ldapGuide.fields" :key="field.name">
                                <p class="text-xs font-medium text-foam">{{ field.name }}</p>
                                <p class="text-xs text-(--color-muted)">{{ field.detail }}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </template>
                    </UPopover>
                    <USwitch v-model="ldapForm.enabled" color="primary" />
                  </div>
                </header>

                <div class="grid gap-3 sm:grid-cols-2">
                  <UFormField label="Server URL">
                    <UInput v-model="ldapForm.url" class="w-full font-mono" placeholder="ldaps://ldap.example.com:636" />
                  </UFormField>
                  <UFormField label="Bind DN">
                    <UInput v-model="ldapForm.bindDN" class="w-full font-mono" />
                  </UFormField>
                  <UFormField label="Bind credentials">
                    <UInput
                      v-model="ldapForm.bindCredentials"
                      type="password"
                      class="w-full"
                      :placeholder="auth?.ldap.hasBindCredentials ? 'Configured - leave blank to keep' : 'Not set'"
                    />
                  </UFormField>
                  <UFormField label="User search base">
                    <UInput v-model="ldapForm.searchBase" class="w-full font-mono" />
                  </UFormField>
                  <UFormField label="User search filter">
                    <UInput v-model="ldapForm.searchFilter" class="w-full font-mono" />
                  </UFormField>
                  <UFormField label="Group search base">
                    <UInput v-model="ldapForm.groupSearchBase" class="w-full font-mono" />
                  </UFormField>
                  <UFormField label="Group search filter">
                    <UInput v-model="ldapForm.groupSearchFilter" class="w-full font-mono" />
                  </UFormField>
                  <UFormField label="Admin group">
                    <UInput v-model="ldapForm.adminGroup" class="w-full font-mono" />
                  </UFormField>
                  <UFormField label="Operator group">
                    <UInput v-model="ldapForm.operatorGroup" class="w-full font-mono" />
                  </UFormField>
                </div>

                <footer class="flex flex-col gap-2 border-t border-hull pt-4 sm:flex-row sm:justify-end">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    label="Use env defaults"
                    icon="i-lucide-rotate-ccw"
                    :disabled="!auth?.ldap.overridden"
                    :loading="resettingProvider === 'ldap'"
                    @click="resetProvider('ldap')"
                  />
                  <UButton
                    color="primary"
                    label="Save LDAP"
                    icon="i-lucide-save"
                    :loading="savingProvider === 'ldap'"
                    @click="saveProvider('ldap')"
                  />
                </footer>
              </section>
            </div>
          </DataState>
        </div>
      </template>

      <template #alerts>
        <div class="space-y-5 pt-4">
          <section class="panel p-5">
            <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="font-display text-sm font-semibold text-foam flex items-center gap-2">
                  <UIcon name="i-lucide-send" class="size-4 text-beacon" />
                  Notification channels
                </h3>
                <p class="mt-1 text-xs text-(--color-muted)">Where alerts are delivered. Every enabled channel receives every fired alert.</p>
              </div>
              <UButton color="primary" variant="soft" icon="i-lucide-plus" label="Add channel" @click="openCreateChannel" />
            </header>

            <div v-if="!channels?.length" class="rounded-lg border border-dashed border-hull p-6 text-center text-sm text-(--color-muted)">
              No channels configured yet.
            </div>
            <div v-else class="divide-y divide-hull">
              <div v-for="ch in channels" :key="ch.id" class="flex flex-wrap items-center justify-between gap-3 py-3">
                <div class="flex min-w-0 items-center gap-3">
                  <UIcon :name="channelTypeIcon(ch.type)" class="size-4 shrink-0 text-beacon" />
                  <div class="min-w-0">
                    <p class="truncate text-sm text-foam">{{ ch.name }}</p>
                    <p class="text-xs text-faint">{{ channelTypeLabel(ch.type) }}</p>
                  </div>
                  <UBadge :color="ch.enabled ? 'primary' : 'neutral'" variant="subtle" :label="ch.enabled ? 'Enabled' : 'Disabled'" />
                </div>
                <div class="flex items-center gap-2">
                  <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-send" label="Test" :loading="testingChannelId === ch.id" @click="testChannel(ch.id)" />
                  <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-pencil" aria-label="Edit channel" @click="openEditChannel(ch)" />
                  <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" aria-label="Delete channel" :loading="deletingChannelId === ch.id" @click="deleteChannel(ch)" />
                </div>
              </div>
            </div>
          </section>

          <section class="panel p-5">
            <h3 class="font-display text-sm font-semibold text-foam flex items-center gap-2 mb-1">
              <UIcon name="i-lucide-bell" class="size-4 text-beacon" />
              Alert rules
            </h3>
            <p class="mb-4 text-xs text-(--color-muted)">Toggle what triggers an alert, tune thresholds, and customize the message sent to every channel above.</p>

            <div class="grid gap-4 lg:grid-cols-2">
              <div v-for="rule in rules" :key="rule.type" class="rounded-lg border border-hull-soft bg-surface-2/40 p-4">
                <div v-if="ruleEdits[rule.type]" class="flex items-center justify-between gap-3 mb-3">
                  <div class="flex items-center gap-2">
                    <UIcon :name="RULE_LABELS[rule.type]?.icon || 'i-lucide-bell'" class="size-4 text-beacon" />
                    <p class="text-sm font-semibold text-foam">{{ RULE_LABELS[rule.type]?.label || rule.type }}</p>
                  </div>
                  <USwitch v-model="ruleEdits[rule.type]!.enabled" color="primary" />
                </div>

                <template v-if="ruleEdits[rule.type]">
                  <div v-if="rule.type === 'usage_threshold'" class="mb-3 grid grid-cols-2 gap-3">
                    <UFormField label="CPU threshold (%)">
                      <UInput v-model.number="ruleEdits[rule.type]!.config.cpuPercent" type="number" min="1" max="100" class="w-full" />
                    </UFormField>
                    <UFormField label="Memory threshold (%)">
                      <UInput v-model.number="ruleEdits[rule.type]!.config.memoryPercent" type="number" min="1" max="100" class="w-full" />
                    </UFormField>
                  </div>
                  <div v-else-if="rule.type === 'replicas_degraded'" class="mb-3">
                    <UFormField label="Grace period (minutes)">
                      <UInput v-model.number="ruleEdits[rule.type]!.config.gracePeriodMinutes" type="number" min="0" class="w-40" />
                    </UFormField>
                  </div>
                  <div v-else-if="rule.type === 'disk_usage_threshold'" class="mb-3">
                    <UFormField label="Disk threshold (%)">
                      <UInput v-model.number="ruleEdits[rule.type]!.config.percent" type="number" min="1" max="100" class="w-40" />
                    </UFormField>
                  </div>

                  <button
                    type="button"
                    class="mb-2 flex items-center gap-1.5 text-xs text-faint transition hover:text-foam"
                    @click="ruleEdits[rule.type]!.templateOpen = !ruleEdits[rule.type]!.templateOpen"
                  >
                    <UIcon :name="ruleEdits[rule.type]!.templateOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-3.5" />
                    Customize message
                  </button>
                  <div v-if="ruleEdits[rule.type]!.templateOpen" class="mb-3 space-y-2">
                    <UTextarea v-model="ruleEdits[rule.type]!.template" class="w-full font-mono text-xs" :rows="2" />
                    <div class="flex flex-wrap gap-1.5">
                      <span v-for="p in rule.placeholders" :key="p" class="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-beacon">{{ placeholderChip(p) }}</span>
                    </div>
                  </div>
                </template>

                <footer class="flex justify-end gap-2 border-t border-hull pt-3">
                  <UButton size="xs" color="neutral" variant="ghost" label="Reset" icon="i-lucide-rotate-ccw" :loading="resettingRule === rule.type" @click="resetRule(rule.type)" />
                  <UButton size="xs" color="primary" label="Save" icon="i-lucide-save" :loading="savingRule === rule.type" @click="saveRule(rule.type)" />
                </footer>
              </div>
            </div>
          </section>
        </div>

        <UModal v-model:open="channelModalOpen" :title="channelModalMode === 'create' ? 'Add channel' : 'Edit channel'">
          <template #body>
            <div class="space-y-4">
              <UFormField label="Name">
                <UInput v-model="channelForm.name" class="w-full" placeholder="Ops Telegram" />
              </UFormField>
              <UFormField label="Type">
                <USelect v-model="channelForm.type" :items="channelTypeItems" value-key="value" label-key="label" class="w-full" :disabled="channelModalMode === 'edit'" />
              </UFormField>

              <template v-if="channelForm.type === 'telegram'">
                <UFormField label="Bot token">
                  <UInput v-model="channelForm.botToken" type="password" class="w-full font-mono" :placeholder="channelModalMode === 'edit' ? 'Leave blank to keep existing' : ''" />
                </UFormField>
                <UFormField label="Chat ID">
                  <UInput v-model="channelForm.chatId" class="w-full font-mono" :placeholder="channelModalMode === 'edit' ? 'Leave blank to keep existing' : ''" />
                </UFormField>
              </template>
              <template v-else-if="channelForm.type === 'teams'">
                <UFormField label="Webhook URL">
                  <UInput v-model="channelForm.webhookUrl" type="password" class="w-full font-mono" :placeholder="channelModalMode === 'edit' ? 'Leave blank to keep existing' : ''" />
                </UFormField>
              </template>
              <template v-else>
                <UFormField label="URL">
                  <UInput v-model="channelForm.url" type="password" class="w-full font-mono" :placeholder="channelModalMode === 'edit' ? 'Leave blank to keep existing' : ''" />
                </UFormField>
                <UFormField label="Headers" description="One per line, key: value">
                  <UTextarea v-model="channelForm.headersText" class="w-full font-mono text-xs" :rows="3" />
                </UFormField>
              </template>

              <UFormField label="Enabled">
                <USwitch v-model="channelForm.enabled" color="primary" />
              </UFormField>
            </div>
          </template>
          <template #footer>
            <div class="flex w-full justify-end gap-2">
              <UButton color="neutral" variant="ghost" label="Cancel" @click="channelModalOpen = false" />
              <UButton color="primary" label="Save" icon="i-lucide-save" :loading="savingChannel" @click="saveChannel" />
            </div>
          </template>
        </UModal>
      </template>

      <template #reference>
        <div class="panel p-5 mt-4">
          <p class="text-xs text-(--color-muted) mb-4">
            Environment variables provide defaults. Saved settings (authentication, integrations, alerts, appearance) are persisted in Postgres and override those defaults until reset.
          </p>
          <ListControls
            v-model:search="envSearch"
            v-model:sort-by="envSortBy"
            v-model:sort-dir="envSortDir"
            :sort-options="envSortOptionsState"
            placeholder="Search environment variables"
          />
          <div class="space-y-0">
            <div
              v-for="e in filteredEnvVars"
              :key="e.k"
              class="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-2 border-b border-hull/40 last:border-0"
            >
              <code class="font-mono text-xs text-beacon sm:w-80 shrink-0">{{ e.k }}</code>
              <span class="text-xs text-(--color-muted)">{{ e.d }}</span>
            </div>
          </div>
        </div>
      </template>
    </UTabs>
  </div>
</template>
