import { $ZodError, type $ZodIssue } from '@zod/core'

interface ZodMappingErrorJSON {
  name: string
  message: string
  issues: $ZodIssue[]
  stack: string | undefined
}

interface SurrealDbErrorJSON {
  name: string
  message: string
  stack: string | undefined
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
 * Sanitize Zod error messages to prevent sensitive information exposure
 * @param message - The error message to sanitize
 * @returns Sanitized error message
 */
function sanitizeZodErrorMessage(message: string): string {
  const includeDetails = !isProductionEnvironment()

  if (!includeDetails) {
    // In production, sanitize sensitive patterns
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
        return 'Invalid input provided'
      }
    }

    // Remove internal paths and technical details
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

    return sanitized
  }

  // In development, return full message but redact obvious secrets
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

export class ZodMappingError extends $ZodError {
  public context?: string

  constructor(issues: $ZodIssue[], context?: string) {
    const contextualizedIssues = issues.map((issue) => ({
      ...issue,
      message: sanitizeZodErrorMessage(
        `${context ? `[${context}] ` : ''}${issue.path.join('.') || '(root)'}: ${issue.message}`,
      ),
    }))
    super(contextualizedIssues)
    // Don't try to override the read-only name property
    this.context = context
  }

  toJSON(): ZodMappingErrorJSON {
    return {
      name: this.name,
      message: sanitizeZodErrorMessage(this.message),
      issues: this.issues.map((issue) => ({
        ...issue,
        message: sanitizeZodErrorMessage(issue.message),
      })),
      stack: isProductionEnvironment() ? undefined : this.stack,
    }
  }
}

export class ZodValidationError extends $ZodError {
  constructor(message: string, path: (string | number)[] = []) {
    const issue: $ZodIssue = {
      code: 'invalid_type',
      path: path,
      message: message,
      expected: 'unknown',
      input: undefined,
    }
    super([issue])
    // Don't try to override the read-only name property
    // The error message will be accessible via this.message
  }
}

export const intoZodError = (error: unknown): $ZodError => {
  if (error instanceof $ZodError) {
    return error
  }

  let message = 'Unknown validation error'
  const path: (string | number)[] = []

  if (typeof error === 'string') {
    message = error
  } else if (error instanceof Error) {
    message = error.message
    // Potentially inspect error for path if it's a custom error type with path info
  } else if (typeof error === 'object' && error !== null) {
    const errMsg = (error as { message?: unknown }).message
    if (typeof errMsg === 'string') {
      message = errMsg
    } else {
      try {
        message = JSON.stringify(error)
      } catch {
        message = 'Non-serializable object error'
      }
    }
  }
  return new ZodValidationError(message, path)
}

export const intoZodMappingError = (error: unknown, context?: string): ZodMappingError => {
  if (error instanceof ZodMappingError) {
    if (context === undefined || error.context === context) {
      return error
    }
    return new ZodMappingError(error.issues, context)
  }

  const baseZodError = intoZodError(error)
  return new ZodMappingError(baseZodError.issues, context)
}

import { SurrealDbError as BaseError } from 'surrealdb'

export class SurrealDbError extends BaseError {
  constructor(message: string) {
    super(message)
    this.name = 'SurrealDbError'
  }

  toJSON(): SurrealDbErrorJSON {
    return {
      name: this.name,
      message: this.message,
      stack: this.stack,
    }
  }
}
