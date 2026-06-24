import { requireUser, issueSubsystemToken } from '~~/server/utils/auth'

/**
 * Called by RemoteModuleLoader (same-origin, so the portal's httpOnly
 * session cookie is sent automatically) right before loading a remote, so
 * the remote can call its own API with proof of who's logged in without
 * ever touching the portal's actual session cookie.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const token = await issueSubsystemToken(user)
  return { token, expiresInSeconds: 300 }
})
