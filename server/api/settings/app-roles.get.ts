import { requireRole } from '~~/server/utils/auth'
import { getAppRoleMap } from '~~/server/utils/appRoles'

// Returns the app -> realm-role mapping that drives per-app access. Admin only:
// it reveals which Keycloak roles grant which apps.
export default defineEventHandler(async (event) => {
  await requireRole(event, 'admin')
  return await getAppRoleMap()
})
