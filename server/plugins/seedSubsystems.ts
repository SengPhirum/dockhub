import { getDb, waitForDb, migrate } from '../utils/db'
import { nanoid } from 'nanoid'

export default defineNitroPlugin(async (nitroApp) => {
  // Only run this in development or if specifically requested, or as a one-time MVP seed
  nitroApp.hooks.hook('request', async () => {
    // We hook into the first request to ensure db is ready, but we only run once
  })
  
  // Actually, Nitro plugins run on startup. It's better to just run it on startup
  // but wait for DB.
  
  setTimeout(async () => {
    try {
      await waitForDb()
      await migrate()
      
      const db = getDb()
      
      // Check if network devices exist
      const netRes = await db.query('SELECT count(*) as cnt FROM net_devices')
      if (Number(netRes.rows[0].cnt) === 0) {
        console.log('[seed] Seeding MVP Network data...')
        
        const dev1Id = nanoid()
        const dev2Id = nanoid()
        const dev3Id = nanoid()
        const dev4Id = nanoid()
        const dev5Id = nanoid()
        const dev6Id = nanoid()
        const dev7Id = nanoid()
        
        await db.query(`INSERT INTO net_devices (id, hostname, ip, type, vendor, os, status, uptime, snmp_version, snmp_community, poll_method, category, sys_name, sys_descr, sys_object_id, created_at) VALUES 
          ($1, 'Core-Switch-01', '10.0.0.1', 'Switch', 'Cisco', 'IOS-XE 16.9.4', 'up', '14 days', 'v2c', 'public', 'snmp', 'network', 'core-sw-01.local', 'Cisco IOS Software', '1.3.6.1.4.1.9.1', $8),
          ($2, 'Router-B', '10.0.0.2', 'Router', 'Juniper', 'Junos 21.2', 'up', '14 days', 'v2c', 'public', 'snmp', 'network', 'router-b.local', 'Juniper Networks', '1.3.6.1.4.1.2636.1', $8),
          ($3, 'Firewall-FW1', '10.0.0.254', 'Firewall', 'Palo Alto', 'PAN-OS 10.1', 'down', '0 days', 'v3', 'private', 'snmp', 'network', 'fw1.local', 'Palo Alto Networks', '1.3.6.1.4.1.25461', $8),
          ($4, 'Synology-NAS-01', '10.0.0.50', 'NAS', 'Synology', 'DSM 7.2', 'up', '42 days', 'v2c', 'public', 'snmp', 'storage', 'nas-01.local', 'Synology DiskStation', '1.3.6.1.4.1.6574.1', $8),
          ($5, 'HP-Printer-Floor1', '10.0.0.200', 'Printer', 'HP', 'Unknown', 'up', '5 days', NULL, NULL, 'ping', 'ping-only', NULL, NULL, NULL, $8),
          ($6, 'VM-AppServer-01', '10.0.0.30', 'Server', 'VMware', 'Ubuntu 24.04', 'up', '120 days', 'v2c', 'public', 'snmp', 'server', 'app-01.local', 'Linux app-01 6.8.0', '1.3.6.1.4.1.8072.3.2.10', $8),
          ($7, 'EnvSensor-Rack1', '10.0.0.150', 'Environment', 'APC', 'AOS 6.8', 'up', '300 days', 'v1', 'public', 'snmp', 'iot', 'apc-env-01.local', 'APC NetBotz', '1.3.6.1.4.1.318.1.3.27', $8)`,
          [dev1Id, dev2Id, dev3Id, dev4Id, dev5Id, dev6Id, dev7Id, new Date().toISOString()]
        )
        
        await db.query(`INSERT INTO net_interfaces (id, device_id, name, status, speed, in_traffic, out_traffic, mac_address, mtu, admin_status, oper_status, type) VALUES
          ($1, $2, 'Gi1/0/1', 'up', '1Gbps', '45 Mbps', '12 Mbps', '00:1A:2B:3C:4D:5E', '1500', 'up', 'up', 'physical'),
          ($3, $2, 'Gi1/0/2', 'down', '1Gbps', '0 Mbps', '0 Mbps', '00:1A:2B:3C:4D:5F', '1500', 'down', 'down', 'physical'),
          ($4, $2, 'Te1/1/1', 'up', '10Gbps', '2.4 Gbps', '1.1 Gbps', '00:1A:2B:3C:4D:60', '9000', 'up', 'up', 'physical'),
          ($5, $6, 'eth0', 'up', '10Gbps', '300 Mbps', '800 Mbps', '00:50:56:AB:CD:EF', '1500', 'up', 'up', 'virtual')`,
          [nanoid(), dev1Id, nanoid(), nanoid(), nanoid(), dev6Id]
        )

        await db.query(`INSERT INTO net_sensors (id, device_id, sensor_type, name, current_value, unit, limit_high, limit_low) VALUES
          ($1, $2, 'temperature', 'System Board Temp', 35.5, 'C', 75.0, 0.0),
          ($3, $2, 'fan', 'Fan 1 Speed', 4500, 'RPM', 8000, 1000),
          ($4, $5, 'voltage', 'Disk 1 Voltage', 12.1, 'V', 13.0, 11.0),
          ($6, $5, 'temperature', 'Disk 1 Temp', 42.0, 'C', 60.0, 0.0),
          ($7, $8, 'temperature', 'Rack Inlet Temp', 22.5, 'C', 30.0, 10.0),
          ($9, $8, 'humidity', 'Rack Humidity', 45.0, '%', 80.0, 20.0),
          ($10, $8, 'power', 'Total Power Load', 1.2, 'kW', 3.0, 0.0)`,
          [nanoid(), dev1Id, nanoid(), nanoid(), dev4Id, nanoid(), nanoid(), dev7Id, nanoid(), nanoid()]
        )

        const rule1Id = nanoid()
        const rule2Id = nanoid()
        await db.query(`INSERT INTO net_alert_rules (id, name, metric, condition, threshold, severity) VALUES
          ($1, 'High CPU Load', 'cpu', '>', '90', 'critical'),
          ($2, 'High Temperature', 'temperature', '>', '70', 'warning')`,
          [rule1Id, rule2Id]
        )

        await db.query(`INSERT INTO net_alerts (id, device_id, rule_id, message, severity, status, timestamp) VALUES
          ($1, $2, $3, 'CPU load exceeds 90%', 'critical', 'active', $5),
          ($4, $2, $3, 'CPU load normal', 'critical', 'recovered', $6)`,
          [nanoid(), dev1Id, rule1Id, nanoid(), new Date().toISOString(), new Date(Date.now() - 3600000).toISOString()]
        )

        await db.query(`INSERT INTO net_syslog (id, device_id, facility, severity, program, message, timestamp) VALUES
          ($1, $2, 'authpriv', 'info', 'sshd', 'Accepted publickey for root from 10.0.0.2', $5),
          ($3, $4, 'syslog', 'err', 'kernel', 'Link down on eth0', $6)`,
          [nanoid(), dev6Id, nanoid(), dev3Id, new Date().toISOString(), new Date(Date.now() - 86400000).toISOString()]
        )

        const group1Id = nanoid()
        const group2Id = nanoid()
        await db.query(`INSERT INTO net_groups (id, name, description) VALUES
          ($1, 'Core Infrastructure', 'Routers and Core Switches'),
          ($2, 'Datacenter', 'All datacenter equipment')`,
          [group1Id, group2Id]
        )

        await db.query(`INSERT INTO net_device_groups (device_id, group_id) VALUES
          ($1, $2), ($1, $3), ($4, $2)`,
          [dev1Id, group1Id, group2Id, dev2Id]
        )

        await db.query(`INSERT INTO net_backups (id, device_id, config_text, timestamp) VALUES
          ($1, $2, 'hostname Core-Switch-01\\ninterface Gi1/0/1\\n speed 1000', $4),
          ($3, $2, 'hostname Core-Switch-01\\ninterface Gi1/0/1\\n speed 1000\\ninterface Gi1/0/2\\n shutdown', $5)`,
          [nanoid(), dev1Id, nanoid(), new Date(Date.now() - 86400000).toISOString(), new Date().toISOString()]
        )

        await db.query(`INSERT INTO net_flows (id, device_id, protocol, src_ip, dst_ip, src_port, dst_port, bytes, packets, timestamp) VALUES
          ($1, $2, 'TCP', '10.0.0.30', '1.1.1.1', 443, 443, 1500000, 1200, $5),
          ($3, $2, 'UDP', '10.0.0.50', '8.8.8.8', 53, 53, 5000, 45, $6),
          ($4, $2, 'TCP', '10.0.0.30', '10.0.0.50', 22, 22, 45000, 100, $5)`,
          [nanoid(), dev1Id, nanoid(), nanoid(), new Date().toISOString(), new Date(Date.now() - 60000).toISOString()]
        )
      }
      
      // Check if server hosts exist
      const srvRes = await db.query('SELECT count(*) as cnt FROM server_hosts')
      if (Number(srvRes.rows[0].cnt) === 0) {
        console.log('[seed] Seeding MVP Server data...')
        
        const h1 = nanoid()
        const h2 = nanoid()
        const h3 = nanoid()
        const h4 = nanoid()
        
        await db.query(`INSERT INTO server_hosts (id, name, ip, os, status, cpu, memory, uptime, agent) VALUES
          ($1, 'web-front-01', '10.0.1.10', 'Ubuntu 22.04', 'Available', '45%', '62%', '124 days', 'Zabbix agent 6.4'),
          ($2, 'web-front-02', '10.0.1.11', 'Ubuntu 22.04', 'Available', '50%', '65%', '124 days', 'Zabbix agent 6.4'),
          ($3, 'db-prod-01', '10.0.2.10', 'RHEL 9', 'Available', '15%', '90%', '124 days', 'Zabbix agent 6.4'),
          ($4, 'win-util-01', '10.0.3.5', 'Windows Server 2022', 'Offline', '-', '-', '0 days', 'Zabbix agent 6.4')`,
          [h1, h2, h3, h4]
        )
        
        await db.query(`INSERT INTO server_problems (id, host_id, trigger, severity, fired_at, duration, ack) VALUES
          ($1, $2, 'Free disk space is less than 10% on volume /var/lib/postgresql', 'High', $5, '15m', false),
          ($3, $4, 'CPU load is too high (over 90% for 5m)', 'Average', $5, '1h', true)`,
          [nanoid(), h3, nanoid(), h2, new Date().toISOString()]
        )
      }
      
      // Check if IPAM subnets exist
      const ipamRes = await db.query('SELECT count(*) as cnt FROM ipmgt_subnets')
      if (Number(ipamRes.rows[0].cnt) === 0) {
        console.log('[seed] Seeding MVP IPAM data...')
        
        const s1 = nanoid()
        const s2 = nanoid()
        
        await db.query(`INSERT INTO ipmgt_subnets (id, name, network, vlan, gateway, usage) VALUES
          ($1, 'Server Vlan', '10.0.1.0/24', 10, '10.0.1.254', 70),
          ($2, 'DB Vlan', '10.0.2.0/24', 20, '10.0.2.254', 17)`,
          [s1, s2]
        )
        
        await db.query(`INSERT INTO ipmgt_ips (id, subnet_id, ip, hostname, mac, description, state) VALUES
          ($1, $2, '10.0.1.1', 'N/A', '-', 'Reserved', 'Reserved'),
          ($3, $2, '10.0.1.10', 'web-front-01', '00:1A:2B:3C:4D:5E', 'Production Web Server', 'Used'),
          ($4, $2, '10.0.1.11', 'web-front-02', '00:1A:2B:3C:4D:5F', 'Production Web Server', 'Used')`,
          [nanoid(), s1, nanoid(), nanoid()]
        )
      }
      
    } catch (err) {
      console.error('[seed] Failed to seed MVP data:', err)
    }
  }, 3000) // Wait 3 seconds to let db initialize
})
