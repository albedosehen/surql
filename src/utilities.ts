import type { RecordId } from 'surrealdb'

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
