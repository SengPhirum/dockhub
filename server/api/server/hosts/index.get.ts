import { getDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const result = await db.query('SELECT * FROM server_hosts ORDER BY name ASC')
  return result.rows
})
