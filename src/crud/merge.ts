import type { RecordId } from 'surrealdb'
import { type ConnectionProvider, QueryBuilder, type QueryOptions } from './base.ts'
import type { SurrealDbTable } from '../types.ts'
import { intoSurrealDbError } from '../surrealError.ts'

/**
 * A builder class for MERGE operations in SurrealDB
 *
 * Merge operations allow partial updates to existing records,
 * combining new data with existing record data.
 *
 * @template R - Raw database record type (with RecordId and Date objects)
 * @template T - Processed/serializable type (with string fields)
 */
export class MergeQL<R extends { id: RecordId }, T = unknown> extends QueryBuilder<R, T> {
  private targetId: string | RecordId
  private mergeData: Record<string, unknown>

  /**
   * Create a new MergeQL builder for the specified table and record
   *
   * @param connectionProvider - Database connection provider
   * @param table - The SurrealDB table containing the record
   * @param targetId - The ID of the record to merge data into
   * @param data - The data to merge with the existing record
   * @param options - Query options for controlling behavior
   */
  constructor(
    connectionProvider: ConnectionProvider,
    table: SurrealDbTable,
    targetId: string | RecordId,
    data: Record<string, unknown>,
    options: QueryOptions = {},
  ) {
    super(connectionProvider, table, options)
    this.targetId = targetId.toString()
    this.mergeData = data
  }

  /**
   * Execute the merge operation and return the result
   *
   * This method performs a MERGE operation that combines the provided data
   * with the existing record data. Fields not specified in the merge data
   * will retain their original values.
   *
   * @returns Promise<T> - The updated record after merging
   * @throws - Throws an error if the operation fails or no record is found
   * @example
   * const updatedUser = await client.merge('users', 'user:123', {
   *   email: 'newemail@example.com',
   *   lastLogin: new Date()
   * })
   *   .map(mapUser)
   *   .execute()
   */
  async execute(): Promise<T> {
    try {
      // Build the MERGE query with parameters
      const query = `UPDATE ${this.targetId} MERGE $data`
      const params = { data: this.mergeData, ...this.params }

      const records = await this.executeQuery<R[]>(query, params)

      if (!records || records.length === 0) {
        throw intoSurrealDbError('Merge operation returned no records - record may not exist')
      }

      const mappedResult = this.mapResults(records, true)

      // For merge operations, we expect a single result
      return Array.isArray(mappedResult) ? mappedResult[0] : mappedResult
    } catch (e) {
      if (e instanceof Error && e.message.includes('returned no records')) {
        throw e // Re-throw our specific error
      }
      throw intoSurrealDbError('Merge operation failed:', e)
    }
  }
}

/**
 * Create a merge operation for the specified table and record
 *
 * @template R - Raw database record type (with RecordId and Date objects)
 * @template T - Processed/serializable type (with string fields)
 * @param connectionProvider - Database connection provider
 * @param table - The SurrealDB table containing the record
 * @param targetId - The ID of the record to merge data into
 * @param data - The data to merge with the existing record
 * @param options - Optional query options for controlling behavior
 * @returns A new MergeQL instance
 * @example
 * const updatedPost = await merge(connectionProvider, 'posts', 'post:456', {
 *   title: 'Updated Title',
 *   updatedAt: new Date()
 * })
 *   .map(mapPost)
 *   .execute()
 */
export function merge<R extends { id: RecordId }, T = R>(
  connectionProvider: ConnectionProvider,
  table: SurrealDbTable,
  targetId: string | RecordId,
  data: Record<string, unknown>,
  options?: QueryOptions,
): MergeQL<R, T> {
  return new MergeQL<R, T>(connectionProvider, table, targetId, data, options || {})
}
