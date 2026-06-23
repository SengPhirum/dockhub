# DockHub v0.1.8

Date: 2026-06-23 UTC

## Docker Images

- `registry.kdsb.com.kh/dockhub/app:0.1.8`
- `registry.kdsb.com.kh/dockhub/app:latest`
- `registry.kdsb.com.kh/dockhub/agent:0.1.8`
- `registry.kdsb.com.kh/dockhub/agent:latest`

## Source

- Commit: `e8a09df`
- Previous tag: none

## Changes

- Enhance dashboard and dev swarm (e8a09df)
- Add full service editing, autoredeploy, appearance settings, and fix PWA (392598f)
- Enhance UI (0cb4a52)
- Update enhance all view (f89e508)
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
 M .env.example
 M README.md
 M RELEASE_NOTES.md
 M app/app.vue
 M app/composables/useAppearance.ts
 M app/pages/docs/configuration.vue
 M app/pages/docs/index.vue
 M app/pages/docs/manual.vue
 M app/pages/documentation.vue
 M app/pages/services/[id].vue
 M app/pages/services/index.vue
 M app/pages/settings/index.vue
 M app/pages/stacks/[name].vue
 M app/pages/stacks/index.vue
 M nuxt.config.ts
 M release-notes/v0.1.8.md
 M server/api/gitlab/status.get.ts
 M server/api/services/[id].get.ts
 M server/api/services/[id]/image.post.ts
 M server/api/services/[id]/redeploy.post.ts
 M server/api/services/[id]/scale.post.ts
 M server/api/services/usage.get.ts
 M server/api/settings/appearance.put.ts
 M server/api/stacks/[name]/index.delete.ts
 M server/api/stacks/[name]/index.get.ts
 M server/api/stacks/[name]/rollback.post.ts
 M server/api/stacks/index.get.ts
 M server/api/stacks/index.post.ts
 M server/utils/appearanceSettings.ts
 M server/utils/authSettings.ts
 M server/utils/db.ts
 M server/utils/gitlab.ts
 M server/utils/store.ts
?? server/api/alerts/
?? server/api/gitlab/settings.delete.ts
?? server/api/gitlab/settings.put.ts
?? server/plugins/alerts.ts
?? server/routes/
?? server/utils/alertChannels.ts
?? server/utils/alertNotify.ts
?? server/utils/alertRules.ts
?? server/utils/gitlabSettings.ts
?? server/utils/secretCrypto.ts
```
