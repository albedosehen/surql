import { $ZodError, type $ZodIssue } from '@zod/core'

export class ZodMappingError extends $ZodError {
	public context?: string

	constructor(issues: $ZodIssue[], context?: string) {
		const contextualizedIssues = issues.map((issue) => ({
			...issue,
			message: `${context ? `[${context}] ` : ''}${issue.path.join('.') || '(root)'}: ${issue.message}`,
		}))
		super(contextualizedIssues)
		// Don't try to override the read-only name property
		this.context = context
	}

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			issues: this.issues,
			stack: this.stack,
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

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			stack: this.stack,
		}
	}
}
