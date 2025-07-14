import { $ZodError } from '@zod/core'
import { intoZodError, ZodValidationError } from './zodError.ts'

/**
 * Input validation framework for SurrealDB operations
 * Uses basic validation functions that integrate with existing Zod error handling
 */

/**
 * Validation result type
 */
export interface ValidationResult {
  success: boolean
  error?: string
}

/**
 * Validate a field name for database operations
 * @param field - The field name to validate
 * @returns ValidationResult indicating success or failure with error message
 */
export function validateFieldName(field: unknown): ValidationResult {
  if (typeof field !== 'string') {
    return { success: false, error: 'Field name must be a string' }
  }

  if (field.length === 0) {
    return { success: false, error: 'Field name cannot be empty' }
  }

  if (field.length > 100) {
    return { success: false, error: 'Field name cannot exceed 100 characters' }
  }

  // Check for dangerous SQL patterns FIRST (before regex validation)
  const dangerousPatterns = [
    /;/,
    /--/,
    /\/\*/,
    /\*\//,
    /\bunion\b/i,
    /\bselect\b/i,
    /\binsert\b/i,
    /\bupdate\b/i,
    /\bdelete\b/i,
    /\bdrop\b/i,
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(field)) {
      return { success: false, error: 'Potentially dangerous field name detected' }
    }
  }

  // Allow alphanumeric characters, underscores, dots (for nested fields), colons, and hyphens
  const fieldNamePattern = /^[a-zA-Z0-9_.:-]+$/
  if (!fieldNamePattern.test(field)) {
    return {
      success: false,
      error: 'Field name can only contain letters, numbers, dots, underscores, colons, and hyphens',
    }
  }

  return { success: true }
}

/**
 * Validate a table name for database operations
 * @param table - The table name to validate
 * @returns ValidationResult indicating success or failure with error message
 */
export function validateTableName(table: unknown): ValidationResult {
  if (typeof table !== 'string') {
    return { success: false, error: 'Table name must be a string' }
  }

  if (table.length === 0) {
    return { success: false, error: 'Table name cannot be empty' }
  }

  if (table.length > 64) {
    return { success: false, error: 'Table name cannot exceed 64 characters' }
  }

  // Table names must start with a letter and contain only letters, numbers, underscores, and hyphens
  const tableNamePattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/
  if (!tableNamePattern.test(table)) {
    return {
      success: false,
      error: 'Table name must start with a letter and contain only letters, numbers, underscores, and hyphens',
    }
  }

  return { success: true }
}

/**
 * Validate a host for connection configuration
 * @param host - The host to validate
 * @returns ValidationResult indicating success or failure with error message
 */
export function validateHost(host: unknown): ValidationResult {
  if (typeof host !== 'string') {
    return { success: false, error: 'Host must be a string' }
  }

  if (host.length === 0) {
    return { success: false, error: 'Host cannot be empty' }
  }

  if (host.length > 253) {
    return { success: false, error: 'Host cannot exceed 253 characters' }
  }

  // Basic hostname/IP validation
  const hostnamePattern =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const localhostPattern = /^localhost$/i

  if (!hostnamePattern.test(host) && !ipPattern.test(host) && !localhostPattern.test(host)) {
    return { success: false, error: 'Invalid host format' }
  }

  return { success: true }
}

/**
 * Validate a port for connection configuration
 * @param port - The port to validate
 * @returns ValidationResult indicating success or failure with error message
 */
export function validatePort(port: unknown): ValidationResult {
  if (typeof port !== 'string') {
    return { success: false, error: 'Port must be a string' }
  }

  if (!/^\d+$/.test(port)) {
    return { success: false, error: 'Port must be a numeric string' }
  }

  const portNum = parseInt(port, 10)
  if (portNum < 1 || portNum > 65535) {
    return { success: false, error: 'Port must be between 1 and 65535' }
  }

  return { success: true }
}

/**
 * Validate a query value for database operations
 * @param value - The value to validate
 * @returns ValidationResult indicating success or failure with error message
 */
export function validateQueryValue(value: unknown): ValidationResult {
  // Allow null, undefined, boolean, number
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') {
    return { success: true }
  }

  // For strings, check for dangerous patterns
  if (typeof value === 'string') {
    if (value.length > 10000) {
      return { success: false, error: 'String values cannot exceed 10,000 characters' }
    }

    const dangerousPatterns = [
      /;.*(?:union|select|insert|update|delete|drop)/i,
      /'\s*(?:union|select|insert|update|delete|drop)/i,
      /"\s*(?:union|select|insert|update|delete|drop)/i,
      /\/\*.*\*\//,
      /--.*$/m,
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(value)) {
        return { success: false, error: 'Value contains potentially dangerous SQL patterns' }
      }
    }

    return { success: true }
  }

  // For objects and arrays, recursively validate
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      if (value.length > 1000) {
        return { success: false, error: 'Arrays cannot exceed 1000 elements' }
      }

      for (const item of value) {
        const result = validateQueryValue(item)
        if (!result.success) {
          return result
        }
      }
      return { success: true }
    } else {
      const entries = Object.entries(value as Record<string, unknown>)
      if (entries.length > 100) {
        return { success: false, error: 'Objects cannot have more than 100 properties' }
      }

      for (const [key, val] of entries) {
        const keyResult = validateFieldName(key)
        if (!keyResult.success) {
          return keyResult
        }

        const valueResult = validateQueryValue(val)
        if (!valueResult.success) {
          return valueResult
        }
      }
      return { success: true }
    }
  }

  // Reject functions and other potentially dangerous types
  if (typeof value === 'function') {
    return { success: false, error: 'Function values are not allowed in queries' }
  }

  return { success: false, error: `Unsupported data type: ${typeof value}` }
}

