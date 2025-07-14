import type { RecordId } from 'surrealdb'

/**
 * Convert a SurrealDB RecordId to a string
 *
 * @param recordId - The RecordId to convert
 * @returns - The string representation of the RecordId
 */
export function recordIdToString(recordId: RecordId | string): string {
  if (typeof recordId === 'string') return recordId

  const result = recordId.toString()
  // Strip angle brackets ⟨⟩ from SurrealDB RecordId format for backward compatibility
  return result.replace(/⟨(.+?)⟩/g, '$1')
}

/**
 * Normalize a SurrealDB record by converting the RecordId to a string
 *
 * @param record - The record to normalize
 * @returns - A new record with the id converted to a string
 */
export function normalizeSurrealRecord<T extends { id: RecordId }>(
  record: T,
): Omit<T, 'id'> & { id: string } {
  const { id, ...rest } = record
  return {
    ...rest,
    id: recordIdToString(id),
  } as Omit<T, 'id'> & { id: string }
}

/**
 * Normalize an array of SurrealDB records by converting the RecordIds to strings
 *
 * @param records - The records to normalize
 * @returns - A new array with normalized records
 */
export function normalizeSurrealRecords<T extends { id: RecordId }>(
  records: T[],
): (Omit<T, 'id'> & { id: string })[] {
  return records.map(normalizeSurrealRecord)
}

/**
 * Decode and validate a JWT token, extracting the payload only after signature verification
 * @param token - The JWT token to decode and validate
 * @param secret - Optional secret key for verification (if not provided, only basic validation is performed)
 * @returns The decoded payload
 * @throws Error if token is invalid or signature verification fails
 */
