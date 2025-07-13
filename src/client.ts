import type { RecordId, Surreal } from 'surrealdb'
import { type ConnectionConfig, SurrealConnectionManager } from './connection.ts'
import { ReadQL } from './read.ts'
import { CreateQL, DeleteQL, UpdateQL } from './write.ts'
import type { ConnectionProvider, QueryOptions } from './base.ts'
import type { SurrealDbTable } from './types.ts'

/**
 * Main SurrealDB client that provides a high-level interface for database operations
 * Manages connections internally and provides factory methods for query builders
 */
export class SurQLClient implements ConnectionProvider {
	private readonly connectionManager: SurrealConnectionManager

	/**
	 * Create a new SurQL client with the provided configuration
	 *
	 * @param config - Database connection configuration
	 */
	constructor(config: ConnectionConfig) {
		this.connectionManager = new SurrealConnectionManager(config)
	}

	/**
	 * Create a query builder for SELECT operations
	 *
	 * @template R - Raw database record type (with RecordId and Date objects)
	 * @template T - Processed/serializable type (with string fields)
	 * @param table - The SurrealDB table to query
	 * @param options - Optional query options for controlling behavior
	 * @returns A new ReadQL instance
	 * @example
	 * const users = await client.query('users')
	 *   .where({ active: true })
	 *   .map(mapToUser)
	 *   .execute()
	 */
	query<R extends { id: RecordId }, T = R>(
		table: SurrealDbTable,
		options?: QueryOptions,
	): ReadQL<R, T> {
		return new ReadQL<R, T>(this, table, options)
	}

	/**
	 * Create a query builder for CREATE operations
	 *
	 * @template R - Raw database record type (with RecordId and Date objects)
	 * @template T - Processed/serializable type (with string fields)
	 * @param table - The SurrealDB table to create a record in
	 * @param data - The data for the new record
	 * @param options - Optional query options for controlling behavior
	 * @returns A new CreateQL instance
	 * @example
	 * const newUser = await client.create('users', {
	 *   name: 'John Doe',
	 *   email: 'john@example.com'
	 * })
	 *   .map(mapToUser)
	 *   .execute()
	 */
	create<R extends { id: RecordId }, T = R>(
		table: SurrealDbTable,
		data: Record<string, unknown>,
		options?: QueryOptions,
	): CreateQL<R, T> {
		return new CreateQL<R, T>(this, table, data, options)
	}

	/**
	 * Create a query builder for UPDATE operations
	 *
	 * @template R - Raw database record type (with RecordId and Date objects)
	 * @template T - Processed/serializable type (with string fields)
	 * @param table - The SurrealDB table containing the record
	 * @param recordId - The ID of the record to update
	 * @param data - The data to update
	 * @param options - Optional query options for controlling behavior
	 * @returns A new UpdateQL instance
	 * @example
	 * const updatedUser = await client.update('users', 'user:123', {
	 *   email: 'newemail@example.com'
	 * })
	 *   .map(mapToUser)
	 *   .execute()
	 */
	update<R extends { id: RecordId }, T = R>(
		table: SurrealDbTable,
		recordId: string | RecordId,
		data: Record<string, unknown>,
		options?: QueryOptions,
	): UpdateQL<R, T> {
		return new UpdateQL<R, T>(this, table, recordId, data, options)
	}

	/**
	 * Create a query builder for DELETE operations
	 *
	 * @template R - Raw database record type (with RecordId and Date objects)
	 * @template T - Processed/serializable type (with string fields)
	 * @param table - The SurrealDB table containing the record
	 * @param recordId - The ID of the record to delete
	 * @param options - Optional query options for controlling behavior
	 * @returns A new DeleteQL instance
	 * @example
	 * const deletedUser = await client.remove('users', 'user:123')
	 *   .map(mapToUser)
	 *   .execute()
	 */
	remove<R extends { id: RecordId }, T = R>(
		table: SurrealDbTable,
		recordId: string | RecordId,
		options?: QueryOptions,
	): DeleteQL<R, T> {
		return new DeleteQL<R, T>(this, table, recordId, options)
	}

	/**
	 * Get a connection to SurrealDB (internal use by query builders)
	 * @internal
	 */
	getConnection(): Promise<Surreal> {
		return this.connectionManager.getConnection()
	}

	/**
	 * Close the database connection
	 *
	 * @returns Promise indicating success or failure
	 * @example
	 * await client.close()
	 */
	close(): Promise<void> {
		return this.connectionManager.close()
	}
}
