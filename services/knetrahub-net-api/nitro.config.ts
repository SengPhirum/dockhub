import { defineNitroConfig } from 'nitropack/config'

// CORS is handled in server/middleware/cors.ts via h3's handleCors(), not
// here - routeRules' `cors: true` only appends headers to actual responses,
// it doesn't answer the OPTIONS preflight a browser sends before a
// cross-origin request carrying an Authorization header (confirmed live:
// that preflight 405'd with cors:true alone, since no route matches OPTIONS).
export default defineNitroConfig({
  compatibilityDate: '2025-06-01',
  srcDir: 'server'
})