export async function validateAndDecodeJWTPayload<T = unknown>(token: string, secret?: string): Promise<T> {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid JWT token: token must be a non-empty string')
  }

  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT token: must have exactly 3 parts')
  }

  const [headerB64, payloadB64, _signatureB64] = parts

  // Validate
  let header: { alg?: string; typ?: string }
  try {
    const headerPadded = base64UrlDecode(headerB64)
    header = JSON.parse(headerPadded)
    if (header.typ && header.typ !== 'JWT') {
      throw new Error('Invalid JWT token: incorrect type')
    }
  } catch (e) {
    throw new Error(`Invalid JWT token: malformed header - ${e instanceof Error ? e.message : String(e)}`)
  }

  // Decode
  let payload: T
  try {
    const payloadDecoded = base64UrlDecode(payloadB64)
    payload = JSON.parse(payloadDecoded) as T
  } catch (e) {
    throw new Error(`Invalid JWT token: malformed payload - ${e instanceof Error ? e.message : String(e)}`)
  }

  // Verify expiration (if provided)
  if (typeof payload === 'object' && payload !== null && 'exp' in payload) {
    const exp = (payload as { exp: unknown }).exp
    if (typeof exp === 'number' && exp * 1000 < Date.now()) {
      throw new Error('JWT token has expired')
    }
  }

  // Verify signature
  if (secret && header.alg) {
    try {
      await verifyJWTSignature(token, secret, header.alg)
    } catch (e) {
      throw new Error(`JWT signature verification failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return payload
}

/**
 * Decode base64url encoded string
 * @param base64url - The base64url encoded string
 * @returns The decoded string
 */
function base64UrlDecode(base64url: string): string {
  // Replace URL-safe characters with standard base64 characters
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  // Add padding if necessary
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
  return atob(padded)
}

/**
 * Verify JWT signature using Web Crypto API
 * @param token - The JWT token to verify
 * @param secret - The secret key for verification
 * @param algorithm - The signing algorithm
 */
async function verifyJWTSignature(token: string, secret: string, algorithm: string): Promise<void> {
  const [headerB64, payloadB64, signatureB64] = token.split('.')
  const data = `${headerB64}.${payloadB64}`

  // Convert secret to key
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: getHashAlgorithm(algorithm) },
    false,
    ['verify'],
  )

  // Decode signature
  const signature = base64UrlToUint8Array(signatureB64)

  // Verify signature
  const isValid = await globalThis.crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    new TextEncoder().encode(data),
  )

  if (!isValid) {
    throw new Error('Invalid JWT signature')
  }
}

/**
 * Convert base64url string to Uint8Array
 * @param base64url - The base64url encoded string
 * @returns Uint8Array representation
 */
function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
  const binaryString = atob(padded)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

/**
 * Get hash algorithm for Web Crypto API
 * @param algorithm - JWT algorithm
 * @returns Hash algorithm name
 */
function getHashAlgorithm(algorithm: string): string {
  switch (algorithm) {
    case 'HS256':
      return 'SHA-256'
    case 'HS384':
      return 'SHA-384'
    case 'HS512':
      return 'SHA-512'
    default:
      throw new Error(`Unsupported JWT algorithm: ${algorithm}`)
  }
}

/**
 * Utility type that automatically converts RecordId and Date fields to strings
 *
 * This type recursively transforms:
 * - RecordId → string
 * - Date → string
 * - nested objects → SerializedObject<nested objects>
 * - other types → unchanged
 *
 * @template T - The type to serialize, must have an id field of type RecordId
 * @example
 * ```typescript
 * interface UserRaw {
 *   id: RecordId
 *   name: string
 *   createdAt: Date
 *   profile: {
 *     lastLogin: Date
 *   }
 * }
 *
 * type UserSerialized = Serialized<UserRaw>
 * // Result: {
 * //   id: string
 * //   name: string
 * //   createdAt: string
 * //   profile: {
 * //     lastLogin: string
 * //   }
 * // }
 * ```
 */
export type Serialized<T extends { id: RecordId }> = {
  [K in keyof T]: T[K] extends RecordId ? string
    : T[K] extends Date ? string
    : T[K] extends object ? SerializedObject<T[K]>
    : T[K]
}

/**
 * Helper type for serializing nested objects without requiring id field
 */
type SerializedObject<T> = {
  [K in keyof T]: T[K] extends RecordId ? string
    : T[K] extends Date ? string
    : T[K] extends object ? SerializedObject<T[K]>
    : T[K]
}

/**
 * Creates a collection of common serialization functions for transforming
 * raw database types to serializable types
 *
 * @template R - Raw database record type with RecordId and Date objects
 * @returns Object containing common transformation utilities
 * @example
 * ```typescript
 * interface UserRaw {
 *   id: RecordId
 *   name: string
 *   createdAt: Date
 * }
 *
 * const serializer = createSerializer<UserRaw>()
 *
 * const mapUser = (raw: UserRaw) => ({
 *   id: serializer.id(raw),
 *   name: raw.name,
 *   createdAt: serializer.date(raw.createdAt)
 * })
 * ```
 */
export const createSerializer = <R extends { id: RecordId }>() => ({
  /**
   * Convert a RecordId to string representation
   *
   * @param record - Record containing RecordId
   * @returns String representation of the RecordId
   */
  id: (record: R): string => record.id.toString(),

  /**
   * Convert a Date object to ISO string representation
   *
   * @param date - Date object to convert
   * @returns ISO string representation of the date
   */
  date: (date: Date): string => date.toISOString(),

  /**
   * Convert a RecordId field directly to string
   *
   * @param recordId - RecordId to convert
   * @returns String representation of the RecordId
   */
  recordId: (recordId: RecordId): string => recordId.toString(),

  /**
   * Convert an optional Date to ISO string or undefined
   *
   * @param date - Optional Date object to convert
   * @returns ISO string representation or undefined
   */
  optionalDate: (date?: Date): string | undefined => date?.toISOString(),

  /**
   * Convert an optional RecordId to string or undefined
   *
   * @param recordId - Optional RecordId to convert
   * @returns String representation or undefined
   */
  optionalRecordId: (recordId?: RecordId): string | undefined => recordId?.toString(),

  /**
   * Convert an array of RecordIds to strings
   *
   * @param recordIds - Array of RecordIds to convert
   * @returns Array of string representations
   */
  recordIdArray: (recordIds: RecordId[]): string[] => recordIds.map((id) => id.toString()),

  /**
   * Convert an array of Dates to ISO strings
   *
   * @param dates - Array of Dates to convert
   * @returns Array of ISO string representations
   */
  dateArray: (dates: Date[]): string[] => dates.map((date) => date.toISOString()),
})
