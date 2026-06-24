import { getDb } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const db = getDb()
  
  const res = await db.query('SELECT * FROM ipmgt_ips WHERE subnet_id = $1 ORDER BY ip ASC', [id])
  
  return res.rows
})
