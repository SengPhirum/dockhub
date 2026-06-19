import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { createHash, randomBytes } from 'node:crypto'

export type Role = 'admin' | 'operator' | 'viewer'
export type UserSource = 'local' | 'ldap' | 'oidc'

export interface User {
  id: string
  username: string
  displayName: string
  email?: string
  role: Role
  source: UserSource
  passwordHash?: string
  createdAt: string
  lastLogin?: string
}

export interface UserPreferences {
  theme: 'system' | 'dark' | 'light'
  refreshInterval: number   // seconds; 0 = manual
  density: 'default' | 'compact' | 'comfortable'
  lists: Record<string, { sortBy: string; sortDir: 'asc' | 'desc' }>
}

export interface AuditEntry {
  id: string
  ts: string
  actor: string
  action: string
  target?: string
  detail?: string
}

export interface Registry {
  id: string
  name: string
  url: string
  username: string
  auth?: string
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function rowToUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    email: row.email ?? undefined,
    role: row.role as Role,
    source: row.source as UserSource,
    passwordHash: row.password_hash ?? undefined,
    createdAt: row.created_at,
    lastLogin: row.last_login ?? undefined
  }
}

function ensureAdmin() {
  const db = getDb()
  const { n } = db.prepare('SELECT COUNT(*) as n FROM users').get() as { n: number }
  if (n > 0) return
  const password = process.env.NUXT_ADMIN_PASSWORD || 'admin'
  db.prepare(
    'INSERT INTO users (id, username, display_name, role, source, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    nanoid(),
    process.env.NUXT_ADMIN_USERNAME || 'admin',
    'Administrator',
    'admin',
    'local',
    bcrypt.hashSync(password, 10),
    new Date().toISOString()
  )
}

// ─── users ────────────────────────────────────────────────────────────────────

export async function listUsers(): Promise<User[]> {
  ensureAdmin()
  const db = getDb()
  return (db.prepare('SELECT * FROM users ORDER BY created_at').all() as any[]).map((r) => {
    const u = rowToUser(r)
    delete u.passwordHash
    return u
  })
}

export async function findUser(username: string): Promise<User | undefined> {
  ensureAdmin()
  const db = getDb()
  const row = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username)
  return row ? rowToUser(row as any) : undefined
}

export async function verifyLocalUser(username: string, password: string): Promise<User | null> {
  const user = await findUser(username)
  if (!user || user.source !== 'local' || !user.passwordHash) return null
  if (!bcrypt.compareSync(password, user.passwordHash)) return null
  return user
}

