import { requireRole } from '~~/server/utils/auth'
import { updateAlertChannel } from '~~/server/utils/alertChannels'
import { audit } from '~~/server/utils/store'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'admin')
  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ name?: string; enabled?: boolean; config?: Record<string, unknown> }>(event)

  const patch: { name?: string; enabled?: boolean; config?: Record<string, unknown> } = {}
  if (body.name !== undefined) patch.name = body.name.trim()
  if (body.enabled !== undefined) patch.enabled = body.enabled
  if (body.config !== undefined) {
    // Blank/omitted config fields keep their current value - handled by
    // updateAlertChannel's merge, which skips '' / null / undefined.
    patch.config = Object.fromEntries(
      Object.entries(body.config).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    )
  }

  const channel = await updateAlertChannel(id, patch)
  await audit({ actor: user.username, action: 'alerts.channel.update', target: channel.name })
  return channel
})
