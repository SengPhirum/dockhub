import { readSession, resolveUserEntitlements } from '~~/server/utils/auth'
export default defineEventHandler(async (event) => {
  const user = await readSession(event)
  if (!user) return { user: null }
  // Resolve per-app entitlements live, so a change to the Settings app-role map
  // takes effect on the next page load without forcing a re-login.
  const apps = await resolveUserEntitlements(user)
  return { user: { ...user, apps } }
})
