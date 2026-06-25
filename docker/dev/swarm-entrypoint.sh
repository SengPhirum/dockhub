#!/bin/sh
set -eu

ROLE="${1:-manager}"
DOCKERD_PID=""
APP_PID=""
PRUNE_PID=""
AGENT_PID=""

log() {
  printf '[knetrahub-swarm-dev] %s\n' "$*"
}

cleanup() {
  set +e
  if [ -n "${AGENT_PID}" ] && kill -0 "${AGENT_PID}" 2>/dev/null; then
    kill "${AGENT_PID}" 2>/dev/null
    wait "${AGENT_PID}" 2>/dev/null
  fi
  if [ -n "${APP_PID}" ] && kill -0 "${APP_PID}" 2>/dev/null; then
    kill "${APP_PID}" 2>/dev/null
    wait "${APP_PID}" 2>/dev/null
  fi
  if [ -n "${PRUNE_PID}" ] && kill -0 "${PRUNE_PID}" 2>/dev/null; then
    kill "${PRUNE_PID}" 2>/dev/null
    wait "${PRUNE_PID}" 2>/dev/null
  fi
  if [ -n "${DOCKERD_PID}" ] && kill -0 "${DOCKERD_PID}" 2>/dev/null; then
    kill "${DOCKERD_PID}" 2>/dev/null
    wait "${DOCKERD_PID}" 2>/dev/null
  fi
}

trap cleanup INT TERM EXIT

node_ip() {
  hostname -i 2>/dev/null | awk '{ print $1 }'
}

start_dockerd() {
  rm -f /var/run/docker.pid
  mkdir -p /var/lib/docker /var/run
  export DOCKER_HOST=unix:///var/run/docker.sock
  unset DOCKER_TLS_VERIFY DOCKER_CERT_PATH

  log "Starting Docker daemon"
  # shellcheck disable=SC2086
  dockerd --host=unix:///var/run/docker.sock ${DOCKERD_ARGS:-} &
  DOCKERD_PID="$!"
}

wait_for_docker() {
  for _ in $(seq 1 90); do
    if docker info >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  log "Docker daemon did not become ready"
  return 1
}

swarm_state() {
  docker info --format '{{ .Swarm.LocalNodeState }}' 2>/dev/null || true
}

swarm_node_addr() {
  docker info --format '{{ .Swarm.NodeAddr }}' 2>/dev/null || true
}

worker_remote_managers() {
  docker info --format '{{ range .Swarm.RemoteManagers }}{{ .Addr }} {{ end }}' 2>/dev/null || true
}

manager_dns_ip() {
  getent hosts "${SWARM_MANAGER_HOST:-swarm-manager}" 2>/dev/null | awk '{ print $1; exit }'
}

manager_control() {
  docker info --format '{{ .Swarm.ControlAvailable }}' 2>/dev/null || true
}

ensure_manager_swarm() {
  state="$(swarm_state)"
  advertise_addr="${SWARM_ADVERTISE_ADDR:-$(node_ip)}"

  if [ "${state}" != "active" ]; then
    log "Initializing Docker Swarm manager at ${advertise_addr}"
    docker swarm init --advertise-addr "${advertise_addr}" --listen-addr "0.0.0.0:2377"
  else
    current_addr="$(swarm_node_addr)"
    if [ -n "${current_addr}" ] && [ "${current_addr}" != "${advertise_addr}" ]; then
      log "Refreshing manager advertise address from ${current_addr} to ${advertise_addr}"
      docker swarm init --force-new-cluster --advertise-addr "${advertise_addr}" --listen-addr "0.0.0.0:2377"
    else
      log "Docker Swarm is already active on this manager"
    fi
  fi

  if [ "$(manager_control)" != "true" ]; then
    log "This node is active but is not a swarm manager"
    return 1
  fi

  docker swarm join-token -q worker > /swarm/worker-token
  touch /swarm/manager-ready
  log "Worker join token is ready"
}

