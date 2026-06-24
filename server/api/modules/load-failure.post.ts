import { requireUser } from '~~/server/utils/auth'
import { audit } from '~~/server/utils/store'

/**
 * Fire-and-forget endpoint RemoteModuleLoader calls when a remote subsystem
 * UI fails to load, so outages are visible in the existing Audit log rather
 * than only in the browser console.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ moduleKey?: string; remoteName?: string; remoteEntryUrl?: string; error?: string }>(event)
  await audit({
    actor: user.username,
    action: 'module.load_failed',
    target: body.moduleKey || body.remoteName || 'unknown',
    detail: `${body.remoteName || ''} ${body.remoteEntryUrl || ''} - ${body.error || ''}`.trim()
  })
  return { ok: true }
})
