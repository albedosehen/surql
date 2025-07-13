import type { RecordId } from 'surrealdb'
import {
	type Condition,
	type ConnectionProvider,
	Op,
	type OrderBy,
	QueryBuilder,
	type QueryOptions,
	SortDirection,
} from './base.ts'
import type { SurrealDbTable } from './types.ts'

/**
 * A fluent and object-style query builder for SELECT operations using SurrealDB.
 *
 * This class allows you to construct complex queries using a fluent interface,
 * supporting WHERE conditions, ORDER BY clauses, LIMIT/OFFSET pagination,
 * and field selection. It also provides methods for executing the query and
 * mapping results to a specified type.
 *
 * @template R - Raw database record type (with RecordId and Date objects)
 * @template T - Processed/serializable type (with string fields)
 */
export class ReadQL<R extends { id: RecordId }, T = unknown> extends QueryBuilder<R, T> {
	private conditions: Condition[] = []
	private orderByConfig: OrderBy[] = []
	private limitValue?: number
	private offsetValue?: number
	private selectFields: string[] = []
	private whereObject?: Record<string, unknown>

	/**
	 * Create a new query builder for the specified table
	 *
	 * @param connectionProvider - Database connection provider
	 * @param table - The SurrealDB table to query
	 * @param options - Query options for controlling behavior
	 * @return - A new ReadQL instance
	 * @example
	 * const usersQuery = query('users');             // Creates a new ReadQL instance for the 'users' table
	 * await usersQuery
	 *   .where({ status: 'Active' })                 // Adds a WHERE condition
	 *   .orderBy('created_at', SortDirection.DESC)   // Orders results by creation date
	 *   .limit(10)                                   // Limits results to 10 records
	 *   .execute()                                   // Executes the query
	 */
	constructor(connectionProvider: ConnectionProvider, table: SurrealDbTable, options: QueryOptions = {}) {
		super(connectionProvider, table, options)
	}

	/**
	 * Add a WHERE condition (Object-Style)
	 *
	 * @param conditions - Object with field-value pairs
	 * @returns - The query builder instance
	 * @example
	 * query('users').where({ status: 'Active', preferences.privacy.mode: 'Named' }); // Matches users with status 'Active' and privacy mode 'Named'
	 * query('users').where({ active: true, role: 'admin' });                         // Matches active admins
	 */
	where(conditions: Record<string, unknown>): this

	/**
	 * Add a WHERE condition (Fluent-Style)
	 *
	 * @param field - Field name
	 * @param operator - Comparison operator
	 * @param value - Value to compare against
	 * @param operator - The comparison operator (EQUALS, CONTAINS, LIKE, etc.)
	 * @returns - The query builder instance
	 * @example
	 * query('users').where('username', Operator.EQUALS, 'puffin123');              // Matches users with username 'puffin123'
	 * query('users').where('preferences.privacy.mode', Operator.EQUALS, 'Named');  // Matches users with privacy mode 'Named'
	 */
	where(field: string, operator: Op, value: unknown): this

	/**
	 * Add a WHERE condition using either an Object or Fluent style queries
	 *
	 * @param fieldOrConditions - Field name or object with field-value pairs
	 * @param operator - Comparison operator (optional, used in fluent style)
	 * @param value - Value to compare against (optional, used in fluent style)
	 * @returns - The query builder instance
	 * @example
	 * query('users').where({ status: 'Active' });                // Object style: Matches users with status 'Active'
	 * query('users').where('status', Operator.EQUALS, 'Active'); // Fluent style: Matches users with status 'Active'
	 */
	where(fieldOrConditions: string | Record<string, unknown>, operator?: Op, value?: unknown): this {
		if (typeof fieldOrConditions === 'string' && operator !== undefined && value !== undefined) {
			// Fluent style: where(field, operator, value)
			this.conditions.push({ field: fieldOrConditions, operator, value })
		} else if (typeof fieldOrConditions === 'object') {
			// Object style: where({ field1: value1, field2: value2 })
			this.whereObject = { ...this.whereObject, ...fieldOrConditions }
		}
		return this
	}

	/**
	 * Add WHERE condition with equals operator (shorthand)
	 *
	 * @param field - Field name to filter on
	 * @param value - Value to compare against
	 * @returns - The query builder instance
	 * @example
	 * query('users').whereEquals('username', 'puffin123'); // Matches users with username 'puffin123'
	 */
	whereEquals(field: string, value: unknown): this {
		return this.where(field, Op.EQUALS, value)
	}

	/**
	 * Add a CONTAINS filter for arrays or objects
	 *
	 * @param field - Field name to filter on
	 * @param value - Value to check for containment
	 * @returns - The query builder instance
	 * @example
	 * query('users').whereContains('username', 'puffin'); // Matches users with 'puffin' in "testpuffin123"
	 */
	whereContains(field: string, value: unknown): this {
		return this.where(field, Op.CONTAINS, value)
	}

	/**
	 * Add a LIKE filter for pattern matching
	 *
	 * @param field - Field name to filter on
	 * @param pattern - Pattern to match (using SQL LIKE syntax)
	 * @returns - The query builder instance
	 * @example
	 * query('users').whereLike('username', '%puffin%'); // Matches usernames similar to 'puffin'
	 */
	whereLike(field: string, pattern: string): this {
		return this.where(field, Op.LIKE, pattern)
	}