export async function upsertExternalUser(input: {
  username: string
  displayName: string
  email?: string
  role: Role
  source: Exclude<UserSource, 'local'>
}): Promise<User> {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(input.username) as any

  if (existing) {
    db.prepare(
      'UPDATE users SET display_name = ?, email = ?, role = ?, source = ? WHERE id = ?'
    ).run(input.displayName, input.email ?? null, input.role, input.source, existing.id)
  } else {
    const id = nanoid()
    db.prepare(
      'INSERT INTO users (id, username, display_name, email, role, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, input.username, input.displayName, input.email ?? null, input.role, input.source, new Date().toISOString())
  }

  const row = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(input.username)
  return rowToUser(row as any)
}

export async function createLocalUser(input: {
  username: string
  displayName: string
  email?: string
  role: Role
  password: string
}): Promise<User> {
  const db = getDb()
  const clash = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(input.username)
  if (clash) throw createError({ statusCode: 409, statusMessage: 'A user with that name already exists' })

  const id = nanoid()
  db.prepare(
    'INSERT INTO users (id, username, display_name, email, role, source, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    input.username,
    input.displayName || input.username,
    input.email ?? null,
    input.role,
    'local',
    bcrypt.hashSync(input.password, 10),
    new Date().toISOString()
  )

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
  const user = rowToUser(row)
  delete user.passwordHash
  return user
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<User, 'role' | 'displayName' | 'email'>> & { password?: string }
): Promise<User> {
  const db = getDb()
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
  if (!row) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const fields: string[] = []
  const vals: any[] = []

  if (patch.role !== undefined) { fields.push('role = ?'); vals.push(patch.role) }
  if (patch.displayName !== undefined) { fields.push('display_name = ?'); vals.push(patch.displayName) }
  if (patch.email !== undefined) { fields.push('email = ?'); vals.push(patch.email) }
  if (patch.password && row.source === 'local') {
    fields.push('password_hash = ?')
    vals.push(bcrypt.hashSync(patch.password, 10))
  }

  if (fields.length) {
    vals.push(id)
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...vals)
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
  const user = rowToUser(updated)
  delete user.passwordHash
  return user
}

export async function deleteUser(id: string): Promise<void> {
  getDb().prepare('DELETE FROM users WHERE id = ?').run(id)
}

export async function touchLogin(username: string): Promise<void> {
  getDb().prepare('UPDATE users SET last_login = ? WHERE username = ? COLLATE NOCASE').run(
    new Date().toISOString(), username
  )
}

// ─── user preferences ─────────────────────────────────────────────────────────

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const db = getDb()
  const row = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as any
  if (!row) return { theme: 'system', refreshInterval: 0, density: 'default', lists: {} }
  const data = parsePreferenceData(row.data)
  return {
    theme: row.theme as UserPreferences['theme'],
    refreshInterval: row.refresh_interval as number,
    density: row.density as UserPreferences['density'],
    lists: sanitizeListPreferences(data.lists)
  }
}

