// TODO(@oneiriq): Look into replacing redundant functionality with @std/assert
import { PATTERNS } from '../constants.ts'
import type { AnyFn } from '../crud/types.ts'

export interface AssertInput {
  input: string
  context?: string
}

/**
 * Assert that a string does not contain dangerous SQL patterns
 * @param input The string to validate
 * @param context Optional string to clarify error (e.g. 'HAVING condition')
 */
export function assertNoDangerousSQL({ input, context = 'input', patterns }: AssertInput & { patterns: RegExp[] }) {
  for (const pattern of patterns) {
    if (pattern.test(input)) {
      throw new Error(
        `Dangerous SQL pattern in ${context} matched: ${pattern.toString()} in input: ${JSON.stringify(input)}`,
      )
    }
  }
}

/**
 * Assert that a string is a non-empty string
 * @param input - The input to check
 * @param context - Optional context for the error message
 * @throws Error if the input is not a non-empty string
 */
export function assertNoEmptyString({ input, context = 'input' }: AssertInput) {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw new Error(`Non-empty string in ${context} but received: ${JSON.stringify(input)}`)
  }
}

/**
 * Assert that a value follows specific patterns
 * @param input - The input to check
 * @param context - Optional context for the error message
 * @param patterns - Array of RegExp patterns to check against
 * @throws Error if the input is not a valid host format
 */
export function assertValidFormat({ input, context = 'input', patterns }: AssertInput & { patterns: RegExp[] }) {
  if (!patterns.some((p) => p.test(input))) {
    throw new Error(
      `Invalid format in ${context}: ${input}. Expected format: ${patterns.toString()} but received: ${
        JSON.stringify(input)
      }`,
    )
  }
}

/**
 * Assert that a string is not longer than a specified maximum length
 * @param input - The input to check
 * @param context - Optional context for the error message
 * @param maxLength - The maximum allowed length
 * @throws Error if the input is longer than the maximum length
 */
export function assertMaxStringLength(
  { input, context = 'input', maxLength = 1000 }: AssertInput & { maxLength?: number },
) {
  if (typeof input !== 'string' || input.length > maxLength) {
    throw new Error(`String in ${context} exceeds maximum length of ${maxLength} characters`)
  }
}

/**
 * Assert that a string has a minimum length
 * @param input - The input to check
 * @param context - Optional context for the error message
 * @param minLength - The minimum length the string should have
 */
export function assertMinStringLength(
  { input, context = 'input', minLength = 0 }: AssertInput & { minLength?: number },
) {
  if (typeof input !== 'string' || input.length < minLength) {
    throw new Error(`String in ${context} is shorter than minimum length of ${minLength} characters`)
  }
}

/**
 * Assert that an array is not longer than a specified maximum length
 * @param input - The input to check
 * @param context - Optional context for the error message
 * @param maxLength - The maximum allowed length
 * @throws Error if the input is longer than the maximum length
 */
export function assertMaxArrayLength(
  { input, context = 'array', maxLength = 1000 }: { input: unknown[]; context?: string; maxLength?: number },
) {
  if (!Array.isArray(input)) {
    throw new Error(`Expected array in ${context} but received: ${JSON.stringify(input)}`)
  }
  if (input.length > maxLength) {
    throw new Error(`Array in ${context} exceeds maximum length of ${maxLength} elements`)
  }
}

/**
 * Assert that an array is not shorter than a specified minimum length
 * @param input - The input array to check
 * @param context - Optional context for the error message
 * @param minLength - The minimum length the array should have
 * @throws Error if the input array is shorter than the minimum length
 */
export function assertMinArrayLength(
  { input, context = 'array', minLength = 0 }: { input: unknown[]; context?: string; minLength?: number },
) {
  if (!Array.isArray(input)) {
    throw new Error(`Expected array in ${context} but received: ${JSON.stringify(input)}`)
  }
  if (input.length < minLength) {
    throw new Error(`Array in ${context} is shorter than minimum length of ${minLength} elements`)
  }
}

/**
 * Assert that an array has a specific length
 * @param input - The input array to check
 * @param context - Optional context for the error message
 * @param length - The expected length of the array
 * @throws Error if the input array does not have the expected length
 */
