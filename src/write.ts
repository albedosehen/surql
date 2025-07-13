import { type RecordId } from 'surrealdb'
import { type ConnectionProvider, QueryBuilder, type QueryOptions } from './base.ts'
import { intoSurrealDbError } from './surrealError.ts'
import type { SurrealDbTable } from './types.ts'

/**
 * A builder class for Create operations in SurrealDB
 *
 * @template R - Raw database record type (with RecordId and Date objects)
 * @template T - Processed/serializable type (with string fields)
 */
export class CreateQL<R extends { id: RecordId }, T = unknown> extends QueryBuilder<R, T> {
	private data: Record<string, unknown>

	/**
	 * Create a new CreateQL builder for the specified table
	 *
	 * @param connectionProvider - Database connection provider
	 * @param table - The SurrealDB table to create a record in
	 * @param data - The data to create
	 * @param options - Query options for controlling behavior
	 */
	constructor(
		connectionProvider: ConnectionProvider,
		table: SurrealDbTable,
		data: Record<string, unknown>,
		options: QueryOptions = {},
	) {
		super(connectionProvider, table, options)
		this.data = data
	}

	/**
	 * Execute the create operation and return the result
	 * This method performs the actual database operation to create a new record.
	 * It validates the mapper and handles the response.
	 * @throws - Throws an error if the mapper is not set or if the operation fails
	 * @returns - Promise<T> containing mapped created record
	 * @example
	 * await create('users', { username: 'puffin123', email: 'puffin123@example.com' })
	 *  .execute()
	 */
	async execute(): Promise<T> {
		const record = await this.executeQuery<R[]>(`CREATE ${this.table} CONTENT $data`, { data: this.data })

		if (!record || record.length === 0) {
			throw intoSurrealDbError('Create operation returned no records')
		}

		const mappedResult = this.mapResults(record, true)

		// TODO(@me): Handle multiple records if needed
		// Expect a single result for create operations
		return Array.isArray(mappedResult) ? mappedResult[0] : mappedResult
	}
}

/**
 * A builder class for Update operations in SurrealDB
 *
 * This class allows you to update existing records in a SurrealDB table.
 * It supports both merging new data with existing records and replacing them entirely.
 * By default, updates will merge the provided data with existing records.
 * You can switch to replace mode using the `replace()` method.
 *
 * @template R - Raw database record type (with RecordId and Date objects)
 * @template T - Processed/serializable type (with string fields)
 * @extends QueryBuilder<R, T>
 * @example
 * const updateOp = update('users', 'user:123', { age: 31 });
 * updateOp.replace(); // Switch to replace mode
 * updateOp.execute()
 *  .map((record) => {
 *   console.log('Record updated:', record);
 *  })
 * .mapErr((error) => {
 *  console.error('Error updating record:', error);
 * })
 * @remarks
 * This class is designed to work with SurrealDB's update operations.
 * It provides a fluent interface for building update queries, allowing you to specify
 * the table, record ID, and data to update. The `execute()` method performs the update
 * operation and returns a ResultAsync containing the updated record.
 */
export class UpdateQL<R extends { id: RecordId }, T = unknown> extends QueryBuilder<R, T> {
	private recordId: string
	private data: Record<string, unknown>
	private mergeMode: boolean = true

	/**
	 * Create a new UpdateQL builder for the specified table and record
	 *
	 * @param table - The SurrealDB table containing the record
	 * @param recordId - The ID of the record to update (can be string or RecordId)
	 * @param data - The data to update
	 * @param options - Query options for controlling behavior
	 */
	constructor(
		connectionProvider: ConnectionProvider,
		table: SurrealDbTable,
		recordId: string | RecordId,
		data: Record<string, unknown>,
		options: QueryOptions = {},
	) {
		super(connectionProvider, table, options)
		this.recordId = recordId.toString()
		this.data = data
	}

	/**
	 * Set the update mode to replace instead of merge
	 * By default, updates merge with existing data. This makes it replace instead.
	 *
	 * @returns - This instance for method chaining
	 * @example
	 * const updateOp = update('users', 'user:123', { age: 31 });
	 * updateOp.replace(); // Switch to replace mode
	 * const result = await updateOp.execute();
	 * console.log('Record updated:', result);
	 *  console.log('Record updated:', result.value);
	 * else
	 *  console.error('Error updating record:', result.error);
	 */
	replace(): this {
		this.mergeMode = false
		return this
	}

