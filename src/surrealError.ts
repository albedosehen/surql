import { SurrealDbError } from 'surrealdb'

/**
 * Converts an error or message into a SurrealDbError with sanitized error messages.
 * Prevents sensitive information from being exposed in production error messages.
 * @param errorOrMessage - The error or base message
 * @param maybeError - Optional additional error context
 * @param options - Configuration options for error sanitization
 * @returns SurrealDbError with sanitized message
 */
export const intoSurrealDbError = (
  errorOrMessage: unknown,
  maybeError?: unknown,
  options: { includeDetails?: boolean; maxMessageLength?: number } = {},
): SurrealDbError => {
  const { includeDetails = !isProductionEnvironment(), maxMessageLength = 500 } = options

  if (typeof errorOrMessage === 'string' && maybeError !== undefined) {
    const baseMessage = sanitizeErrorMessage(errorOrMessage, includeDetails)
    const originalError = maybeError

    let detailedMessage: string

    if (originalError instanceof Error) {
      const sanitizedError = sanitizeErrorMessage(originalError.message, includeDetails)
      detailedMessage = `${baseMessage} ${sanitizedError}`
    } else if (typeof originalError === 'string') {
      const sanitizedError = sanitizeErrorMessage(originalError, includeDetails)
      detailedMessage = `${baseMessage} ${sanitizedError}`
    } else if (typeof originalError === 'object' && originalError !== null) {
      const message = (originalError as { message?: unknown }).message
      if (typeof message === 'string') {
        const sanitizedError = sanitizeErrorMessage(message, includeDetails)
        detailedMessage = `${baseMessage} ${sanitizedError}`
      } else {
        const errorInfo = includeDetails ? safeJsonStringify(originalError) : 'Error details hidden'
        detailedMessage = `${baseMessage} ${errorInfo}`
      }
    } else {
      detailedMessage = `${baseMessage} Unknown error`
    }

    return new SurrealDbError(truncateMessage(detailedMessage, maxMessageLength))
  }

  const error = errorOrMessage

  if (error instanceof SurrealDbError) {
    return error
  }

  if (error instanceof Error) {
    const sanitizedMessage = sanitizeErrorMessage(error.message, includeDetails)
    return new SurrealDbError(truncateMessage(sanitizedMessage, maxMessageLength))
  }

  if (typeof error === 'string') {
    const sanitizedMessage = sanitizeErrorMessage(error, includeDetails)
    return new SurrealDbError(truncateMessage(sanitizedMessage, maxMessageLength))
  }

  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') {
      const sanitizedMessage = sanitizeErrorMessage(message, includeDetails)
      return new SurrealDbError(truncateMessage(sanitizedMessage, maxMessageLength))
    }
    const errorInfo = includeDetails ? safeJsonStringify(error) : 'Error details hidden'
    return new SurrealDbError(truncateMessage(errorInfo, maxMessageLength))
  }

  return new SurrealDbError('An error occurred while processing your request')
}

/**
 * Determine if we're running in a production environment
 * @returns true if in production, false otherwise
 */
function isProductionEnvironment(): boolean {
  const env = Deno.env.get('DENO_ENV') || Deno.env.get('NODE_ENV') || 'development'
  return env === 'production'
}

/**
 * Sanitize error messages to prevent sensitive information exposure
 * @param message - The error message to sanitize
 * @param includeDetails - Whether to include detailed error information
 * @returns Sanitized error message
 */
function sanitizeErrorMessage(message: string, includeDetails: boolean): string {
  if (!includeDetails) {
    // In production, return generic error messages for certain sensitive patterns
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /key/i,
      /credentials/i,
      /authorization/i,
      /authentication/i,
      /jwt/i,
      /api.?key/i,
      /connection.?string/i,
    ]

    for (const pattern of sensitivePatterns) {
      if (pattern.test(message)) {
        return 'Authentication or configuration error occurred'
      }
    }

    // Hide internal file paths and system information
    const internalPatterns = [
      /file:\/\/.*$/gm,
      /at.*\([^)]*\)/g,
      /\b[A-Za-z]:\\[^\\]+\\.*$/gm,
      /\/[^\/\s]+\/[^\/\s]+\/.*$/gm,
    ]

    let sanitized = message
    for (const pattern of internalPatterns) {
      sanitized = sanitized.replace(pattern, '[internal]')
    }

    // Remove potential SQL injection attempts from error messages
    const sqlPatterns = [
      /\b(union|select|insert|update|delete|drop)\b/gi,
      /['"`;]/g,
    ]

    for (const pattern of sqlPatterns) {
      sanitized = sanitized.replace(pattern, '[filtered]')
    }

    return sanitized
  }

  // In development, return the full message but still sanitize obvious secrets
  const secretPatterns = [
    /(password|token|secret|key)(\s*[:=]\s*)([^\s]+)/gi,
    /(bearer\s+)([a-zA-Z0-9\-._~+/]+=*)/gi,
  ]

  let sanitized = message
  for (const pattern of secretPatterns) {
    sanitized = sanitized.replace(pattern, (_match, p1, p2) => {
      return `${p1}${p2 || ''}[REDACTED]`
    })
  }

  return sanitized
}

/**
 * Safely stringify an object, handling circular references and sensitive data
 * @param obj - The object to stringify
 * @returns Safe JSON string representation
 */
function safeJsonStringify(obj: unknown): string {
  const seen = new WeakSet()

  try {
    return JSON.stringify(obj, (key, value) => {
      // Remove sensitive keys
      const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'credentials']
      if (typeof key === 'string' && sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
        return '[REDACTED]'
      }

      // Handle circular references
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]'
        }
        seen.add(value)
      }

      return value
    })
  } catch {
    return '[Object could not be serialized]'
  }
}

/**
 * Truncate message to prevent overly long error messages
 * @param message - The message to truncate
 * @param maxLength - Maximum allowed length
 * @returns Truncated message
 */
function truncateMessage(message: string, maxLength: number): string {
  if (message.length <= maxLength) {
    return message
  }
  return message.substring(0, maxLength - 3) + '...'
}
