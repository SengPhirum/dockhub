import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * At-rest encryption for credentials stored in Postgres (GitLab token, LDAP
 * bind password, OIDC client secret, registry auth, alert channel configs).
 * AES-256-GCM, key derived from the existing jwtSecret - no new mandatory
 * env var, and the same "must be set in production" posture jwtSecret
 * already has.
 */

const PREFIX = 'v1:'
const ALGO = 'aes-256-gcm'

function deriveKey(): Buffer {
  const secret = useRuntimeConfig().jwtSecret
  return createHash('sha256').update('dockhub:secrets:v1:' + secret).digest()
}

/** Encrypts plaintext for storage. Always produces a "v1:"-prefixed value. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, deriveKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`
}

/**
 * Decrypts a value produced by encryptSecret(). If `value` doesn't start
 * with the "v1:" prefix, it's returned UNCHANGED - this is what makes
 * encrypting previously-plaintext columns migration-free: old rows keep
 * reading correctly and only get encrypted on their next save. On decrypt
 * failure (wrong key, corruption) logs a warning and returns '' rather than
 * throwing - a key rotation must never 500 a settings/registry load.
 */
export function decryptSecret(value: string | null | undefined): string {
  if (!value) return ''
  if (!value.startsWith(PREFIX)) return value
  try {
    const [, ivB64, tagB64, dataB64] = value.split(':')
    const iv = Buffer.from(ivB64 ?? '', 'base64')
    const authTag = Buffer.from(tagB64 ?? '', 'base64')
    const ciphertext = Buffer.from(dataB64 ?? '', 'base64')
    const decipher = createDecipheriv(ALGO, deriveKey(), iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch (err) {
    console.warn('[secretCrypto] failed to decrypt value, returning empty string', err)
    return ''
  }
}
