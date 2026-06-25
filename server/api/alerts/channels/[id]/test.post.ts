import { requireRole } from '~~/server/utils/auth'
import { getAlertChannelWithConfig } from '~~/server/utils/alertChannels'
import { notifyChannel } from '~~/server/utils/alertNotify'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')!
  const channel = await getAlertChannelWithConfig(id)
  if (!channel) throw createError({ statusCode: 404, statusMessage: 'Channel not found' })

  try {
    await notifyChannel(channel, 'Test notification from KNetraHub')
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to send test notification' }
  }
})
