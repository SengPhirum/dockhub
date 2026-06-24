import { getDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const db = getDb()
  
  await db.query(`
    UPDATE net_devices 
    SET hostname = $1, ip = $2, snmp_version = $3, snmp_community = $4, poll_method = $5, category = $6
    WHERE id = $7
  `, [
    body.hostname, 
    body.ip, 
    body.snmp_version || null,
    body.snmp_community || null,
    body.poll_method || 'ping',
    body.category || 'network',
    id
  ])
  
  return { success: true }
})
