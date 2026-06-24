import { getDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const result = await db.query('SELECT * FROM ipmgt_subnets ORDER BY network ASC')
  return result.rows
})
