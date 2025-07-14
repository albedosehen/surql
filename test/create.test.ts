import { assert, assertEquals, assertRejects } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { stub } from '@std/testing/mock'
import { create, CreateQL } from '../src/crud/write.ts'
import { RecordId } from 'surrealdb'
import {
	captureConsoleWarnings,
	createEmptyMockConnectionStub,
	createMockConnectionStub,
	createTestUserRaw,
	mapTestUser,
	mockConnectionProvider,
	testTable,
	type TestUser,
	type TestUserRaw,
} from './shared.ts'

describe('CreateQL', () => {
	describe('constructor', () => {
		it('should create a new CreateQL instance', () => {
			const createQL = new CreateQL(mockConnectionProvider, testTable, { username: 'test' })
			assert(createQL instanceof CreateQL)
		})

		it('should accept custom context', () => {
			const createQL = new CreateQL(mockConnectionProvider, testTable, { username: 'test' })
			assert(createQL instanceof CreateQL)
		})
	})

	describe('execute()', () => {
		it('should execute create operation and return Promise<T>', async () => {
			const mockData = [createTestUserRaw({
				username: 'puffin123',
				email: 'puffin@example.com',
			})]

			const connectionStub = stub(mockConnectionProvider, 'getConnection', createMockConnectionStub(mockData))

			try {
				const createQL = create<TestUserRaw, TestUser>(mockConnectionProvider, testTable, {
					username: 'puffin123',
					email: 'puffin@example.com',
					active: true,
				})
					.map(mapTestUser)

				const result = await createQL.execute()

				assertEquals(result.id, 'users:123')
				assertEquals(result.username, 'puffin123')
			} finally {
				connectionStub.restore()
			}
		})

		it('should show console warning when no mapper provided with T = R defaults', async () => {
			const mockData = [createTestUserRaw({ username: 'test' })]
			const connectionStub = stub(mockConnectionProvider, 'getConnection', createMockConnectionStub(mockData))

			try {
				const { warning } = await captureConsoleWarnings(async () => {
					const createQL = create<TestUserRaw>(mockConnectionProvider, testTable, { username: 'test' })
					return await createQL.execute()
				})

				assert(warning.includes('Raw database types (RecordId, Date) will be returned'))
			} finally {
				connectionStub.restore()
			}
		})

		it('should throw error when no records returned', async () => {
			const connectionStub = stub(mockConnectionProvider, 'getConnection', createEmptyMockConnectionStub())

			try {
				const createQL = create<TestUserRaw, TestUser>(mockConnectionProvider, testTable, { username: 'test' })
					.map(mapTestUser)

				await assertRejects(
					() => createQL.execute(),
					Error,
					'Create operation returned no records',
				)
			} finally {
				connectionStub.restore()
			}
		})

		it('should work without explicit T type parameter and return raw types', async () => {
			const mockRecordId = new RecordId('users', '123')
			const mockData = [createTestUserRaw({
				id: mockRecordId,
				username: 'puffin123',
				email: 'puffin@example.com',
			})]

			const connectionStub = stub(mockConnectionProvider, 'getConnection', createMockConnectionStub(mockData))

			try {
				const createQL = create<TestUserRaw>(mockConnectionProvider, testTable, {
					username: 'puffin123',
					email: 'puffin@example.com',
					active: true,
				})

				const result = await createQL.execute()

				assertEquals(result.id, mockRecordId) // Should be RecordId, not string
				assertEquals(result.username, 'puffin123')
				assert(result.created_at instanceof Date) // Should be Date, not string
			} finally {
				connectionStub.restore()
			}
		})

		it('should maintain backward compatibility with explicit mapping', async () => {
			const mockData = [createTestUserRaw({
				username: 'puffin123',
				email: 'puffin@example.com',
			})]

			const connectionStub = stub(mockConnectionProvider, 'getConnection', createMockConnectionStub(mockData))

			try {
				const createQL = create<TestUserRaw, TestUser>(mockConnectionProvider, testTable, {
					username: 'puffin123',
					email: 'puffin@example.com',
					active: true,
				})
					.map(mapTestUser)

				const result = await createQL.execute()

				assertEquals(typeof result.id, 'string') // Should be string when mapped
				assertEquals(result.id, 'users:123')
				assertEquals(typeof result.created_at, 'string') // Should be string when mapped
			} finally {
				connectionStub.restore()
			}
		})
	})

	describe('withContext()', () => {
		it('should return this for method chaining', () => {
			const createQL = create(mockConnectionProvider, testTable, { username: 'test' })
			const result = createQL.withContext('test-context')

			assertEquals(result, createQL)
		})
	})
})
