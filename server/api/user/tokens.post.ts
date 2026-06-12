import { requireUser } from '~~/server/utils/auth'
import { createApiToken } from '~~/server/utils/store'
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { name } = await readBody<{ name: string }>(event)
  if (!name?.trim()) throw createError({ statusCode: 400, statusMessage: 'name is required' })
  return createApiToken(user.id, name.trim())
})
