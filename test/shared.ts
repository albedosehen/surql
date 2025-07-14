import type { ConnectionProvider } from '../src/crud/base.ts'
import type { Surreal } from 'surrealdb'
import { RecordId } from 'surrealdb'

/**
 * Shared test utilities for write operations
 */

// Mock connection provider for testing
export const mockConnectionProvider: ConnectionProvider = {
	getConnection: () =>
		Promise.resolve({
			query: <T>() => Promise.resolve([]) as Promise<T>,
			close: () => Promise.resolve(),
		} as unknown as Surreal),
}

// Test table for queries
export const testTable = 'users'

// Test data types
export interface TestUser {
	id: string
	username: string
	email: string
	active: boolean
	created_at: string
}

export interface TestUserRaw {
	id: RecordId
	username: string
	email: string
	active: boolean
	created_at: Date
}

/**
 * Create a mock connection stub that returns the provided data
 * @param mockData - The data to return from queries
 * @returns Connection stub function
 */
export function createMockConnectionStub(mockData: unknown[]) {
	return () =>
		Promise.resolve({
			query: () => Promise.resolve([mockData]),
			close: () => Promise.resolve(),
		} as unknown as Surreal)
}

/**
 * Create a mock connection stub that returns empty results
 * @returns Connection stub function that returns empty results
 */
export function createEmptyMockConnectionStub() {
	return () =>
		Promise.resolve({
			query: () => Promise.resolve([[]]),
			close: () => Promise.resolve(),
		} as unknown as Surreal)
}

/**
 * Standard test user mapper function
 * @param raw - Raw test user data
 * @returns Mapped test user
 */
export function mapTestUser(raw: TestUserRaw): TestUser {
	return {
		id: raw.id.toString().replace(/⟨(.+?)⟩/g, '$1'),
		username: raw.username,
		email: raw.email,
		active: raw.active,
		created_at: raw.created_at.toISOString(),
	}
}

/**
 * Create standard test user raw data
 * @param overrides - Properties to override in the test data
 * @returns TestUserRaw object
 */
export function createTestUserRaw(overrides: Partial<TestUserRaw> = {}): TestUserRaw {
	return {
		id: new RecordId('users', '123'),
		username: 'testuser',
		email: 'test@example.com',
		active: true,
		created_at: new Date(),
		...overrides,
	}
}

/**
 * Capture console warnings during test execution
 * @param testFn - Test function to execute
 * @returns Object containing the warning message and test result
 */
export async function captureConsoleWarnings<T>(testFn: () => Promise<T>): Promise<{ warning: string; result: T }> {
	const originalWarn = console.warn
	let warningMessage = ''
	console.warn = (message: string) => {
		warningMessage = message
	}

	try {
		const result = await testFn()
		return { warning: warningMessage, result }
	} finally {
		console.warn = originalWarn
	}
}
