import { QueryBuilder } from '../crud/base.ts'
import type { RecordId } from 'surrealdb'

/**
 * Interface for pagination capability
 */
export interface PaginationCapability<T> {
  limit(count: number): T
  offset(count: number): T
  page(pageNumber: number, pageSize: number): T
}

/**
 * Abstract base class that adds pagination capability to QueryBuilder
 */
export abstract class PaginationQueryBuilder<R extends { id: RecordId }, T> extends QueryBuilder<R, T>
  implements PaginationCapability<PaginationQueryBuilder<R, T>> {
  private limitValue?: number
  private offsetValue?: number

  /**
   * Set limit for query results
   *
   * @param count - Maximum number of records to return
   * @returns this - For method chaining
   * @example
   * const results = await query('users')
   *   .limit(10)
   *   .execute()
   */
  limit(count: number): this {
    this.validatePositiveInteger(count, 'limit')
    this.limitValue = count
    return this
  }

  /**
   * Set offset for query results
   *
   * @param count - Number of records to skip
   * @returns this - For method chaining
   * @example
   * const results = await query('users')
   *   .offset(20)
   *   .limit(10)
   *   .execute()
   */
  offset(count: number): this {
    this.validateNonNegativeInteger(count, 'offset')
    this.offsetValue = count
    return this
  }

  /**
   * Set pagination using page number and page size
   *
   * @param pageNumber - Page number (1-based)
   * @param pageSize - Number of records per page
   * @returns this - For method chaining
   * @example
   * const results = await query('users')
   *   .page(2, 10) // Second page, 10 records per page
   *   .execute()
   */
  page(pageNumber: number, pageSize: number): this {
    this.validatePositiveInteger(pageNumber, 'page number')
    this.validatePositiveInteger(pageSize, 'page size')

    // Convert to 0-based offset
    const offset = (pageNumber - 1) * pageSize
    this.offsetValue = offset
    this.limitValue = pageSize
    return this
  }

  /**
   * Build the LIMIT clause for the query
   * @protected
   * @returns LIMIT clause string or empty string
   */
  protected buildLimitClause(): string {
    return this.limitValue !== undefined ? ` LIMIT ${this.limitValue}` : ''
  }

  /**
   * Build the START clause (SurrealDB's equivalent to OFFSET) for the query
   * @protected
   * @returns START clause string or empty string
   */
  protected buildStartClause(): string {
    return this.offsetValue !== undefined ? ` START ${this.offsetValue}` : ''
  }

  /**
   * Build combined pagination clauses
   * @protected
   * @returns Combined START and LIMIT clauses
   */
  protected buildPaginationClauses(): string {
    return this.buildStartClause() + this.buildLimitClause()
  }

  /**
   * Get current limit value
   * @returns Current limit or undefined
   */
  getCurrentLimit(): number | undefined {
    return this.limitValue
  }

  /**
   * Get current offset value
   * @returns Current offset or undefined
   */
  getCurrentOffset(): number | undefined {
    return this.offsetValue
  }

  /**
   * Get current page info (if set via page method)
   * @returns Object with pageNumber, pageSize, and offset, or null if not set via page()
   */
  getCurrentPageInfo(): { pageNumber: number; pageSize: number; offset: number } | null {
    if (this.limitValue !== undefined && this.offsetValue !== undefined) {
      const pageSize = this.limitValue
      const pageNumber = Math.floor(this.offsetValue / pageSize) + 1
      return {
        pageNumber,
        pageSize,
        offset: this.offsetValue,
      }
    }
    return null
  }

  /**
   * Clear pagination settings
   * @returns Current query builder instance for chaining
   */
  clearPagination(): this {
    this.limitValue = undefined
    this.offsetValue = undefined
    return this
  }

  /**
   * Check if query has pagination
   * @returns True if limit or offset is set
   */
  hasPagination(): boolean {
    return this.limitValue !== undefined || this.offsetValue !== undefined
  }

  /**
   * Validate that a number is a positive integer
   * @private
   * @param value - Value to validate
   * @param fieldName - Name of the field for error messages
   */
  private validatePositiveInteger(value: number, fieldName: string): void {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${fieldName} must be a positive integer, got: ${value}`)
    }

    // Reasonable upper limit to prevent resource exhaustion
    if (value > 1000000) {
      throw new Error(`${fieldName} cannot exceed 1,000,000, got: ${value}`)
    }
  }

  /**
   * Validate that a number is a non-negative integer
   * @private
   * @param value - Value to validate
   * @param fieldName - Name of the field for error messages
   */
  private validateNonNegativeInteger(value: number, fieldName: string): void {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${fieldName} must be a non-negative integer, got: ${value}`)
    }

    // Reasonable upper limit to prevent resource exhaustion
    if (value > 10000000) {
      throw new Error(`${fieldName} cannot exceed 10,000,000, got: ${value}`)
    }
  }
}
