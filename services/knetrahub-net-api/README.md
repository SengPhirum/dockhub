# KNetraHub-Net-API

Server-side API for the KNetraHub-Net subsystem. Standalone Nitro service -
independent of the [KNetraHub portal](../../README.md) and the
[KNetraHub-Net remote UI](../../remotes/knetrahub-net/README.md). Reference/
example implementation; the real future home is its own repository.

## What this is

- Own `net` Postgres schema (`net.devices`, `net.interfaces`,
  `net.ping_checks`, `net.snmp_metrics`, `net.bandwidth_metrics`), created by
  its own migration on first request - the portal never reads or writes these
  tables.
- Verifies every request's `Authorization: Bearer` token itself
  (`server/utils/auth.ts`) against the **same `jwtSecret` the portal signs
  with** - no shared database, no callback to the portal per request.
- Enforces its own permission check (`net.view`) - a frontend that skips its
  own permission check still gets a 403 here.

## Run locally

```bash
cp .env.example .env   # set NUXT_NET_JWT_SECRET to match the portal's NUXT_JWT_SECRET
pnpm install
pnpm run dev            # http://localhost:4101
```

```bash
curl http://localhost:4101/health
# {"status":"ok","service":"knetrahub-net-api"}

curl http://localhost:4101/api/net/summary
# 401 - no token

curl http://localhost:4101/api/net/summary -H "Authorization: Bearer <token>"
# {"devicesOnline":3,"devicesDown":1,"avgLatencyMs":7,"bandwidthWarnings":0}
```

Get a real `<token>` by logging into the portal in a browser and visiting
`http://localhost:3000/api/auth/subsystem-token` (it's a same-origin,
cookie-authenticated endpoint, so it only works from a browser tab where
you're already logged in - that's the point).

## Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | none | Liveness + DB connectivity check |
| GET | `/api/net/summary` | Bearer, `net.view` | Dashboard summary counts |

Future endpoints (`/api/net/devices`, `/api/net/devices/:id`,
`/api/net/scan`, `/api/net/alerts`, ...) follow the same
`requirePermission(event, 'net.*')` pattern - see the portal's README for the
full planned contract.

## Build

```bash
pnpm run build
node .output/server/index.mjs
```

Or `docker build -t knetrahub-net-api .` (listens on `4101`).