/**
 * Validate a LIKE pattern for database operations
 * @param pattern - The LIKE pattern to validate
 * @returns ValidationResult indicating success or failure with error message
 */
export function validateLikePattern(pattern: unknown): ValidationResult {
  if (typeof pattern !== 'string') {
    return { success: false, error: 'LIKE pattern must be a string' }
  }

  if (pattern.length > 1000) {
    return { success: false, error: 'LIKE pattern cannot exceed 1000 characters' }
  }

  // Check wildcard count
  const wildcardCount = (pattern.match(/[%_]/g) || []).length
  if (wildcardCount > 50) {
    return { success: false, error: 'Too many wildcards in LIKE pattern' }
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /;.*(?:union|select|insert|update|delete|drop)/i,
    /'\s*(?:union|select|insert|update|delete|drop)/i,
    /"\s*(?:union|select|insert|update|delete|drop)/i,
  ]

  for (const dangPattern of dangerousPatterns) {
    if (dangPattern.test(pattern)) {
      return { success: false, error: 'LIKE pattern contains potentially dangerous SQL patterns' }
    }
  }

  return { success: true }
}

/**
 * Validate connection configuration
 * @param config - The connection configuration to validate
 * @returns ValidationResult indicating success or failure with error message
 */
export function validateConnectionConfig(config: unknown): ValidationResult {
  if (typeof config !== 'object' || config === null) {
    return { success: false, error: 'Connection config must be an object' }
  }

  const {
    host,
    port,
    namespace,
    database,
    username,
    password,
  } = config as Record<string, unknown>

  const hostResult = validateHost(host)
  if (!hostResult.success) {
    return { success: false, error: `Invalid host: ${hostResult.error}` }
  }

  const portResult = validatePort(port)
  if (!portResult.success) {
    return { success: false, error: `Invalid port: ${portResult.error}` }
  }

  const namespaceResult = validateTableName(namespace)
  if (!namespaceResult.success) {
    return { success: false, error: `Invalid namespace: ${namespaceResult.error}` }
  }

  const databaseResult = validateTableName(database)
  if (!databaseResult.success) {
    return { success: false, error: `Invalid database: ${databaseResult.error}` }
  }

  if (typeof username !== 'string' || username.length === 0 || username.length > 64) {
    return { success: false, error: 'Username must be a non-empty string with max 64 characters' }
  }

  if (typeof password !== 'string' || password.length === 0 || password.length > 256) {
    return { success: false, error: 'Password must be a non-empty string with max 256 characters' }
  }

  return { success: true }
}

/**
 * Assert function that throws a ZodValidationError if validation fails
 * @param validationResult - The result of a validation function
 * @param context - Optional context for error reporting
 * @throws {ZodValidationError} If validation fails
 */
export function assertValidation(validationResult: ValidationResult, context?: string): void {
  if (!validationResult.success) {
    const message = context ? `${context}: ${validationResult.error}` : validationResult.error!
    throw new ZodValidationError(message)
  }
}

/**
 * Safe validator that returns a result object instead of throwing
 * @param validator - The validation function to call
 * @param data - The data to validate
 * @returns Object with success boolean and either error or data
 */
export function safeValidate<T>(
  validator: (data: unknown) => ValidationResult,
  data: T,
): { success: true; data: T } | { success: false; error: $ZodError } {
  try {
    const result = validator(data)
    if (result.success) {
      return { success: true, data }
    } else {
      return { success: false, error: intoZodError(result.error!) }
    }
  } catch (error) {
    return { success: false, error: intoZodError(error) }
  }
}

/**
 * Sanitize and validate an object's properties recursively
 * @param obj - The object to sanitize
 * @param maxDepth - Maximum recursion depth to prevent infinite loops
 * @returns Sanitized object
 */
export function sanitizeObject(obj: unknown, maxDepth = 10): unknown {
  if (maxDepth <= 0) {
    throw new Error('Maximum recursion depth exceeded during object sanitization')
  }

  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'string') {
    const result = validateQueryValue(obj)
    if (!result.success) {
      throw new Error(result.error)
    }
    return obj
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj
  }

  if (Array.isArray(obj)) {
    if (obj.length > 1000) {
      throw new Error('Arrays cannot exceed 1000 elements')
    }
    return obj.map((item) => sanitizeObject(item, maxDepth - 1))
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {}
    const entries = Object.entries(obj as Record<string, unknown>)

    if (entries.length > 100) {
      throw new Error('Objects cannot have more than 100 properties')
    }

    for (const [key, value] of entries) {
      const fieldResult = validateFieldName(key)
      if (!fieldResult.success) {
        throw new Error(fieldResult.error)
      }
      sanitized[key] = sanitizeObject(value, maxDepth - 1)
    }
    return sanitized
  }

  throw new Error(`Unsupported data type: ${typeof obj}`)
}
