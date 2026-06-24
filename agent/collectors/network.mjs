// KNetraHub-Net collector stub. Would run ping/SNMP checks against
// configured devices and POST /api/agent/network-metrics on
// KNetraHub-Net-API (see services/knetrahub-net-api for the pattern -
// the real net.devices/net.ping_checks/net.snmp_metrics tables already
// exist there, waiting for a real collector to populate them).
export function run() {
  console.log('[knetrahub-agent:network] mode requested but not implemented yet - see agent/collectors/network.mjs')
}
