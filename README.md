# DockHub

**Run your Docker Swarm from one hub.** A modern, responsive web console for managing Docker Swarm clusters - built in the spirit of Swarmpit, with the operational depth of Portainer and the GitOps convenience of Dokploy.

DockHub gives you live control of nodes, services, stacks, tasks, networks, volumes, secrets, and configs from a single operations hub - with **LDAP/OIDC authentication**, **role-based access control**, **GitLab-backed versioning** of every stack's compose file so you can see history and roll back with one click, and **alerting** (Telegram/Teams/Webhook) when something needs attention. All stored credentials (LDAP, OIDC, registries, GitLab, alert channels) are encrypted at rest.

Built on **Nuxt 4** + **Nuxt UI 4** + **Tailwind v4**.

---

## Highlights

- **Live swarm control** - nodes (drain/pause/activate, promote/demote, labels, remove), services (scale, redeploy, rolling image updates, logs, delete), tasks, and raw containers.
- **Stacks, versioned in Git** - deploy stacks from compose YAML; every deploy is committed to GitLab first, giving you a full change history and one-click **rollback** to any previous commit. GitLab is configurable entirely from Settings -> Integrations (no env vars required), with a status dot that's only green when DockHub actually reaches GitLab.
- **Alerting** - notify Telegram, Microsoft Teams, or any generic webhook when a deploy fails, a service nears its CPU/memory limit, a node stops reporting, replicas stay degraded, or disk usage crosses a threshold. Each rule has a default message template you can customize with `{{placeholder}}` fields.
- **Data resources** - create and manage overlay networks, volumes, secrets (write-only), and configs.
- **Auth & RBAC** - local accounts, LDAP, and OIDC SSO, with three roles: `viewer` (read-only), `operator` (deploy/scale/manage), and `admin` (users, registries, audit, integrations, alerts).
- **Encrypted credentials** - LDAP bind password, OIDC client secret, registry auth, GitLab token, and alert channel configs are all encrypted at rest (AES-256-GCM, derived from `NUXT_JWT_SECRET` - no extra key to manage).
- **Audit log** - every state-changing action is recorded with actor, target, and detail.
- **Private registries** - store pull credentials for private image registries.
- **Responsive by design** - works from a phone on the server-room floor to an ultrawide on your desk.

---

## Quick start (development)

```bash
npm install
cp .env.example .env          # edit as needed
npm run dev                   # http://localhost:3000
```

DockHub talks to Docker through the socket at `/var/run/docker.sock` by default, so run it **on a swarm manager node** (or point it at a remote engine over TCP - see below). On first run it seeds an admin account:

```text
username: admin
password: admin
```

Override the seed with `NUXT_ADMIN_USERNAME` / `NUXT_ADMIN_PASSWORD`, and **change it immediately** in production. Always set a strong `NUXT_JWT_SECRET`.

### Local swarm development

To run DockHub against a local disposable swarm instead of your host Docker engine:

```bash
npm run dev:swarm
```

This uses [`docker-compose.dev.yml`](./docker-compose.dev.yml) to start:

- `swarm-manager` - lightweight Docker-in-Docker container with Node installed, initialized as the swarm manager.
- `swarm-worker-1` - lightweight Docker-in-Docker container joined as a worker.
- `swarm-worker-2` - optional second worker, enabled only for full cluster tests.

DockHub runs inside `swarm-manager` with `npm run dev` and is available at <http://localhost:3000>. Your local project is bind-mounted into `/workspace`, while Linux `node_modules` and `.nuxt` live in named Docker volumes, so file changes on your machine hot reload the app without mixing Windows and Linux dependencies. The compose file reads your local `.env`, then forces `NUXT_DOCKER_SOCKET_PATH=/var/run/docker.sock` so the app controls the manager container's Docker daemon. This dev-swarm path also sets `NUXT_SSR=false` for browser-first hot reload; normal local dev and production builds keep SSR enabled.

