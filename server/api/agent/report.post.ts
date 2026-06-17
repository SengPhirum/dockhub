import { recordAgentReport } from '~~/server/utils/agentReports'

/**
 * Ingest endpoint for the dockhub-agent task running on every swarm node
 * (deployed via `deploy: mode: global`). Each agent only ever talks to its
 * own local Docker socket and pushes a stats snapshot here, so DockHub never
 * needs the Docker API exposed over TCP on worker nodes.
 */
export default defineEventHandler(async (event) => {
  const token = useRuntimeConfig().agent.token
  if (token && getRequestHeader(event, 'x-agent-token') !== token) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid agent token' })
  }

  const body = await readBody<Record<string, any>>(event)
  if (!body?.nodeId) {
    throw createError({ statusCode: 400, statusMessage: 'nodeId is required' })
  }

  recordAgentReport({
    nodeId: body.nodeId,
    hostname: body.hostname,
    receivedAt: Date.now(),
    cpu: body.cpu,
    memory: body.memory,
    disk: body.disk,
    containers: body.containers
  })

  return { ok: true }
})
