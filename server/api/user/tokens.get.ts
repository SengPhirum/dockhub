import { requireUser } from '~~/server/utils/auth'
import { listApiTokens } from '~~/server/utils/store'
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return listApiTokens(user.id)
})
