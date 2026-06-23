import { requireRole } from '~~/server/utils/auth'
import { deleteAlertChannel, getAlertChannelWithConfig } from '~~/server/utils/alertChannels'
import { audit } from '~~/server/utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')!
  const existing = await getAlertChannelWithConfig(id)
  await deleteAlertChannel(id)
  await audit({ actor: user.username, action: 'alerts.channel.delete', target: existing?.name || id })
  return { ok: true }
})
