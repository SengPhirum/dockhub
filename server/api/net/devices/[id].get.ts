import { getDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const db = getDb()
  
  const devRes = await db.query('SELECT * FROM net_devices WHERE id = $1', [id])
  if (devRes.rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Device not found' })
  }
  
  const ifaceRes = await db.query('SELECT * FROM net_interfaces WHERE device_id = $1 ORDER BY name ASC', [id])
  const sensorRes = await db.query('SELECT * FROM net_sensors WHERE device_id = $1 ORDER BY name ASC', [id])
  
  return {
    ...devRes.rows[0],
    interfaces: ifaceRes.rows,
    sensors: sensorRes.rows
  }
})