prune_down_workers() {
  interval="${SWARM_PRUNE_DOWN_WORKERS_INTERVAL:-20}"
  while :; do
    for node_id in $(docker node ls --format '{{ .ID }} {{ .Status }} {{ .ManagerStatus }}' 2>/dev/null | awk '$2 == "Down" && $3 == "" { print $1 }'); do
      log "Removing stale down worker node ${node_id}"
      docker node rm --force "${node_id}" >/dev/null 2>&1 || true
    done
    sleep "${interval}"
  done
}

install_node_modules() {
  cd /workspace

  if [ ! -f package.json ]; then
    log "No package.json found in /workspace"
    return 1
  fi

  cache_file="/workspace/node_modules/.knetrahub-lock-sha"
  install_flags="${NPM_INSTALL_FLAGS:-}"

  if [ -f pnpm-lock.yaml ]; then
    lock_hash="$( { sha256sum package.json pnpm-lock.yaml; printf '%s\n' "${install_flags}"; } | sha256sum | awk '{ print $1 }')"
    if [ ! -f "${cache_file}" ] || [ "$(cat "${cache_file}")" != "${lock_hash}" ]; then
      log "Installing pnpm dependencies into the container node_modules volume"
      corepack enable pnpm
      pnpm install --frozen-lockfile ${install_flags}
      printf '%s\n' "${lock_hash}" > "${cache_file}"
    else
      log "pnpm dependencies are already up to date"
    fi
  else
    lock_hash="$( { sha256sum package.json; printf '%s\n' "${install_flags}"; } | sha256sum | awk '{ print $1 }')"
    if [ ! -f "${cache_file}" ] || [ "$(cat "${cache_file}")" != "${lock_hash}" ]; then
      log "Installing pnpm dependencies into the container node_modules volume"
      corepack enable pnpm
      pnpm install ${install_flags}
      printf '%s\n' "${lock_hash}" > "${cache_file}"
    else
      log "pnpm dependencies are already up to date"
    fi
  fi
}

run_agent() {
  # The nested dockerd here can't reliably pull images (its CA trust store
  # doesn't carry whatever corporate root the host's real Docker is
  # configured with), so dev runs the agent script directly instead of
  # building/running the knetrahub-agent image like prod does.
  if ! command -v node >/dev/null 2>&1; then
    log "Installing Node.js for the knetrahub-agent"
    apk add --no-cache nodejs >/dev/null 2>&1 || { log "Could not install Node.js; skipping knetrahub-agent on this node"; return 0; }
  fi

  log "Starting knetrahub-agent (reports this node's usage to ${KNETRAHUB_AGENT_URL:-http://swarm-manager:3000/api/agent/report})"
  KNETRAHUB_AGENT_URL="${KNETRAHUB_AGENT_URL:-http://swarm-manager:3000/api/agent/report}" \
    node /agent/index.mjs &
  AGENT_PID="$!"
}

run_app() {
  cd /workspace
  install_node_modules

  export NODE_ENV="${NODE_ENV:-development}"
  export HOST="${HOST:-0.0.0.0}"
  export PORT="${PORT:-3000}"
  export NUXT_HOST="${NUXT_HOST:-0.0.0.0}"
  export NUXT_PORT="${NUXT_PORT:-3000}"
  export NUXT_DOCKER_SOCKET_PATH="/var/run/docker.sock"
  export NUXT_DOCKER_HOST=""
  export NUXT_DOCKER_PORT=""
  export CHOKIDAR_USEPOLLING="${CHOKIDAR_USEPOLLING:-true}"
  export VITE_USE_POLLING="${VITE_USE_POLLING:-true}"
  export WATCHPACK_POLLING="${WATCHPACK_POLLING:-true}"

  log "Starting KNetraHub with pnpm run dev on ${NUXT_HOST}:${NUXT_PORT}"
  pnpm run dev --host "${NUXT_HOST}" --port "${NUXT_PORT}" &
  APP_PID="$!"
  wait "${APP_PID}"
}

