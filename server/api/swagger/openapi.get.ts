import { buildOpenApiSpec } from '~~/server/utils/openapi'
export default defineEventHandler(() => buildOpenApiSpec())
