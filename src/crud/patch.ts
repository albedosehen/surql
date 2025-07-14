import type { RecordId } from 'surrealdb'
import { type ConnectionProvider, QueryBuilder, type QueryOptions } from './base.ts'
import type { SurrealDbTable } from '../types.ts'
import { intoSurrealDbError } from '../surrealError.ts'

/**
 * JSON Patch operation types following RFC 6902
 */
export interface PatchOperation {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test'
  path: string
  value?: unknown
  from?: string // For move/copy operations
}

/**
 * Error thrown when patch operations are invalid
 */
export class PatchOperationError extends Error {
  constructor(message: string, public operation: PatchOperation) {
    super(message)
    this.name = 'PatchOperationError'
  }
}

/**
 * A builder class for PATCH operations in SurrealDB using JSON Patch RFC 6902
 *
 * Patch operations allow precise modifications to record fields using
 * standardized JSON Patch operations (add, remove, replace, move, copy, test).
 *
 * @template R - Raw database record type (with RecordId and Date objects)
 * @template T - Processed/serializable type (with string fields)
 */
export class PatchQL<R extends { id: RecordId }, T = unknown> extends QueryBuilder<R, T> {
  private targetId: string | RecordId
  private patchOps: PatchOperation[] = []

  /**
   * Create a new PatchQL builder for the specified table and record
   *
   * @param connectionProvider - Database connection provider
   * @param table - The SurrealDB table containing the record
   * @param targetId - The ID of the record to patch
   * @param operations - Initial patch operations to apply
   * @param options - Query options for controlling behavior
   */
  constructor(
    connectionProvider: ConnectionProvider,
    table: SurrealDbTable,
    targetId: string | RecordId,
    operations: PatchOperation[] = [],
    options: QueryOptions = {},
  ) {
    super(connectionProvider, table, options)
    this.targetId = targetId.toString()
    this.patchOps = [...operations]
    this.validateOperations()
  }

  /**
   * Add a single patch operation
   *
   * @param operation - JSON Patch operation to add
   * @returns this - For method chaining
   * @example
   * await client.patch('users', 'user:123', [])
   *   .addOperation({ op: 'replace', path: '/email', value: 'new@example.com' })
   *   .addOperation({ op: 'add', path: '/lastUpdated', value: new Date().toISOString() })
   *   .execute()
   */
  addOperation(operation: PatchOperation): this {
    this.validateOperation(operation)
    this.patchOps.push(operation)
    return this
  }

  /**
   * Add multiple patch operations
   *
   * @param operations - Array of JSON Patch operations to add
   * @returns this - For method chaining
   * @example
   * await client.patch('users', 'user:123', [])
   *   .addOperations([
   *     { op: 'replace', path: '/name', value: 'New Name' },
   *     { op: 'remove', path: '/tempField' }
   *   ])
   *   .execute()
   */
  addOperations(operations: PatchOperation[]): this {
    operations.forEach((op) => this.validateOperation(op))
    this.patchOps.push(...operations)
    return this
  }

  /**
   * Execute the patch operations and return the result
   *
   * This method applies all configured JSON Patch operations to the target record
   * following RFC 6902 specifications.
   *
   * @returns Promise<T> - The updated record after applying patches
   * @throws - Throws an error if operations are invalid or execution fails
   * @example
   * const patchedUser = await client.patch('users', 'user:123', [
   *   { op: 'replace', path: '/email', value: 'updated@example.com' },
   *   { op: 'add', path: '/preferences/theme', value: 'dark' }
   * ])
   *   .map(mapUser)
   *   .execute()
   */
  async execute(): Promise<T> {
    try {
      if (this.patchOps.length === 0) {
        throw new PatchOperationError('No patch operations specified', {} as PatchOperation)
      }

      // Build the PATCH query with operations
      const query = `UPDATE ${this.targetId} PATCH $operations`
      const params = { operations: this.patchOps, ...this.params }

      const records = await this.executeQuery<R[]>(query, params)

      if (!records || records.length === 0) {
        throw intoSurrealDbError('Patch operation returned no records - record may not exist')
      }

      const mappedResult = this.mapResults(records, true)

      // For patch operations, we expect a single result
      return Array.isArray(mappedResult) ? mappedResult[0] : mappedResult
    } catch (e) {
      if (e instanceof PatchOperationError) {
        throw e // Re-throw patch-specific errors
      }
      if (e instanceof Error && e.message.includes('returned no records')) {
        throw e // Re-throw our specific error
      }
      throw intoSurrealDbError('Patch operation failed:', e)
    }
  }