export function assertArrayLength(
  { input, context = 'array', length }: { input: unknown[]; context?: string; length: number },
) {
  if (!Array.isArray(input)) {
    throw new Error(`Expected array in ${context} but received: ${JSON.stringify(input)}`)
  }
  if (input.length !== length) {
    throw new Error(`Array in ${context} has length ${input.length}, expected ${length}`)
  }
}

/**
 * Assert that a value is a string
 * @param input - The input to check
 * @throws Error if the input is not a string
 */
export function assertNumericString(input: string, context = 'input') {
  if (!PATTERNS.NUMERIC_STRING.test(input)) {
    throw new Error(`Expected numeric string in ${context} but received: ${JSON.stringify(input)}`)
  }
}

/**
 * Assert that a number is between a specified minimum and maximum value
 * @param input - The input to check
 * @param min - The minimum allowed value
 * @param max - The maximum allowed value
 * @param context - Optional context for the error message
 * @throws Error if the input is not a number or is outside the specified range
 */
export function assertNumberBetween(input: number | string, min: number, max: number, context = 'input') {
  if (typeof input !== 'number' && typeof input !== 'string') {
    throw new Error(`Expected number in ${context} but received: ${JSON.stringify(input)}`)
  }

  const value = typeof input === 'string' ? parseInt(input) : input
  if (isNaN(value) || value < min || value > max) {
    throw new Error(`Expected number between ${min} and ${max} in ${context} but received: ${JSON.stringify(input)}`)
  }
}

export function assertNonNegativeNumber(input: number, context = 'input') {
  if (typeof input !== 'number' || input < 0) {
    throw new Error(`Expected non-negative number in ${context} but received: ${JSON.stringify(input)}`)
  }
}

export function assertPositiveNumber(input: number, context = 'input') {
  if (typeof input !== 'number' || input <= 0) {
    throw new Error(`Expected positive number in ${context} but received: ${JSON.stringify(input)}`)
  }
}

// Simple common type assertions

/**
 * Assert that a value is a string
 * @param input - The input to check
 * @throws Error if the input is not a string
 */
export function assertString(input: unknown, context = 'input'): asserts input is string {
  if (typeof input !== 'string') {
    throw new Error(`Expected string in ${context} but received: ${JSON.stringify(input)}`)
  }
}

/**
 * Assert that a value is a number
 * @param input - The input to check
 * @throws Error if the input is not a number
 */
export function assertNumber(input: unknown, context = 'input'): asserts input is number {
  if (typeof input !== 'number') {
    throw new Error(`Expected number in ${context} but received: ${JSON.stringify(input)}`)
  }
}

/**
 * Assert that a value is a boolean
 * @param input - The input to check
 * @throws Error if the input is not a boolean
 */
export function assertBoolean(input: unknown, context = 'input'): asserts input is boolean {
  if (typeof input !== 'boolean') {
    throw new Error(`Expected boolean in ${context} but received: ${JSON.stringify(input)}`)
  }
}

/**
 * Assert that a value is a function
 * @param input - The input to check
 * @throws Error if the input is not a function
 */
export function assertFunction(input: unknown, context = 'input'): asserts input is AnyFn {
  if (typeof input !== 'function') {
    throw new Error(`Expected function in ${context} but received: ${JSON.stringify(input)}`)
  }
}

/**
 * Assert that a value is an object (but not null or array)
 * @param input - The input to check
 * @throws Error if the input is not a plain object
 */
export function assertObject(input: unknown, context = 'input'): asserts input is object {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error(`Expected object in ${context} but received: ${JSON.stringify(input)}`)
  }
}

/**
 * Assert that a value is an array
 * @param input - The input to check
 * @throws Error if the input is not an array
 */
export function assertArray(input: unknown, context = 'input'): asserts input is Array<unknown> {
  if (!Array.isArray(input)) {
    throw new Error(`Expected array in ${context} but received: ${JSON.stringify(input)}`)
  }
}

/**
 * Assert that a value is undefined
 * @param input - The input to check
 * @throws Error if the input is not undefined
 */
export function assertUndefined(input: unknown, context = 'input'): asserts input is undefined {
  if (typeof input !== 'undefined') {
    throw new Error(`Expected undefined in ${context} but received: ${JSON.stringify(input)}`)
  }
}

/**
 * Assert that a value is null
 * @param input - The input to check
 * @throws Error if the input is not null
 */
