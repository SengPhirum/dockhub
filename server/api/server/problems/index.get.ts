import { getDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const db = getDb()
  // Join with server_hosts to get the host name
  const result = await db.query(`
    SELECT p.*, h.name as host 
    FROM server_problems p
    LEFT JOIN server_hosts h ON p.host_id = h.id
    ORDER BY p.fired_at DESC
  `)
  return result.rows
})
