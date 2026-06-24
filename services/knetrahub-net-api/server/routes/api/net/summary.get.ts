import { requirePermission } from '../../../utils/auth'
import { getDb, migrate } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'net.view')
  await migrate()

  const db = getDb()
  const { rows } = await db.query(`
    SELECT
      count(*) FILTER (WHERE status = 'online')::int AS devices_online,
      count(*) FILTER (WHERE status != 'online')::int AS devices_down
    FROM net.devices
  `)

  const { rows: latencyRows } = await db.query(`
    SELECT avg(latency_ms)::int AS avg_latency_ms
    FROM net.ping_checks
    WHERE checked_at > now() - interval '15 minutes' AND success
  `)

  return {
    devicesOnline: rows[0]?.devices_online ?? 0,
    devicesDown: rows[0]?.devices_down ?? 0,
    avgLatencyMs: latencyRows[0]?.avg_latency_ms ?? 0,
    // No real bandwidth-threshold alerting wired up yet (KNetraHub-Net's
    // bandwidth_metrics table exists but nothing populates/evaluates it) -
    // 0 here is accurate, not a placeholder.
    bandwidthWarnings: 0
  }
})
