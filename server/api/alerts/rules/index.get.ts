import { requireRole } from '~~/server/utils/auth'
import { getAllAlertRules } from '~~/server/utils/alertRules'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'admin')
  return getAllAlertRules()
})
