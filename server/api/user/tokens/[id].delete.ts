import { requireUser } from '~~/server/utils/auth'
import { deleteApiToken } from '~~/server/utils/store'
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')!
  await deleteApiToken(id, user.id)
  return { ok: true }
})
