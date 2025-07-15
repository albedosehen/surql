import { QueryBuilder } from '../crud/base.ts'
import { validateFieldName } from '../utils/validators.ts'
import type { RecordId } from 'surrealdb'

/**
 * Interface for GROUP BY capability
 */
export interface GroupByCapability<T> {
  groupBy(...fields: string[]): T
}

/**
 * Abstract base class that adds GROUP BY capability to QueryBuilder
 */
export abstract class GroupByQueryBuilder<R extends { id: RecordId }, T> extends QueryBuilder<R, T>
  implements GroupByCapability<GroupByQueryBuilder<R, T>> {
  private groupByFields: string[] = []

  /**
   * Add GROUP BY fields to the query
   *
   * @param fields - Field names to group by
   * @returns this - For method chaining
   * @example
   * const results = await query('orders')
   *   .groupBy('customer_id', 'product_category')
   *   .execute()
   */
  groupBy(...fields: string[]): this {
    // Validate field names
    fields.forEach((field) => this.validateFieldName(field))
    this.groupByFields.push(...fields)
    return this
  }

  /**
   * Build the GROUP BY clause for the query
   * @protected
   * @returns GROUP BY clause string or empty string
   */
  protected buildGroupByClause(): string {
    return this.groupByFields.length > 0 ? ` GROUP BY ${this.groupByFields.join(', ')}` : ''
  }

  /**
   * Get current GROUP BY fields
   * @returns Array of GROUP BY field names
   */
  protected getGroupByFields(): string[] {
    return [...this.groupByFields]
  }

  /**
   * Clear GROUP BY clause
   * @returns Current query builder instance for chaining
   */
  clearGroupBy(): this {
    this.groupByFields = []
    return this
  }

  /**
   * Check if query has GROUP BY clause
   * @returns True if GROUP BY fields are defined
   */
  hasGroupBy(): boolean {
    return this.groupByFields.length > 0
  }

  /**
   * Validate field name to prevent injection attacks
   * @param field - Field name to validate
   * @throws Error if field name is invalid
   */
  private validateFieldName(field: string): void {
    const validationResult = validateFieldName(field)
    if (!validationResult.success) throw new Error(validationResult.error)
  }
}
