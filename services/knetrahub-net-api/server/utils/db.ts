import { Pool } from 'pg'

/**
 * Independent database connection - its own env vars, not the portal's.
 * Option A from the architecture docs: same shared Postgres/TimescaleDB
 * instance as the portal is fine, but every table lives under the `net`
 * schema, never in `public` where the portal's own tables live. The portal
 * never reads or writes this schema directly.
 */
let pool: Pool | null = null

export function getDb(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.NUXT_NET_DB_HOST || 'localhost',
      port: Number(process.env.NUXT_NET_DB_PORT || 5432),
      database: process.env.NUXT_NET_DB_NAME || 'dockhub',
      user: process.env.NUXT_NET_DB_USER || 'dockhub',
      password: process.env.NUXT_NET_DB_PASSWORD || 'dockhub',
      ssl: process.env.NUXT_NET_DB_SSL === 'true',
      max: Number(process.env.NUXT_NET_DB_POOL_MAX || 5)
    })
  }
  return pool
}

let migrated = false

export async function migrate(): Promise<void> {
  if (migrated) return
  const db = getDb()
  await db.query(`
    CREATE SCHEMA IF NOT EXISTS net;

    CREATE TABLE IF NOT EXISTS net.devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'unknown',
      status TEXT NOT NULL DEFAULT 'unknown',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS net.interfaces (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES net.devices(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      speed_mbps INTEGER,
      status TEXT NOT NULL DEFAULT 'unknown'
    );

    CREATE TABLE IF NOT EXISTS net.ping_checks (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES net.devices(id) ON DELETE CASCADE,
      latency_ms NUMERIC,
      success BOOLEAN NOT NULL,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS net.snmp_metrics (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES net.devices(id) ON DELETE CASCADE,
      oid TEXT NOT NULL,
      value TEXT,
      sampled_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS net.bandwidth_metrics (
      id TEXT PRIMARY KEY,
      interface_id TEXT NOT NULL REFERENCES net.interfaces(id) ON DELETE CASCADE,
      rx_bytes BIGINT NOT NULL DEFAULT 0,
      tx_bytes BIGINT NOT NULL DEFAULT 0,
      sampled_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_net_ping_checks_device_time ON net.ping_checks (device_id, checked_at DESC);
    CREATE INDEX IF NOT EXISTS idx_net_bandwidth_interface_time ON net.bandwidth_metrics (interface_id, sampled_at DESC);
  `)

  // Demo seed data, only if the table is empty - lets a fresh checkout's
  // /api/net/summary return something meaningful instead of all zeros.
  // Safe to delete; real device discovery/collectors replace this.
  const { rows } = await db.query('SELECT count(*)::int AS count FROM net.devices')
  if (rows[0]?.count === 0) {
    await db.query(`
      INSERT INTO net.devices (id, name, ip_address, kind, status) VALUES
        ('seed-sw-1', 'core-switch-01', '10.0.0.1', 'switch', 'online'),
        ('seed-sw-2', 'core-switch-02', '10.0.0.2', 'switch', 'online'),
        ('seed-ap-1', 'office-ap-01', '10.0.1.10', 'access-point', 'online'),
        ('seed-rtr-1', 'edge-router-01', '10.0.0.254', 'router', 'down');

      INSERT INTO net.ping_checks (id, device_id, latency_ms, success) VALUES
        ('seed-ping-1', 'seed-sw-1', 4, true),
        ('seed-ping-2', 'seed-sw-2', 6, true),
        ('seed-ping-3', 'seed-ap-1', 12, true);
    `)
  }

  migrated = true
}
