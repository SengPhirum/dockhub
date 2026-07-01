// Legacy redirect: the Network (/net) and Server (/server) apps were merged into
// one Monitoring app whose pages live under /monitoring/network and
// /monitoring/server. Old bookmarks/links to /net/* and /server/* are rewritten
// here so nothing 404s. Runs on both SSR and client. Filename orders this after
// auth.global (session hydrate) and before route-access.global, so the access
// guard evaluates the *redirected* /monitoring path, not the legacy one.
//
// Docker's /networks routes are intentionally not matched (the guards require an
// exact /net or a /net/ prefix, so /networks falls through untouched).
export default defineNuxtRouteMiddleware((to) => {
  const p = to.path
  let mapped: string | null = null

  if (p === '/net') mapped = '/monitoring/network'
  else if (p.startsWith('/net/')) mapped = '/monitoring/network' + p.slice(4)
  else if (p === '/server') mapped = '/monitoring/server'
  else if (p.startsWith('/server/')) mapped = '/monitoring/server' + p.slice(7)

  if (mapped) return navigateTo({ path: mapped, query: to.query, hash: to.hash })
})