export function assertNull(input: unknown, context = 'input'): asserts input is null {
  if (input !== null) {
    throw new Error(`Expected null in ${context} but received: ${JSON.stringify(input)}`)
  }
}

/**
 * Assert that a value is a symbol
 * @param input - The input to check
 * @throws Error if the input is not a symbol
 */
export function assertSymbol(input: unknown, context = 'input'): asserts input is symbol {
  if (typeof input !== 'symbol') {
    throw new Error(`Expected symbol in ${context} but received: ${JSON.stringify(input)}`)
  }
}

/**
 * Assert that a value is a bigint
 * @param input - The input to check
 * @throws Error if the input is not a bigint
 */
export function assertBigInt(input: unknown, context = 'input'): asserts input is bigint {
  if (typeof input !== 'bigint') {
    throw new Error(`Expected bigint in ${context} but received: ${JSON.stringify(input)}`)
  }
}

/**
 * Assert that a value is a primitive type (string, number, boolean) or null/undefined
 * @param input - The value to check
 */
export function assertPrimitiveOrNullish(
  input: unknown,
  context = 'input',
): asserts input is boolean | number | null | undefined {
  if (
    input !== null &&
    input !== undefined &&
    typeof input !== 'boolean' &&
    typeof input !== 'number'
  ) {
    throw new Error(`Expected null, undefined, boolean, or number in ${context} but received: ${JSON.stringify(input)}`)
  }
}

/**
 * Assert that a number is less than a maximum value
 * @param input - The input to check
 * @param max - The maximum value
 * @param context - The context for the error message
 */
export function assertNumberLessThan(input: number, max: number, context = 'input'): asserts input is number {
  if (typeof input !== 'number' || input >= max) {
    throw new Error(`Expected number less than ${max} in ${context} but received: ${JSON.stringify(input)}`)
  }
}

/**
 * Assert that a number is less than or equal to a maximum value
 * @param input - The input to check
 * @param max - The maximum value
 * @param context - The context for the error message
 */
export function assertNumberLessThanOrEqual(input: number, max: number, context = 'input'): asserts input is number {
  if (typeof input !== 'number' || input > max) {
    throw new Error(`Expected number less than or equal to ${max} in ${context} but received: ${JSON.stringify(input)}`)
  }
}

/**
 * Assert that a number is greater than a minimum value
 * @param input - The input to check
 * @param min - The minimum value
 * @param context - The context for the error message
 */
export function assertNumberGreaterThan(input: number, min: number, context = 'input'): asserts input is number {
  if (typeof input !== 'number' || input <= min) {
    throw new Error(`Expected number greater than ${min} in ${context} but received: ${JSON.stringify(input)}`)
  }
}

/**
 * Assert that a number is greater than or equal to a minimum value
 * @param input - The input to check
 * @param min - The minimum value
 * @param context - The context for the error message
 */
export function assertNumberGreaterThanOrEqual(input: number, min: number, context = 'input'): asserts input is number {
  if (typeof input !== 'number' || input < min) {
    throw new Error(
      `Expected number greater than or equal to ${min} in ${context} but received: ${JSON.stringify(input)}`,
    )
  }
}

/**
 * Assert that a string has a maximum number of wildcard characters
 * @param input - The input string to check
 * @param context - The context for the error message
 * @param maxWildcards - The maximum allowed wildcard characters
 */
export function assertMaxWildcards({
  input,
  context = 'input',
  maxWildcards = 50,
}: AssertInput & { maxWildcards?: number }): void {
  const wildcardCount = (input.match(PATTERNS.WILDCARD) || []).length
  if (wildcardCount > maxWildcards) {
    throw new Error(
      `Too many wildcards in ${context}: found ${wildcardCount}, maximum allowed is ${maxWildcards}`,
    )
  }
}

/**
 * Assert that a string is non-sensitive and matches at least one of the given patterns
 * @param input - The input to check
 * @param patterns - The patterns to match against
 * @param context - The context for the error message
 */
export function assertNonSensitiveString(
  input: unknown,
  patterns: RegExp[],
  context = 'input',
): asserts input is string {
  if (typeof input !== 'string' || !patterns.some((pattern) => pattern.test(input))) {
    throw new Error(`Sensitive string match in ${context}. Expected a non-sensitive string but received: <omitted>`)
  }
}
