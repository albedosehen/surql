import { SurrealDbError } from 'surrealdb'

/**
 * Converts an error or message into a SurrealDbError.
 * If the error is a ZodError, it will be converted into a ZodMappingError.
 * @param errorOrMessage
 * @param maybeError
 * @returns
 */
export const intoSurrealDbError = (
	errorOrMessage: unknown,
	maybeError?: unknown,
): SurrealDbError => {
	if (typeof errorOrMessage === 'string' && maybeError !== undefined) {
		const baseMessage = errorOrMessage
		const originalError = maybeError

		let detailedMessage: string

		if (originalError instanceof Error) {
			detailedMessage = `${baseMessage} ${originalError.message}`
		} else if (typeof originalError === 'string') {
			detailedMessage = `${baseMessage} ${originalError}`
		} else if (typeof originalError === 'object' && originalError !== null) {
			const message = (originalError as { message?: unknown }).message
			detailedMessage = typeof message === 'string'
				? `${baseMessage} ${message}`
				: `${baseMessage} ${JSON.stringify(originalError)}`
		} else {
			detailedMessage = `${baseMessage} Unknown error`
		}

		return new SurrealDbError(detailedMessage)
	}

	const error = errorOrMessage

	if (error instanceof SurrealDbError) {
		return error
	}

	if (error instanceof Error) {
		return new SurrealDbError(error.message)
	}

	if (typeof error === 'string') {
		return new SurrealDbError(error)
	}

	if (typeof error === 'object' && error !== null) {
		const message = (error as { message?: unknown }).message
		if (typeof message === 'string') {
			return new SurrealDbError(message)
		}
		return new SurrealDbError(JSON.stringify(error))
	}

	return new SurrealDbError('Unknown error encountered! Maybe the developer forgot to handle this error?')
}
