// routeRules' `cors: true` (nitro.config.ts) only appends CORS headers to
// actual responses - it doesn't answer the OPTIONS preflight browsers send
// before any cross-origin request carrying an Authorization header.
// Confirmed live: without this, the preflight got a 405 ("Method options is
// not allowed on this route") since no route handler matches OPTIONS, and
// the browser blocked the real GET as a CORS failure even though the GET
// route itself was correctly configured.
export default defineEventHandler((event) => {
  handleCors(event, { origin: '*', methods: '*', allowHeaders: '*' })
})
