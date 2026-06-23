import { requireRole } from '~~/server/utils/auth'
import { createAlertChannel } from '~~/server/utils/alertChannels'
import type { AlertChannelType } from '~~/server/utils/alertChannels'
import { audit } from '~~/server/utils/store'

const TYPES: AlertChannelType[] = ['telegram', 'teams', 'webhook']

function validateConfig(type: AlertChannelType, config: Record<string, unknown>) {
  if (type === 'telegram') {
    if (!config.botToken || !config.chatId) throw createError({ statusCode: 400, statusMessage: 'Telegram channels require botToken and chatId' })
    return { botToken: String(config.botToken).trim(), chatId: String(config.chatId).trim() }
  }
  if (type === 'teams') {
    if (!config.webhookUrl) throw createError({ statusCode: 400, statusMessage: 'Teams channels require webhookUrl' })
    return { webhookUrl: String(config.webhookUrl).trim() }
  }
  if (!config.url) throw createError({ statusCode: 400, statusMessage: 'Webhook channels require url' })
  return { url: String(config.url).trim(), headers: (config.headers as Record<string, string>) || {} }
}

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'admin')
  const body = await readBody<{ name?: string; type?: string; enabled?: boolean; config?: Record<string, unknown> }>(event)

  if (!body.name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Name is required' })
  if (!body.type || !TYPES.includes(body.type as AlertChannelType)) {
    throw createError({ statusCode: 400, statusMessage: `type must be one of ${TYPES.join(', ')}` })
  }
  const type = body.type as AlertChannelType
  const config = validateConfig(type, body.config || {})

  const channel = await createAlertChannel({ name: body.name.trim(), type, enabled: body.enabled !== false, config })
  await audit({ actor: user.username, action: 'alerts.channel.create', target: channel.name })
  return channel
})
