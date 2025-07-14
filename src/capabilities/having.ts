import { Op, QueryBuilder } from '../crud/base.ts'
import type { RecordId } from 'surrealdb'

/**
 * Interface for HAVING capability
 */
export interface HavingCapability<T> {
  having(condition: string): T
  having(field: string, operator: Op, value: unknown): T
}

/**
 * Abstract base class that adds HAVING capability to QueryBuilder
 */
export abstract class HavingQueryBuilder<R extends { id: RecordId }, T> extends QueryBuilder<R, T>
  implements HavingCapability<HavingQueryBuilder<R, T>> {
  private havingConditions: string[] = []

  /**
   * Add HAVING condition to the query
   *
   * @param conditionOrField - Complete HAVING condition string or field name
   * @param operator - Comparison operator (when using field, operator, value syntax)
   * @param value - Value to compare against (when using field, operator, value syntax)
   * @returns this - For method chaining
   * @example
   * // Direct condition
   * const results = await query('orders')
   *   .groupBy('customer_id')
   *   .having('COUNT(*) > 5')
   *   .execute()
   *
   * // Fluent style
   * const results = await query('sales')
   *   .groupBy('product_id')
   *   .having('SUM(amount)', Op.GREATER_THAN, 1000)
   *   .execute()
   */
  having(conditionOrField: string, operator?: Op, value?: unknown): this {
    if (operator !== undefined && value !== undefined) {
      // Fluent style: having('field', Op.GREATER_THAN, value)
      this.validateFieldName(conditionOrField)
      const paramName = `h${this.havingConditions.length}`
      if ('params' in this && typeof this.params === 'object') {
        ;(this.params as Record<string, unknown>)[paramName] = value
      }
      this.havingConditions.push(`${conditionOrField} ${operator} $${paramName}`)
    } else {
      // Direct condition: having('COUNT(*) > 10')
      this.validateHavingCondition(conditionOrField)
      this.havingConditions.push(conditionOrField)
    }
    return this
  }

  /**
   * Build the HAVING clause for the query
   * @protected
   * @returns HAVING clause string or empty string
   */
  protected buildHavingClause(): string {
    return this.havingConditions.length > 0 ? ` HAVING ${this.havingConditions.join(' AND ')}` : ''
  }

  /**
   * Get current HAVING conditions
   * @returns Array of HAVING condition strings
   */
  protected getHavingConditions(): string[] {
    return [...this.havingConditions]
  }

  /**
   * Clear HAVING clause
   * @returns Current query builder instance for chaining
   */
  clearHaving(): this {
    this.havingConditions = []
    return this
  }

  /**
   * Check if query has HAVING clause
   * @returns True if HAVING conditions are defined
   */
  hasHaving(): boolean {
    return this.havingConditions.length > 0
  }

  /**
   * Validate field name to prevent injection attacks
   * @private
   * @param field - Field name to validate
   */
  private validateFieldName(field: string): void {
    if (typeof field !== 'string' || field.length === 0) {
      throw new Error('Field name must be a non-empty string')
    }

    // Allow alphanumeric characters, underscores, dots, parentheses, asterisk for functions
    const fieldNamePattern = /^[a-zA-Z0-9_.():*-]+$/
    if (!fieldNamePattern.test(field)) {
      throw new Error(
        `Invalid field name: ${field}. Field names can only contain letters, numbers, dots, underscores, colons, hyphens, and parentheses`,
      )
    }

    // Prevent common SQL injection patterns
    const dangerousPatterns = [
      /;/, // Statement terminator
      /--/, // SQL comments
      /\/\*/, // Block comments
      /\*\//, // Block comments
      /\bunion\b/i, // UNION attacks
      /\bselect\b/i, // SELECT injections
      /\binsert\b/i, // INSERT injections
      /\bupdate\b/i, // UPDATE injections
      /\bdelete\b/i, // DELETE injections
      /\bdrop\b/i, // DROP injections
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(field)) {
        throw new Error(`Potentially dangerous field name detected: ${field}`)
      }
    }
  }

  /**
   * Validate HAVING condition to prevent injection attacks
   * @private
   * @param condition - HAVING condition to validate
   */
  private validateHavingCondition(condition: string): void {
    if (typeof condition !== 'string' || condition.length === 0) {
      throw new Error('HAVING condition must be a non-empty string')
    }

    // Check for extremely long conditions that could be DOS attacks
    if (condition.length > 1000) {
      throw new Error('HAVING condition cannot exceed 1000 characters')
    }

    // Prevent dangerous SQL injection patterns in conditions
    const dangerousPatterns = [
      /;.*(?:union|select|insert|update|delete|drop)/i,
      /'\s*(?:union|select|insert|update|delete|drop)/i,
      /"\s*(?:union|select|insert|update|delete|drop)/i,
      /\/\*.*\*\//,
      /--.*$/m,
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(condition)) {
        throw new Error('Potentially dangerous SQL pattern detected in HAVING condition')
      }
    }
  }
}