By default the local swarm starts only one worker to keep laptops light. Run the full profile when you need manager-plus-two-worker scheduling coverage:

```bash
npm run dev:swarm:full
```

Set `DOCKER_DIND_IMAGE` in `.env` to pin the Docker Engine image used by the disposable swarm, for example `docker:29-dind`.

Useful commands:

```bash
npm run dev:swarm -- ps
npm run dev:swarm -- logs -f swarm-manager
npm run dev:swarm:down
npm run dev:swarm:reset  # removes the disposable swarm volumes
```

This workflow requires Docker Desktop or a Docker Engine that supports privileged containers.

## Production build

```bash
npm run build
node .output/server/index.mjs
```

## Deploy onto the swarm itself

DockHub ships with a `Dockerfile` and a `docker-compose.yml` that runs it as a swarm service, pinned to a manager node. Build and publish the image to the local registry first:

```bash
./release.sh
```

By default this bumps the patch version, writes release notes to `release-notes/v<version>.md` and `RELEASE_NOTES.md`, then pushes:

```text
registry.kdsb.com.kh/dockhub/app:<version>
registry.kdsb.com.kh/dockhub/app:latest
registry.kdsb.com.kh/dockhub/agent:<version>
registry.kdsb.com.kh/dockhub/agent:latest
```

Useful release variants:

```bash
./release.sh --minor
./release.sh --major
./release.sh --version 1.2.0
./release.sh --no-bump          # test publish without changing package version
./release.sh --no-bump --no-push
./release.sh --tag-prefix v     # publish :v1.2.0 instead of :1.2.0
```

Then deploy the published image:

```bash
docker stack deploy -c docker-compose.yml dockhub
```

The compose file uses `registry.kdsb.com.kh/dockhub/app:latest` and `registry.kdsb.com.kh/dockhub/agent:latest`, mounts the Docker socket read-only, and keeps a named volume for DockHub's own database, with a `node.role == manager` placement constraint for the app service.

If your network injects an internal or self-signed root CA, pass that CA into the build so npm can trust it:

```bash
docker build --secret id=npm_ca,src=company-root-ca.crt -t dockhub:latest .
```

On networks that intercept TLS, the Docker build defaults to relaxed npm/Node certificate validation so the image can still be built. If you want to force strict validation during the build, use:

```bash
docker build --build-arg NPM_CONFIG_STRICT_SSL=true --build-arg NODE_TLS_REJECT_UNAUTHORIZED=1 -t registry.kdsb.com.kh/dockhub/app:latest .
```

Keeping strict validation disabled is convenient on trusted corporate networks, but the CA-secret approach above is the safer long-term option.

---

## Configuration

Everything is configured through environment variables (full list in [`.env.example`](./.env.example)). The most important ones:

| Variable | Purpose |
| --- | --- |
| `NUXT_JWT_SECRET` | Signs session cookies and derives the key used to encrypt stored credentials - **set a long random value in production**. |
| `NUXT_DOCKER_SOCKET_PATH` | Docker socket path (default `/var/run/docker.sock`). |
| `NUXT_DOCKER_HOST` / `NUXT_DOCKER_PORT` | Use a remote engine over TCP instead of the socket. Add `NUXT_DOCKER_CA` / `CERT` / `KEY` for TLS. |
| `NUXT_ADMIN_USERNAME` / `NUXT_ADMIN_PASSWORD` | First-run admin seed. |
| `NUXT_DB_HOST` / `PORT` / `NAME` / `USER` / `PASSWORD` / `SSL` / `POOL_MAX` | Postgres + TimescaleDB connection - stores app data (users, settings, audit) and metrics history. |
| `NUXT_METRICS_RETENTION_DAYS` | How many days of node/container/disk/network metrics history to keep (default `30`). |

Most integrations below (GitLab, LDAP, OIDC) follow the same pattern: an env var sets the **default**, and saving the equivalent form in **Settings** writes a **database override** that takes precedence until you reset it. Any credential field saved this way (passwords, tokens, client secrets) is encrypted at rest.