run_manager() {
  mkdir -p /swarm
  rm -f /swarm/worker-token /swarm/manager-ready

  start_dockerd
  wait_for_docker
  ensure_manager_swarm
  if [ "${PRUNE_DOWN_WORKERS:-true}" = "true" ]; then
    prune_down_workers &
    PRUNE_PID="$!"
  fi

  run_agent

  if [ "${KNETRAHUB_RUN_APP:-true}" = "true" ]; then
    run_app
  else
    wait "${DOCKERD_PID}"
  fi
}

wait_for_worker_token() {
  for _ in $(seq 1 90); do
    if [ -f /swarm/manager-ready ] && [ -s /swarm/worker-token ]; then
      return 0
    fi
    sleep 1
  done

  log "Worker token did not become ready"
  return 1
}

wait_for_manager_ports() {
  manager_host="${SWARM_MANAGER_HOST:-swarm-manager}"
  for _ in $(seq 1 90); do
    if nc -z "${manager_host}" 2377 >/dev/null 2>&1 && nc -z "${manager_host}" 7946 >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  log "Manager swarm ports did not become reachable"
  return 1
}

join_worker() {
  state="$(swarm_state)"

  if [ "${state}" = "active" ]; then
    manager_ip="$(manager_dns_ip)"
    remote_managers="$(worker_remote_managers)"
    if [ -n "${manager_ip}" ] && printf '%s\n' "${remote_managers}" | grep -q "${manager_ip}:2377"; then
      log "Docker Swarm is already active on this worker"
      return 0
    fi

    log "Leaving stale worker swarm membership before joining current manager"
    docker swarm leave --force >/dev/null 2>&1 || true
    sleep 2
  fi

  wait_for_worker_token
  wait_for_manager_ports
  token="$(cat /swarm/worker-token)"
  advertise_addr="${SWARM_ADVERTISE_ADDR:-$(node_ip)}"
  manager_addr="${SWARM_MANAGER_HOST:-swarm-manager}:2377"

  for _ in $(seq 1 90); do
    state="$(swarm_state)"
    if [ "${state}" = "active" ]; then
      manager_ip="$(manager_dns_ip)"
      remote_managers="$(worker_remote_managers)"
      if [ -n "${manager_ip}" ] && printf '%s\n' "${remote_managers}" | grep -q "${manager_ip}:2377"; then
        log "Docker Swarm became active on this worker"
        return 0
      fi

      log "Leaving stale active worker membership before retrying ${manager_addr}"
      docker swarm leave --force >/dev/null 2>&1 || true
      sleep 2
    fi

    if [ "${state}" != "inactive" ] && [ -n "${state}" ]; then
      log "Leaving stale worker swarm state (${state}) before joining ${manager_addr}"
      docker swarm leave --force >/dev/null 2>&1 || true
      sleep 2
    fi

    log "Joining worker to ${manager_addr}"
    if join_output="$(docker swarm join --token "${token}" --advertise-addr "${advertise_addr}" --listen-addr "0.0.0.0:2377" "${manager_addr}" 2>&1)"; then
      return 0
    fi

    printf '%s\n' "${join_output}"

    if printf '%s\n' "${join_output}" | grep -qi 'already part of a swarm'; then
      state="$(swarm_state)"
      if [ "${state}" = "active" ]; then
        log "Docker Swarm is already active on this worker"
        return 0
      fi
      log "Clearing existing worker swarm membership before retrying"
      docker swarm leave --force >/dev/null 2>&1 || true
    fi

    sleep 2
  done

  log "Worker could not join the swarm"
  return 1
}

run_worker() {
  if [ "${RESET_WORKER_DOCKER:-true}" = "true" ]; then
    log "Resetting disposable worker Docker state"
    rm -rf /var/lib/docker/*
  fi

  start_dockerd
  wait_for_docker
  join_worker
  run_agent
  wait "${DOCKERD_PID}"
}

case "${ROLE}" in
  manager)
    run_manager
    ;;
  worker)
    run_worker
    ;;
  *)
    exec "$@"
    ;;
esac
