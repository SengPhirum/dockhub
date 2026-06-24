import { getDb } from '../utils/db'

export default defineEventHandler(async () => {
  try {
    await getDb().query('SELECT 1')
    return { status: 'ok', service: 'knetrahub-net-api' }
  } catch (err: any) {
    throw createError({ statusCode: 503, statusMessage: 'Database unreachable', data: { error: err?.message } })
  }
})