### Appearance

Settings -> Appearance lets an admin rebrand the running app without a rebuild: app name, primary brand color, the horizontal logo (login screen), the icon logo (sidebar/header), the **favicon** (browser tab icon), and the **PWA/app icon** (installed-app and home-screen icon, used for the manifest icons and the Apple touch icon). Each image is uploaded directly in the browser and stored inline (capped at 1.5 MB per image) - no object storage or extra volume needed. Changes preview live across the whole app as you edit, and aren't shared with other users until you click Save; "Reset to defaults" reverts to the built-in DockHub branding. The favicon and PWA icon take effect immediately for new visits - no rebuild or redeploy required, since `/manifest.webmanifest` is generated per-request from the current settings rather than baked in at build time.

### LDAP

Set `NUXT_LDAP_ENABLED=true` and provide your directory details (`NUXT_LDAP_URL`, `BIND_DN`, `BIND_CREDENTIALS`, `SEARCH_BASE`, and an optional `SEARCH_FILTER`, default `(uid={{username}})`). Login then tries LDAP first and falls back to local accounts. Map directory groups to roles with `NUXT_LDAP_ADMIN_GROUP` and `NUXT_LDAP_OPERATOR_GROUP`; everyone else becomes a `viewer`. LDAP users are upserted into the local store on first login so they appear in the Users page.

### OIDC single sign-on

Set `NUXT_OIDC_ENABLED=true` and point DockHub at your provider (`NUXT_OIDC_ISSUER`, `NUXT_OIDC_CLIENT_ID`, `NUXT_OIDC_CLIENT_SECRET`). DockHub runs the standard authorization-code flow with PKCE and discovers endpoints from `{issuer}/.well-known/openid-configuration`, so it works with Keycloak, Authentik, Entra ID, Okta, Google, and friends. Register `{your-dockhub-url}/api/auth/oidc/callback` as an allowed redirect URI (override with `NUXT_OIDC_REDIRECT_URI` if DockHub sits behind a proxy that rewrites the origin).

Group mapping works like LDAP: the claim named by `NUXT_OIDC_GROUPS_CLAIM` (default `groups`, dot-paths like `realm_access.roles` supported) is matched against `NUXT_OIDC_ADMIN_GROUP` and `NUXT_OIDC_OPERATOR_GROUP`; everyone else becomes a `viewer`. Roles are re-evaluated on every login. The username comes from `NUXT_OIDC_USERNAME_CLAIM` (default `preferred_username`), and OIDC users are upserted into the local store so they appear in the Users page. A "Continue with SSO" button appears on the login page (label via `NUXT_OIDC_PROVIDER_NAME`); local accounts keep working alongside.

### GitLab stack versioning

Configure GitLab either via environment variables (first-run defaults) or entirely from **Settings -> Integrations** (saved as an encrypted database override - no container restart needed):

```text
NUXT_GITLAB_URL=https://gitlab.com   # default
NUXT_GITLAB_TOKEN=glpat-...          # needs api scope
NUXT_GITLAB_PROJECT_ID=12345678
NUXT_GITLAB_BRANCH=main              # default
NUXT_GITLAB_STACKS_PATH=stacks       # default
```

Each stack is stored at `stacks/<name>.yml`. Deploying or editing a stack commits the new compose file (so the desired state is recorded even if the deploy fails), and the stack detail page shows the commit timeline with view + rollback - the commit author is the full name of the DockHub user who triggered the change, so history stays attributable. When GitLab isn't configured, stacks still deploy - they just aren't versioned.

The status dot next to GitLab in Settings is only green when DockHub actually reached GitLab with a working token - it distinguishes "not configured", "unreachable", and "invalid token" rather than just checking that fields are filled in. Removing a stack's running services (Remove) leaves its compose file in GitLab so history isn't lost; once a stack shows **Defined** (tracked in GitLab but not currently deployed), a second action - **Delete from GitLab** - is available from the stacks list or the stack page to permanently delete the compose file and history too. Both prompt for confirmation since they can't be undone.

