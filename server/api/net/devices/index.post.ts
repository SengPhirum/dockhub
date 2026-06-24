import { getDb } from '../../../utils/db'
import { nanoid } from 'nanoid'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = getDb()
  
  const id = nanoid()
  const now = new Date().toISOString()
  
  await db.query(`
    INSERT INTO net_devices 
    (id, hostname, ip, type, vendor, os, status, uptime, snmp_version, snmp_community, poll_method, category, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `, [
    id, 
    body.hostname, 
    body.ip, 
    body.type || 'Unknown',
    body.vendor || 'Unknown',
    body.os || 'Unknown',
    'unknown',
    '0 days',
    body.snmp_version || null,
    body.snmp_community || null,
    body.poll_method || 'ping',
    body.category || 'network',
    now
  ])
  
  return { id }
})
