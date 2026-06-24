// KNetraHub-Server collector stub. Would report CPU/memory/disk/service
// status/heartbeat for a generic (non-swarm-managed) server to
// POST /api/server/agent/heartbeat + /api/agent/server-metrics on
// KNetraHub-Server-API (see services/knetrahub-net-api for the pattern to
// follow - own auth, own schema, own endpoint).
export function run() {
  console.log('[knetrahub-agent:server] mode requested but not implemented yet - see agent/collectors/server.mjs')
}