### Alerts

Configure notification channels and alert rules from **Settings -> Alerts**. Three channel types are supported - Telegram (bot token + chat ID), Microsoft Teams (incoming webhook URL), and a generic Webhook (URL + custom headers) - and channel credentials are encrypted at rest like everything else. Add as many channels as you like; every enabled channel receives every alert that fires.

Five alert rules ship with sensible defaults, each independently enabled/disabled and configurable:

| Rule | Trigger |
| --- | --- |
| Deploy failed | A stack deploy, rollback, redeploy, image update, or scale operation fails. |
| Service usage threshold | A service's CPU and/or memory usage crosses a configurable percentage (default 90%) of its limit/reservation/node capacity. |
| Node down | A swarm node stops reporting heartbeats. |
| Replicas degraded | A service stays under its desired replica count for longer than a configurable grace period. |
| Disk usage threshold | A node's disk usage crosses a configurable percentage (default 85%). |

Each rule has a default message template using `{{placeholder}}` fields (for example `{{target}}`, `{{error}}`, `{{cpuPercent}}`) - customize the template per rule from its card in Settings, or reset it back to the default at any time. The four threshold/health rules are checked on a poller (default every 3 minutes); deploy failures alert immediately.

```text
NUXT_ALERTS_ENABLED=true            # default
NUXT_ALERTS_INTERVAL_MINUTES=3      # default; how often threshold/health rules are checked
```

---

## Roles

| Capability | viewer | operator | admin |
| --- | :---: | :---: | :---: |
| View everything | yes | yes | yes |
| Scale / redeploy / deploy stacks |  | yes | yes |
| Manage nodes, networks, volumes, secrets, configs |  | yes | yes |
| Manage users, registries, audit log, integrations (GitLab), alerts |  |  | yes |

---

## How "stacks" work

Docker Swarm has no native stack API - `docker stack` is a client-side convention built on the `com.docker.stack.namespace` label. DockHub follows the same convention: it parses your compose YAML, ensures declared overlay networks exist, and creates or updates each service (named `<stack>_<service>`) with that label, pruning services you remove. It supports the common compose subset - image, command, environment, `deploy` (replicas/mode/resources/restart_policy/placement/update_config/labels), ports (short and long form), networks, volumes/mounts, and healthcheck - and surfaces a warning rather than failing on directives it doesn't translate.

---

## What's implemented vs. roadmap

This is a real, runnable foundation that implements the core of every area above against the live Docker Engine API. In the interest of honesty:

**Implemented:** live read + control for nodes/services/stacks/tasks/networks/volumes/secrets/configs/containers; local + LDAP + OIDC auth with JWT/RBAC; GitLab commit history and rollback, fully UI-configurable; encrypted credential storage; alerting to Telegram/Teams/Webhook with customizable templates; per-node/container metrics history (Postgres + TimescaleDB) with charts on node and service pages; audit logging; private registry storage; service log viewing (tail); responsive UI throughout.

**Natural next steps (roadmap):** streaming/live-follow logs over WebSockets, container exec/terminal, compose validation with a richer translator, multi-cluster endpoints, webhook-driven GitOps redeploys, and 2FA. The architecture leaves clean seams for each.

---

## Tech

Nuxt 4 (Nitro server + Vue 3) · Nuxt UI 4 · Tailwind v4 · dockerode · ldapts · jose (JWT) · Postgres + TimescaleDB (`pg`) · chart.js · GitLab REST v4. Single deployable Node server.

---

## Author

**Seng Phirum** — [sengphirum143@gmail.com](mailto:sengphirum143@gmail.com)

---

## License

MIT © 2026 Seng Phirum

See [LICENSE](./LICENSE) for the full text.
