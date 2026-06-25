import pg from 'pg';
import { nanoid } from 'nanoid';

const { Pool } = pg;

const db = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'knetrahub',
  user: 'knetrahub',
  password: 'knetrahub',
});

async function run() {
  try {
    const netRes = await db.query('SELECT count(*) as cnt FROM net_devices');
    if (Number(netRes.rows[0].cnt) === 0) {
      console.log('Seeding net devices...');
      const dev1Id = nanoid();
      const dev2Id = nanoid();
      const dev3Id = nanoid();
      
      const dev4Id = nanoid();
      const dev5Id = nanoid();
      
      await db.query(`INSERT INTO net_devices (id, hostname, ip, type, vendor, os, status, uptime, snmp_version, snmp_community, poll_method, category, sys_name, sys_descr, sys_object_id, created_at) VALUES 
        ($1, 'Core-Switch-01', '10.0.0.1', 'Switch', 'Cisco', 'IOS-XE 16.9.4', 'up', '14 days', 'v2c', 'public', 'snmp', 'network', 'core-sw-01.local', 'Cisco IOS Software', '1.3.6.1.4.1.9.1', $6),
        ($2, 'Router-B', '10.0.0.2', 'Router', 'Juniper', 'Junos 21.2', 'up', '14 days', 'v2c', 'public', 'snmp', 'network', 'router-b.local', 'Juniper Networks', '1.3.6.1.4.1.2636.1', $6),
        ($3, 'Firewall-FW1', '10.0.0.254', 'Firewall', 'Palo Alto', 'PAN-OS 10.1', 'down', '0 days', 'v3', 'private', 'snmp', 'network', 'fw1.local', 'Palo Alto Networks', '1.3.6.1.4.1.25461', $6),
        ($4, 'Synology-NAS-01', '10.0.0.50', 'NAS', 'Synology', 'DSM 7.2', 'up', '42 days', 'v2c', 'public', 'snmp', 'storage', 'nas-01.local', 'Synology DiskStation', '1.3.6.1.4.1.6574.1', $6),
        ($5, 'HP-Printer-Floor1', '10.0.0.200', 'Printer', 'HP', 'Unknown', 'up', '5 days', NULL, NULL, 'ping', 'ping-only', NULL, NULL, NULL, $6)`,
        [dev1Id, dev2Id, dev3Id, dev4Id, dev5Id, new Date().toISOString()]
      );
      
      await db.query(`INSERT INTO net_interfaces (id, device_id, name, status, speed, in_traffic, out_traffic, mac_address, mtu, admin_status, oper_status, type) VALUES
        ($1, $2, 'Gi1/0/1', 'up', '1Gbps', '45 Mbps', '12 Mbps', '00:1A:2B:3C:4D:5E', '1500', 'up', 'up', 'physical'),
        ($3, $2, 'Gi1/0/2', 'down', '1Gbps', '0 Mbps', '0 Mbps', '00:1A:2B:3C:4D:5F', '1500', 'down', 'down', 'physical'),
        ($4, $2, 'Te1/1/1', 'up', '10Gbps', '2.4 Gbps', '1.1 Gbps', '00:1A:2B:3C:4D:60', '9000', 'up', 'up', 'physical')`,
        [nanoid(), dev1Id, nanoid(), nanoid()]
      );

      await db.query(`INSERT INTO net_sensors (id, device_id, sensor_type, name, current_value, unit, limit_high, limit_low) VALUES
        ($1, $2, 'temperature', 'System Board Temp', 35.5, 'C', 75.0, 0.0),
        ($3, $2, 'fan', 'Fan 1 Speed', 4500, 'RPM', 8000, 1000),
        ($4, $5, 'voltage', 'Disk 1 Voltage', 12.1, 'V', 13.0, 11.0),
        ($6, $5, 'temperature', 'Disk 1 Temp', 42.0, 'C', 60.0, 0.0)`,
        [nanoid(), dev1Id, nanoid(), nanoid(), dev4Id, nanoid()]
      );
    }
    
    const srvRes = await db.query('SELECT count(*) as cnt FROM server_hosts');
    if (Number(srvRes.rows[0].cnt) === 0) {
      console.log('Seeding server hosts...');
      const h1 = nanoid();
      const h2 = nanoid();
      const h3 = nanoid();
      const h4 = nanoid();
      
      await db.query(`INSERT INTO server_hosts (id, name, ip, os, status, cpu, memory, uptime, agent) VALUES
        ($1, 'web-front-01', '10.0.1.10', 'Ubuntu 22.04', 'Available', '45%', '62%', '124 days', 'Zabbix agent 6.4'),
        ($2, 'web-front-02', '10.0.1.11', 'Ubuntu 22.04', 'Available', '50%', '65%', '124 days', 'Zabbix agent 6.4'),
        ($3, 'db-prod-01', '10.0.2.10', 'RHEL 9', 'Available', '15%', '90%', '124 days', 'Zabbix agent 6.4'),
        ($4, 'win-util-01', '10.0.3.5', 'Windows Server 2022', 'Offline', '-', '-', '0 days', 'Zabbix agent 6.4')`,
        [h1, h2, h3, h4]
      );
      
      await db.query(`INSERT INTO server_problems (id, host_id, trigger, severity, fired_at, duration, ack) VALUES
        ($1, $2, 'Free disk space is less than 10% on volume /var/lib/postgresql', 'High', $5, '15m', false),
        ($3, $4, 'CPU load is too high (over 90% for 5m)', 'Average', $5, '1h', true)`,
        [nanoid(), h3, nanoid(), h2, new Date().toISOString()]
      );
    }

    const ipamRes = await db.query('SELECT count(*) as cnt FROM ipmgt_subnets');
    if (Number(ipamRes.rows[0].cnt) === 0) {
      console.log('Seeding IPAM subnets...');
      const s1 = nanoid();
      const s2 = nanoid();
      
      await db.query(`INSERT INTO ipmgt_subnets (id, name, network, vlan, gateway, usage) VALUES
        ($1, 'Server Vlan', '10.0.1.0/24', 10, '10.0.1.254', 70),
        ($2, 'DB Vlan', '10.0.2.0/24', 20, '10.0.2.254', 17)`,
        [s1, s2]
      );
      
      await db.query(`INSERT INTO ipmgt_ips (id, subnet_id, ip, hostname, mac, description, state) VALUES
        ($1, $2, '10.0.1.1', 'N/A', '-', 'Reserved', 'Reserved'),
        ($3, $2, '10.0.1.10', 'web-front-01', '00:1A:2B:3C:4D:5E', 'Production Web Server', 'Used'),
        ($4, $2, '10.0.1.11', 'web-front-02', '00:1A:2B:3C:4D:5F', 'Production Web Server', 'Used')`,
        [nanoid(), s1, nanoid(), nanoid()]
      );
    }
    console.log('Done!');
  } catch (err) {
    console.error(err);
  } finally {
    await db.end();
  }
}
run();