	/**
	 * Execute the update operation and return the result
	 *
	 * @returns - Promise<T> containing mapped updated record
	 * @throws - Throws an error if the mapper is not set or if the operation fails
	 * @example
	 * await update('posts', 'post:123', { title: 'Updated Title' })
	 * .execute()
	 */
	async execute(): Promise<T> {
		const query = this.mergeMode ? `UPDATE ${this.recordId} MERGE $data` : `UPDATE ${this.recordId} CONTENT $data`

		const records = await this.executeQuery<R[]>(query, { data: this.data })

		if (!records || records.length === 0) {
			throw intoSurrealDbError('Update operation returned no records')
		}

		const mappedResult = this.mapResults(records, true)
		// For update operations, we expect a single result
		return Array.isArray(mappedResult) ? mappedResult[0] : mappedResult
	}
}

/**
 * A builder class for Delete operations in SurrealDB
 *
 * This class allows you to delete existing records from a SurrealDB table.
 * It provides a fluent interface for specifying the table and record ID to delete.
 * By default, it deletes the record with the specified ID.
 *
 * @template R - Raw database record type (with RecordId and Date objects)
 * @template T - Processed/serializable type (with string fields)
 */
export class DeleteQL<R extends { id: RecordId }, T = unknown> extends QueryBuilder<R, T> {
	private recordId: string

	/**
	 * Create a new DeleteQL builder for the specified table and record
	 *
	 * @param table - The SurrealDB table containing the record
	 * @param recordId - The ID of the record to delete (can be string or RecordId)
	 * @param options - Query options for controlling behavior
	 * @remarks
	 * This constructor initializes the DeleteQL instance with the table and record ID.
	 * It also sets the options for the operation.
	 */
	constructor(
		connectionProvider: ConnectionProvider,
		table: SurrealDbTable,
		recordId: string | RecordId,
		options: QueryOptions = {},
	) {
		super(connectionProvider, table, options)
		this.recordId = recordId.toString()
	}

	/**
	 * Execute the delete operation and return the result
	 *
	 * @throws - Throws an error if the mapper is not set or if the operation fails
	 * @returns - Promise<T> containing mapped deleted record
	 * @example
	 * await remove('posts', 'post:123')
	 * .execute()
	 * @remarks
	 * This method performs the actual database operation to delete a record.
	 * It validates the mapper and handles the response.
	 * If the record is successfully deleted, it returns the deleted record.
	 * If the operation fails or the record is not found, it throws an error.
	 */
	async execute(): Promise<T> {
		const record = await this.executeQuery<R[]>(`DELETE ${this.recordId}`, {})

		if (!record || record.length === 0) {
			throw intoSurrealDbError('Delete operation returned no records')
		}

		const mappedResult = this.mapResults(record, true)
		// For delete operations, we expect a single result
		return Array.isArray(mappedResult) ? mappedResult[0] : mappedResult
	}
}

/**
 * Create a new record in the specified table
 *
 * @template R - Raw database record type (with RecordId and Date objects)
 * @template T - Processed/serializable type (with string fields)
 * @param connectionProvider - Database connection provider
 * @param table - The SurrealDB table to create a record in
 * @param data - The data for the new record
 * @param options - Optional query options for controlling behavior
 * @returns - A new CreateQL instance
 */
export function create<R extends { id: RecordId }, T = R>(
	connectionProvider: ConnectionProvider,
	table: SurrealDbTable,
	data: Record<string, unknown>,
	options?: QueryOptions,
): CreateQL<R, T> {
	return new CreateQL<R, T>(connectionProvider, table, data, options || {})
}

/**
 * Update a record in the specified table
 *
 * @template R - Raw database record type (with RecordId and Date objects)
 * @template T - Processed/serializable type (with string fields)
 * @param connectionProvider - Database connection provider
 * @param table - The SurrealDB table containing the record
 * @param recordId - The ID of the record to update (can be string or RecordId)
 * @param data - The data to update
 * @param options - Optional query options for controlling behavior
 * @returns - A new UpdateQL instance
 */
export function update<R extends { id: RecordId }, T = R>(
	connectionProvider: ConnectionProvider,
	table: SurrealDbTable,
	recordId: string | RecordId,
	data: Record<string, unknown>,
	options?: QueryOptions,
): UpdateQL<R, T> {
	return new UpdateQL<R, T>(connectionProvider, table, recordId, data, options || {})
}

/**
 * Delete a record in the specified table
 *
 * @template R - Raw database record type (with RecordId and Date objects)
 * @template T - Processed/serializable type (with string fields)
 * @param connectionProvider - Database connection provider
 * @param table - The SurrealDB table containing the record
 * @param recordId - The ID of the record to delete (can be string or RecordId)
 * @param options - Optional query options for controlling behavior
 * @returns - A new DeleteQL instance
 */
export function remove<R extends { id: RecordId }, T = R>(
	connectionProvider: ConnectionProvider,
	table: SurrealDbTable,
	recordId: string | RecordId,
	options?: QueryOptions,
): DeleteQL<R, T> {
	return new DeleteQL<R, T>(connectionProvider, table, recordId, options || {})
}
