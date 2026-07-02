// Legacy redirect: the Network (/net) and Server (/server) apps were merged into
// one Monitoring app whose pages live under /monitoring/network and
// /monitoring/server. Old bookmarks/links to /net/* and /server/* are rewritten
// here so nothing 404s. Runs on both SSR and client. Filename orders this after
// auth.global (session hydrate) and before route-access.global, so the access
// guard evaluates the *redirected* /monitoring path, not the legacy one.
//
// Docker's /networks routes are intentionally not matched (the guards require an
// exact /net or a /net/ prefix, so /networks falls through untouched).
//
// A second wave of exact-path rewrites: Discovery, Maps, Groups, and Settings
// used to be separate Network/Server pages and are now unified single pages
// (each item tagged with a `type`/domain instead of living on its own route) -
// see useNav.ts.
const EXACT_REDIRECTS: Record<string, string> = {
  '/monitoring/network/discovery': '/monitoring/discovery',
  '/monitoring/server/discovery': '/monitoring/discovery',
  '/monitoring/network/maps': '/monitoring/maps',
  '/monitoring/server/maps': '/monitoring/maps',
  '/monitoring/network/groups': '/monitoring/groups',
  '/monitoring/server/groups': '/monitoring/groups',
  '/monitoring/network/settings': '/monitoring/settings',
  '/monitoring/server/settings': '/monitoring/settings'
}

export default defineNuxtRouteMiddleware((to) => {
  const p = to.path
  let mapped: string | null = null

  if (p === '/net') mapped = '/monitoring/network'
  else if (p.startsWith('/net/')) mapped = '/monitoring/network' + p.slice(4)
  else if (p === '/server') mapped = '/monitoring/server'
  else if (p.startsWith('/server/')) mapped = '/monitoring/server' + p.slice(7)
  else if (EXACT_REDIRECTS[p]) mapped = EXACT_REDIRECTS[p]

  if (mapped) return navigateTo({ path: mapped, query: to.query, hash: to.hash })
})
