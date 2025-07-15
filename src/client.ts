import { CreateQL, DeleteQL, UpdateQL } from './crud/write.ts'
import { MergeQL } from './crud/merge.ts'
import { ReadQL } from './crud/read.ts'
import { UpsertQL } from './crud/upsert.ts'
import { type PatchOperation, PatchQL } from './crud/patch.ts'
import { type ConnectionConfig, SurrealConnectionManager } from './auth/connection.ts'
import type { ConnectionProvider, QueryOptions } from './crud/base.ts'
import type { RecordId, Surreal } from 'surrealdb'
import type { SurrealDbTable } from './crud/types.ts'
import type { AuthCredentials, AuthToken, SessionInfo, SignupData } from './auth/types.ts'

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
   * Create a query builder for MERGE operations
   *
   * @template R - Raw database record type (with RecordId and Date objects)
   * @template T - Processed/serializable type (with string fields)
   * @param table - The SurrealDB table containing the record
   * @param targetId - The ID of the record to merge data into
   * @param data - The data to merge with the existing record
   * @param options - Optional query options for controlling behavior
   * @returns A new MergeQL instance
   * @example
   * const updatedUser = await client.merge('users', 'user:123', {
   *   email: 'newemail@example.com',
   *   lastLogin: new Date()
   * })
   *   .map(mapUser)
   *   .execute()
   */
  merge<R extends { id: RecordId }, T = R>(
    table: SurrealDbTable,
    targetId: string | RecordId,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): MergeQL<R, T> {
    return new MergeQL<R, T>(this, table, targetId, data, options)
  }

  /**
   * Create a query builder for PATCH operations using JSON Patch RFC 6902
   *
   * @template R - Raw database record type (with RecordId and Date objects)
   * @template T - Processed/serializable type (with string fields)
   * @param table - The SurrealDB table containing the record
   * @param targetId - The ID of the record to patch
   * @param operations - JSON Patch operations to apply
   * @param options - Optional query options for controlling behavior
   * @returns A new PatchQL instance
   * @example
   * const patchedUser = await client.patch('users', 'user:123', [
   *   { op: 'replace', path: '/email', value: 'updated@example.com' },
   *   { op: 'add', path: '/preferences/theme', value: 'dark' }
   * ])
   *   .addOperation({ op: 'remove', path: '/temporaryField' })
   *   .map(mapUser)
   *   .execute()
   */
  patch<R extends { id: RecordId }, T = R>(
    table: SurrealDbTable,
    targetId: string | RecordId,
    operations: PatchOperation[] = [],
    options: QueryOptions = {},
  ): PatchQL<R, T> {
    return new PatchQL<R, T>(this, table, targetId, operations, options)
  }

  /**
   * Create a query builder for UPSERT operations
   *
   * @template R - Raw database record type (with RecordId and Date objects)
   * @template T - Processed/serializable type (with string fields)
   * @param table - The SurrealDB table to upsert into
   * @param data - The data for the upsert operation
   * @param options - Optional query options for controlling behavior
   * @returns A new UpsertQL instance
   * @example
   * // Upsert with specific ID
   * const savedUser = await client.upsert('users', {
   *   username: 'admin',
   *   email: 'admin@example.com',
   *   role: 'administrator'
   * })
   *   .withId('user:admin')
   *   .map(mapUser)
   *   .execute()
   *
   * // Upsert with conflict detection
   * const user = await client.upsert('users', {
   *   username: 'unique_user',
   *   email: 'user@example.com'
   * })
   *   .onConflict('username')
   *   .map(mapUser)
   *   .execute()
   */
  upsert<R extends { id: RecordId }, T = R>(
    table: SurrealDbTable,
    data: Record<string, unknown>,
    options?: QueryOptions,
  ): UpsertQL<R, T> {
    return new UpsertQL<R, T>(this, table, data, options)
  }

  /**
   * Sign in with user credentials
   *
   * @param credentials - Authentication credentials for different user types
   * @returns Promise<AuthToken> - JWT token with expiration
   * @example
   * // Root user signin
   * const token = await client.signin({
   *   type: 'root',
   *   username: 'root',
   *   password: 'password'
   * })
   *
   * // Scope user signin
   * const token = await client.signin({
   *   type: 'scope',
   *   namespace: 'myapp',
   *   database: 'production',
   *   scope: 'user',
   *   username: 'john@example.com',
   *   password: 'mypassword'
   * })
   */
  async signin(credentials: AuthCredentials): Promise<AuthToken> {
    return this.connectionManager.signin(credentials)
  }

  /**
   * Sign up a new scope user
   *
   * @param data - User registration data including scope information
   * @returns Promise<AuthToken> - JWT token for the new user
   * @example
   * const token = await client.signup({
   *   namespace: 'myapp',
   *   database: 'production',
   *   scope: 'user',
   *   username: 'jane@example.com',
   *   password: 'newpassword',
   *   email: 'jane@example.com',
   *   name: 'Jane Doe'
   * })
   */
  async signup(data: SignupData): Promise<AuthToken> {
    return this.connectionManager.signup(data)
  }

  /**
   * Authenticate with an existing JWT token
   *
   * @param token - JWT token string
   * @returns Promise<SessionInfo> - Current session information
   * @example
   * const sessionInfo = await client.authenticate('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...')
   * console.log('User ID:', sessionInfo.id)
   * console.log('Session expires:', sessionInfo.expires)
   */
  async authenticate(token: string): Promise<SessionInfo> {
    return this.connectionManager.authenticate(token)
  }

  /**
   * Invalidate the current session
   *
   * @returns Promise<void> - Session termination confirmation
   * @example
   * await client.invalidate()
   * console.log('Session ended')
   */
  async invalidate(): Promise<void> {
    return this.connectionManager.invalidate()
  }

  /**
   * Get current authenticated user information
   *
   * @returns Promise<SessionInfo> - Current session details
   * @example
   * const info = await client.info()
   * console.log('Current user:', info.id)
   * console.log('User type:', info.type)
   * console.log('Session expires:', info.expires)
   */
  async info(): Promise<SessionInfo> {
    return this.connectionManager.info()
  }

  /**
   * Check if current session is authenticated
   *
   * @returns boolean - Authentication status
   * @example
   * if (client.isAuthenticated()) {
   *   console.log('User is logged in')
   *   // Perform authenticated operations
   * } else {
   *   console.log('User needs to sign in')
   *   // Redirect to login
   * }
   */
  isAuthenticated(): boolean {
    return this.connectionManager.isAuthenticated()
  }

  /**
   * Get current authentication token
   *
   * @returns AuthToken | null - Current token or null if not authenticated
   * @example
   * const token = client.getCurrentToken()
   * if (token) {
   *   console.log('Token expires:', token.expires)
   *   // Store token for future use
   * }
   */
  getCurrentToken(): AuthToken | null {
    return this.connectionManager.getCurrentToken()
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
