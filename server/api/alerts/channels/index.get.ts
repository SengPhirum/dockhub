import { requireRole } from '~~/server/utils/auth'
import { listAlertChannels } from '~~/server/utils/alertChannels'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'admin')
  return listAlertChannels()
})