function parsePreferenceData(raw: string | null | undefined): Record<string, any> {
  try {
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function sanitizeListPreferences(input: any): UserPreferences['lists'] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  const lists: UserPreferences['lists'] = {}
  for (const [key, value] of Object.entries(input)) {
    if (!value || typeof value !== 'object') continue
    const sortBy = String((value as any).sortBy || '')
    const sortDir = (value as any).sortDir === 'desc' ? 'desc' : 'asc'
    if (key && sortBy) lists[key] = { sortBy, sortDir }
  }
  return lists
}

export async function updateUserPreferences(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences> {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as any
  const currentData = parsePreferenceData(existing?.data)
  const nextData = patch.lists !== undefined
    ? { ...currentData, lists: sanitizeListPreferences(patch.lists) }
    : currentData

  if (!existing) {
    db.prepare(
      'INSERT INTO user_preferences (user_id, theme, refresh_interval, density, data) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, patch.theme ?? 'system', patch.refreshInterval ?? 0, patch.density ?? 'default', JSON.stringify(nextData))
  } else {
    const fields: string[] = []
    const vals: any[] = []
    if (patch.theme !== undefined) { fields.push('theme = ?'); vals.push(patch.theme) }
    if (patch.refreshInterval !== undefined) { fields.push('refresh_interval = ?'); vals.push(patch.refreshInterval) }
    if (patch.density !== undefined) { fields.push('density = ?'); vals.push(patch.density) }
    if (patch.lists !== undefined) { fields.push('data = ?'); vals.push(JSON.stringify(nextData)) }
    if (fields.length) {
      vals.push(userId)
      db.prepare(`UPDATE user_preferences SET ${fields.join(', ')} WHERE user_id = ?`).run(...vals)
    }
  }

  return getUserPreferences(userId)
}

// ─── audit ────────────────────────────────────────────────────────────────────

export async function audit(entry: Omit<AuditEntry, 'id' | 'ts'>): Promise<void> {
  const db = getDb()
  db.prepare(
    'INSERT INTO audit (id, ts, actor, action, target, detail) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(nanoid(), new Date().toISOString(), entry.actor, entry.action, entry.target ?? null, entry.detail ?? null)

  // Keep only 1000 most recent entries
  db.prepare(`
    DELETE FROM audit WHERE id NOT IN (
      SELECT id FROM audit ORDER BY ts DESC LIMIT 1000
    )
  `).run()
}

export async function listAudit(limit = 200): Promise<AuditEntry[]> {
  return (getDb().prepare('SELECT * FROM audit ORDER BY ts DESC LIMIT ?').all(limit) as any[]).map((r) => ({
    id: r.id,
    ts: r.ts,
    actor: r.actor,
    action: r.action,
    target: r.target ?? undefined,
    detail: r.detail ?? undefined
  }))
}

// ─── registries ───────────────────────────────────────────────────────────────

export async function listRegistries(): Promise<Registry[]> {
  return (getDb().prepare('SELECT * FROM registries ORDER BY name').all() as any[]).map((r) => ({
    id: r.id,
    name: r.name,
    url: r.url,
    username: r.username,
    auth: r.auth ?? undefined
  }))
}

export async function addRegistry(input: Omit<Registry, 'id'>): Promise<Registry> {
  const db = getDb()
  const id = nanoid()
  db.prepare(
    'INSERT INTO registries (id, name, url, username, auth) VALUES (?, ?, ?, ?, ?)'
  ).run(id, input.name, input.url, input.username, input.auth ?? null)
  return { id, ...input }
}

export async function deleteRegistry(id: string): Promise<void> {
  getDb().prepare('DELETE FROM registries WHERE id = ?').run(id)
}

// ─── app settings ─────────────────────────────────────────────────────────────

export async function getAppSetting(key: string): Promise<string | null> {
  const row = getDb().prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as any
  return row?.value ?? null
}

export async function setAppSetting(key: string, value: string, actor: string): Promise<void> {
  getDb().prepare(
    'INSERT OR REPLACE INTO app_settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)'
  ).run(key, value, new Date().toISOString(), actor)
}

export async function deleteAppSetting(key: string): Promise<void> {
  getDb().prepare('DELETE FROM app_settings WHERE key = ?').run(key)
}

// ─── api tokens ───────────────────────────────────────────────────────────────

export interface ApiToken {
  id: string
  userId: string
  name: string
  prefix: string
  createdAt: string
  lastUsed?: string
}

export async function listApiTokens(userId: string): Promise<ApiToken[]> {
  return (getDb().prepare('SELECT * FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[]).map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    prefix: r.prefix,
    createdAt: r.created_at,
    lastUsed: r.last_used ?? undefined
  }))
}

export async function createApiToken(userId: string, name: string): Promise<ApiToken & { token: string }> {
  const raw = 'dhub_' + randomBytes(24).toString('base64url')
  const hash = createHash('sha256').update(raw).digest('hex')
  const prefix = raw.slice(5, 13)
  const id = nanoid()
  const createdAt = new Date().toISOString()
  getDb().prepare(
    'INSERT INTO api_tokens (id, user_id, name, token_hash, prefix, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, userId, name, hash, prefix, createdAt)
  return { id, userId, name, prefix, createdAt, token: raw }
}

export async function deleteApiToken(id: string, userId: string): Promise<void> {
  const result = getDb().prepare('DELETE FROM api_tokens WHERE id = ? AND user_id = ?').run(id, userId)
  if ((result as any).changes === 0) throw createError({ statusCode: 404, statusMessage: 'Token not found' })
}

export async function lookupApiTokenUser(raw: string): Promise<{ id: string; username: string; displayName: string; role: Role; source: UserSource } | null> {
  if (!raw.startsWith('dhub_')) return null
  const hash = createHash('sha256').update(raw).digest('hex')
  const db = getDb()
  const row = db.prepare(`
    SELECT t.user_id, u.username, u.display_name, u.role, u.source
    FROM api_tokens t
    JOIN users u ON u.id = t.user_id
    WHERE t.token_hash = ?
  `).get(hash) as any
  if (!row) return null
  db.prepare('UPDATE api_tokens SET last_used = ? WHERE token_hash = ?').run(new Date().toISOString(), hash)
  return {
    id: row.user_id,
    username: row.username,
    displayName: row.display_name,
    role: row.role as Role,
    source: row.source as UserSource
  }
}
