import { getDb } from '../utils/db'

export default defineNitroPlugin((nitroApp) => {
  // Start simulated background polling to mimic LibreNMS active polling
  setInterval(async () => {
    try {
      const db = getDb()
      
      // Update interface traffic randomly
      await db.query(`
        UPDATE net_interfaces 
        SET in_traffic = FLOOR(random() * 1000)::text || ' Mbps',
            out_traffic = FLOOR(random() * 500)::text || ' Mbps'
        WHERE status = 'up' OR oper_status = 'up'
      `)
      
      // Update sensor values randomly (fluctuate within limits)
      await db.query(`
        UPDATE net_sensors
        SET current_value = ROUND((limit_low + (random() * (limit_high - limit_low)))::numeric, 1)
      `)
      
      // Simulate ping/uptime updates
      // This makes the UI feel "alive" as if a real poller is updating statuses
      
    } catch (err) {
      // console.error('[netPoller] error:', err)
    }

    // Occasional Syslog & Flow generation (approx every 30s)
    if (Math.random() < 0.3) {
      try {
        const db = getDb()
        const devRes = await db.query('SELECT id FROM net_devices ORDER BY RANDOM() LIMIT 1')
        if (devRes.rows.length) {
          const did = devRes.rows[0].id
          
          // Random Syslog
          const msgs = ['Configuration changed', 'User logged in', 'Interface state changed to up', 'Session timeout', 'BGP Peer down']
          const progs = ['sshd', 'kernel', 'nginx', 'snmpd', 'bgpd']
          const msg = msgs[Math.floor(Math.random() * msgs.length)]
          const prog = progs[Math.floor(Math.random() * progs.length)]
          await db.query(`INSERT INTO net_syslog (id, device_id, facility, severity, program, message, timestamp) VALUES ($1, $2, 'local7', 'info', $3, $4, $5)`,
            [Math.random().toString(36).substring(2, 10), did, prog, msg, new Date().toISOString()]
          )
          
          // Random Flow
          const bps = Math.floor(Math.random() * 5000000)
          await db.query(`INSERT INTO net_flows (id, device_id, protocol, src_ip, dst_ip, src_port, dst_port, bytes, packets, timestamp) VALUES ($1, $2, 'TCP', '10.10.10.1', '8.8.8.8', 443, 443, $3, $4, $5)`,
            [Math.random().toString(36).substring(2, 10), did, bps, Math.floor(bps / 1500), new Date().toISOString()]
          )
        }
      } catch (e) {}
    }
  }, 10000) // Poll every 10 seconds for demo purposes
})
