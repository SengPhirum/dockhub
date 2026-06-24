import { requireRole } from '~~/server/utils/auth'
import { setAppRoleMap } from '~~/server/utils/appRoles'
import { audit } from '~~/server/utils/store'

// Replace the app -> realm-role mapping. Body is the full map; setAppRoleMap
// sanitizes it (unknown apps/tiers dropped, role names trimmed/deduped).
export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'admin')
  const body = await readBody<unknown>(event)
  const next = await setAppRoleMap(body, user.username)
  await audit({ actor: user.username, action: 'settings.app_roles.update', target: 'app_role_map' })
  return next
})