	/**
	 * Add an ORDER BY clause
	 *
	 * @param field - Field name to sort by
	 * @param direction - Sort direction (ASC or DESC)
	 * @returns - The query builder instance
	 * @example
	 * query('users').orderBy('created_at', SortDirection.DESC); // Sorts by created_at in descending order
	 */
	orderBy(field: string, direction: SortDirection = SortDirection.ASC): this {
		this.orderByConfig.push({ field, direction })
		return this
	}

	/**
	 * Set the LIMIT value
	 *
	 * @param limit - Maximum number of records to return
	 * @returns - The query builder instance
	 * @example
	 * query('users').limit(10); // Limits results to 10 records
	 */
	limit(limit: number): this {
		this.limitValue = limit
		return this
	}

	/**
	 * Set the START/OFFSET value
	 *
	 * @param offset - Number of records to skip
	 * @returns - The query builder instance
	 * @example
	 * query('users').offset(5); // Skips the first 5 records
	 */
	offset(offset: number): this {
		this.offsetValue = offset
		return this
	}

	/**
	 * Specify fields to SELECT (if empty, returns all fields)
	 *
	 * @param fields - Field names to include in the result
	 * @returns - The query builder instance
	 * @example
	 * query('users').select('username', 'email'); // Only returns username and email fields
	 */
	select(...fields: string[]): this {
		this.selectFields = fields
		return this
	}

	/**
	 * Build the query string and parameters based on the configured options
	 * @private
	 * @returns - Object containing the query string and parameters
	 */
	private buildQuery(): { query: string; params: Record<string, unknown> } {
		const params: Record<string, unknown> = { ...this.params }

		let query = `SELECT ${this.selectFields.length > 0 ? this.selectFields.join(', ') : '*'} FROM ${this.table}`

		const allConditions: string[] = []

		this.conditions.forEach((condition, index) => {
			const paramName = `c${index}`
			params[paramName] = condition.value
			allConditions.push(`${condition.field} ${condition.operator} $${paramName}`)
		})

		if (this.whereObject && Object.keys(this.whereObject).length > 0) {
			Object.entries(this.whereObject).forEach(([field, value], index) => {
				const paramName = `o${index}`
				params[paramName] = value
				allConditions.push(`${field} = $${paramName}`)
			})
		}

		if (allConditions.length > 0) {
			query += ` WHERE ${allConditions.join(' AND ')}`
		}

		if (this.orderByConfig.length > 0) {
			const orderClauses = this.orderByConfig
				.map((config) => `${config.field} ${config.direction}`)
				.join(', ')

			query += ` ORDER BY ${orderClauses}`
		}

		if (this.limitValue !== undefined) {
			query += ` LIMIT ${this.limitValue}`

			if (this.offsetValue !== undefined) {
				query += ` START ${this.offsetValue}`
			}
		}

		return { query, params }
	}

	/**
	 * Execute the query and return the results as an array
	 * This method validates the mapper, builds the query,
	 * executes it, and maps the results to the specified type.
	 *
	 * @throws - Throws an error if the mapper is not valid
	 * @returns - Promise<T[]> containing mapped result records
	 * @example
	 * const users = await query('users')
	 *   .where({ status: 'Active' })
	 *   .orderBy('created_at', SortDirection.DESC)
	 *   .limit(10)
	 *   .execute()
	 *
	 * @remarks
	 * This method handles the execution of the query and maps the results to the specified type.
	 * It ensures that the mapper is valid before executing the query.
	 * If the mapper is not valid, it throws an error.
	 * The results are mapped to the specified type T, which can be customized by the user.
	 */
	async execute(): Promise<T[]> {
		const { query, params } = this.buildQuery()

		const results = await this.executeQuery<R[]>(query, params)
		const flatResults = Array.isArray(results[0]) ? results[0] : results
		const mappedResult = this.mapResults(flatResults, true)

		// Ensure we always return T[] for ReadQL
		return Array.isArray(mappedResult) ? mappedResult : [mappedResult]
	}

	/**
	 * Execute the query and return the first result or undefined
	 *
	 * @returns - Promise<T | undefined> containing the first mapped record or undefined
	 * @example
	 * const firstUser = await query('users')
	 *   .where({ status: 'Active' })
	 *   .orderBy('created_at', SortDirection.DESC)
	 *   .first() // firstUser will be the first active user record, mapped to type T or undefined if no records found
	 */
	async first(): Promise<T | undefined> {
		const results = await this.limit(1).execute()
		return results[0]
	}
}

/**
 * Create a new query builder for the specified table
 *
 * @param connectionProvider - Database connection provider
 * @param table - The SurrealDB table to query
 * @param options - Optional query options for controlling behavior
 * @returns - A new ReadQL instance
 * @example
 * const usersQuery = query(connectionProvider, 'users');             // Creates a new ReadQL instance for the 'users' table
 * await usersQuery
 *  .where({ status: 'Active' })                 // Adds a WHERE condition
 *  .orderBy('created_at', SortDirection.DESC)   // Orders results by creation date
 *  .limit(10)                                   // Limits results to 10 records
 *  .execute()                                   // Executes the query
 *
 * @remarks
 * This function is a shorthand for creating a new ReadQL instance.
 * It allows you to easily start building queries against a specific SurrealDB table.
 * The options parameter is optional and can be used for controlling warning behavior.
 */
export function query<R extends { id: RecordId }, T = R>(
	connectionProvider: ConnectionProvider,
	table: SurrealDbTable,
	options?: QueryOptions,
): ReadQL<R, T> {
	return new ReadQL<R, T>(connectionProvider, table, options || {})
}
