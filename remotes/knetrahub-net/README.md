# KNetraHub-Net

Network monitoring subsystem UI for [KNetraHub](../../README.md), loaded into the
portal at `/net` via Module Federation. Standalone example/reference
implementation - see the portal's README for the full architecture.

## What this is

A minimal Nuxt 4 app (CSR-only, `ssr: false`) that exposes one component,
`./NetApp`, via `@module-federation/vite`. It has no login of its own - the
KNetraHub portal already authenticated the user before this remote ever
loads, and this remote calls its own API (`KNetraHub-Net-API`) directly,
never the portal's database.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3101, remoteEntry.js at /remoteEntry.js
```

Visiting `http://localhost:3101` directly shows a standalone preview of the
same `NetApp` component (useful for developing this remote in isolation).
To see it loaded *inside* the portal, also run the portal (`npm run dev` in
the repo root) and visit `http://localhost:3000/net`.

## Configuration

```bash
cp .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `NUXT_PUBLIC_KNETRAHUB_NET_API_BASE` | KNetraHub-Net-API base URL (default `http://localhost:4101/api`). |

## Build

```bash
npm run build
node .output/server/index.mjs   # listens on :3000 by default, set PORT=3101
```

Or `docker build -t knetrahub-net .` (see `Dockerfile`, listens on `3101`).

## Adding a real page

`app/components/NetApp.vue` currently shows 4 mock cards (Devices Online/
Down, Average Latency, Bandwidth Warning) via `app/composables/useNetApi.ts`,
which falls back to mock numbers if `KNetraHub-Net-API` isn't reachable.
Replace the mock fallback once the real API exists; the exposed module
itself can grow into a router-driven mini-app (device inventory, SNMP
metrics, etc.) without changing how the portal loads it - the portal only
ever mounts the one exposed component.
