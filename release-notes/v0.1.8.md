# DockHub v0.1.8

Date: 2026-06-19 UTC

## Docker Images

- `registry.kdsb.com.kh/dockhub/app:0.1.8`
- `registry.kdsb.com.kh/dockhub/app:latest`
- `registry.kdsb.com.kh/dockhub/agent:0.1.8`
- `registry.kdsb.com.kh/dockhub/agent:latest`

## Source

- Commit: `14e562d`
- Previous tag: none

## Changes

- Enhance Stack and Service view (14e562d)
- Enhance stack detail view (e728f76)
- Update replase sqlite with timescaledb and fix some issue (527d233)
- Enhance node display and added search text + sort function (e9244ab)
- Update (8201988)
- Update (3743019)
- Update (d054b0f)
- feat: add per-node usage agent, release tooling, and local dev swarm (0e13929)
- Update doc page (05d0b3e)
- feat: add unified public /documentation page with static docs build (79d5ae7)
- feat: expand settings page with LDAP/OIDC config UI and add docs pages (b35b7b0)
- feat: add Swagger API reference and user API token management (2d16d2e)
- Update setting (7257385)
- feat: add PWA support, DockHubLogo component, and brand icons (2e8f4d2)
- feat: major UX overhaul — SPA cache, Moby Blue theme, roles/settings split, author/license (658e837)
- Init (7cf7e9c)
- Init (33f6c2b)

## Local Changes Included In Build Context

The working tree had uncommitted changes before this release script ran.

```text
 M RELEASE_NOTES.md
 M app/components/ListControls.vue
 M app/composables/useListControls.ts
 M app/composables/usePreferences.ts
 M app/pages/audit/index.vue
 M app/pages/configs/index.vue
 M app/pages/containers/index.vue
 M app/pages/networks/index.vue
 M app/pages/nodes/[id].vue
 M app/pages/nodes/index.vue
 M app/pages/secrets/index.vue
 M app/pages/services/[id].vue
 M app/pages/services/index.vue
 M app/pages/stacks/index.vue
 M app/pages/tasks/index.vue
 M app/pages/users/index.vue
 M app/pages/volumes/index.vue
 M release-notes/v0.1.8.md
 M server/api/nodes/[id].get.ts
 M server/api/tasks/index.get.ts
 M server/utils/db.ts
 M server/utils/metrics.ts
 M server/utils/store.ts
?? app/pages/tasks/[id].vue
?? server/api/services/usage.get.ts
?? server/api/tasks/[id].get.ts
?? server/api/tasks/[id]/
```