  /**
   * Validate all patch operations
   * @private
   */
  private validateOperations(): void {
    this.patchOps.forEach((op) => this.validateOperation(op))
  }

  /**
   * Validate a single patch operation according to RFC 6902
   * @private
   * @param operation - The operation to validate
   */
  private validateOperation(operation: PatchOperation): void {
    if (!operation.op) {
      throw new PatchOperationError('Operation must specify "op" field', operation)
    }

    const validOps = ['add', 'remove', 'replace', 'move', 'copy', 'test']
    if (!validOps.includes(operation.op)) {
      throw new PatchOperationError(
        `Invalid operation "${operation.op}". Must be one of: ${validOps.join(', ')}`,
        operation,
      )
    }

    if (!operation.path) {
      throw new PatchOperationError('Operation must specify "path" field', operation)
    }

    // Validate path format (should start with /)
    if (!operation.path.startsWith('/')) {
      throw new PatchOperationError('Path must start with "/"', operation)
    }

    // Validate operation-specific requirements
    switch (operation.op) {
      case 'add':
      case 'replace':
      case 'test':
        if (operation.value === undefined) {
          throw new PatchOperationError(`"${operation.op}" operation requires "value" field`, operation)
        }
        break
      case 'move':
      case 'copy':
        if (!operation.from) {
          throw new PatchOperationError(`"${operation.op}" operation requires "from" field`, operation)
        }
        if (!operation.from.startsWith('/')) {
          throw new PatchOperationError('From path must start with "/"', operation)
        }
        break
      case 'remove':
        // Remove operations only need path, no additional validation needed
        break
    }

    // Validate path doesn't contain dangerous characters
    this.validatePath(operation.path)
    if (operation.from) {
      this.validatePath(operation.from)
    }
  }

  /**
   * Validate JSON Pointer path format and security
   * @private
   * @param path - The JSON Pointer path to validate
   */
  private validatePath(path: string): void {
    // Check for path traversal attempts
    if (path.includes('..') || path.includes('//')) {
      throw new PatchOperationError(`Invalid path format: ${path}`, {} as PatchOperation)
    }

    // Validate path components don't contain dangerous patterns
    const segments = path.split('/').slice(1) // Remove first empty segment
    for (const segment of segments) {
      if (segment.includes('$') || segment.includes(';') || segment.includes('--')) {
        throw new PatchOperationError(`Potentially dangerous path segment: ${segment}`, {} as PatchOperation)
      }
    }
  }
}

/**
 * Create a patch operation for the specified table and record
 *
 * @template R - Raw database record type (with RecordId and Date objects)
 * @template T - Processed/serializable type (with string fields)
 * @param connectionProvider - Database connection provider
 * @param table - The SurrealDB table containing the record
 * @param targetId - The ID of the record to patch
 * @param operations - Initial patch operations to apply
 * @param options - Optional query options for controlling behavior
 * @returns A new PatchQL instance
 * @example
 * const patchedPost = await patch(connectionProvider, 'posts', 'post:456', [
 *   { op: 'replace', path: '/title', value: 'Updated Title' },
 *   { op: 'add', path: '/tags/-', value: 'new-tag' }
 * ])
 *   .map(mapPost)
 *   .execute()
 */
export function patch<R extends { id: RecordId }, T = R>(
  connectionProvider: ConnectionProvider,
  table: SurrealDbTable,
  targetId: string | RecordId,
  operations: PatchOperation[],
  options?: QueryOptions,
): PatchQL<R, T> {
  return new PatchQL<R, T>(connectionProvider, table, targetId, operations, options || {})
}
