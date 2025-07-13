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
 * Decode a JWT token and extract the payload
 * @param token - The JWT token to decode
 * @returns The decoded payload
 */
export function decodeJWTPayload<T = unknown>(token: string): T {
	const payload = token.split('.')[1]
	// Replace '-' with '+' and '_' with '/' to make it base64 standard
	const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=')
		.replace(/-/g, '+')
		.replace(/_/g, '/')
	const json = atob(padded)
	return JSON.parse(json) as T
}
