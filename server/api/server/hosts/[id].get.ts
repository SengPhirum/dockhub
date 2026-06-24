import { getDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const db = getDb()
  
  const res = await db.query('SELECT * FROM server_hosts WHERE id = $1', [id])
  if (res.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Host not found' })
  }
  
  return res.rows[0]
})
