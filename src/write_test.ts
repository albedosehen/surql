import { assert, assertEquals, assertRejects } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { stub } from '@std/testing/mock'
import { create, CreateQL, DeleteQL, remove, update, UpdateQL } from './write.ts'
import type { ConnectionProvider } from './base.ts'
import type { Surreal } from 'surrealdb'
import { RecordId } from 'surrealdb'
import { recordIdToString } from './utils.ts'

// Mock connection provider for testing
const mockConnectionProvider: ConnectionProvider = {
	getConnection: () =>
		Promise.resolve({
			query: <T>() => Promise.resolve([]) as Promise<T>,
			close: () => Promise.resolve(),
		} as unknown as Surreal),
}

// Test table for queries
const testTable = 'users'

// Test data types
interface TestUser {
	id: string
	username: string
	email: string
	active: boolean
	created_at: string
}

interface TestUserRaw {
	id: RecordId
	username: string
	email: string
	active: boolean
	created_at: Date
}

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
			const mockRecordId = new RecordId('users', '123')
			const mockData = [
				{ id: mockRecordId, username: 'puffin123', email: 'puffin@example.com', active: true, created_at: new Date() },
			]

			const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
				Promise.resolve({
					query: () => Promise.resolve([mockData]),
					close: () => Promise.resolve(),
				} as unknown as Surreal))

			try {
				const createQL = create<TestUserRaw, TestUser>(mockConnectionProvider, testTable, {
					username: 'puffin123',
					email: 'puffin@example.com',
					active: true,
				})
					.map((raw: TestUserRaw) => ({
						id: recordIdToString(raw.id),
						username: raw.username,
						email: raw.email,
						active: raw.active,
						created_at: raw.created_at.toISOString(),
					}))

				const result = await createQL.execute()

				assertEquals(result.id, 'users:123')
				assertEquals(result.username, 'puffin123')
			} finally {
				connectionStub.restore()
			}
		})

		it('should show console warning when no mapper provided with T = R defaults', async () => {
			const mockRecordId = new RecordId('users', '123')
			const mockData = [
				{ id: mockRecordId, username: 'test', email: 'test@example.com', active: true, created_at: new Date() },
			]

			const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
				Promise.resolve({
					query: () => Promise.resolve([mockData]),
					close: () => Promise.resolve(),
				} as unknown as Surreal))

			// Mock console.warn to capture warnings
			const originalWarn = console.warn
			let warningMessage = ''
			console.warn = (message: string) => {
				warningMessage = message
			}

			try {
				const createQL = create<TestUserRaw>(mockConnectionProvider, testTable, { username: 'test' })
				await createQL.execute()

				// No warning expected since operation fails before mapper validation
				assert(warningMessage.includes('Raw database types (RecordId, Date) will be returned'))
			} finally {
				connectionStub.restore()
				console.warn = originalWarn
			}
		})

		it('should throw error when no records returned', async () => {
			const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
				Promise.resolve({
					query: () => Promise.resolve([[]]),
					close: () => Promise.resolve(),
				} as unknown as Surreal))

			try {
				const createQL = create<TestUserRaw, TestUser>(mockConnectionProvider, testTable, { username: 'test' })
					.map((raw: TestUserRaw) => ({
						id: recordIdToString(raw.id),
						username: raw.username,
						email: raw.email,
						active: raw.active,
						created_at: raw.created_at.toISOString(),
					}))

				await assertRejects(
					() => createQL.execute(),
					Error,
					'Create operation returned no records',
				)
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

describe('UpdateQL', () => {
	describe('constructor', () => {
		it('should create a new UpdateQL instance', () => {
			const updateQL = new UpdateQL(mockConnectionProvider, testTable, 'users:123', { username: 'updated' })
			assert(updateQL instanceof UpdateQL)
		})

		it('should accept RecordId parameter', () => {
			const recordId = new RecordId('users', '123')
			const updateQL = new UpdateQL(mockConnectionProvider, testTable, recordId, { username: 'updated' })
			assert(updateQL instanceof UpdateQL)
		})
	})

	describe('replace()', () => {
		it('should return this for method chaining', () => {
			const updateQL = update(mockConnectionProvider, testTable, 'users:123', { username: 'test' })
			const result = updateQL.replace()

			assertEquals(result, updateQL)
		})
	})

	describe('execute()', () => {
		it('should execute update operation and return Promise<T>', async () => {
			const mockRecordId = new RecordId('users', '123')
			const mockData = [
				{
					id: mockRecordId,
					username: 'updated_puffin',
					email: 'puffin@example.com',
					active: true,
					created_at: new Date(),
				},
			]

			const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
				Promise.resolve({
					query: () => Promise.resolve([mockData]),
					close: () => Promise.resolve(),
				} as unknown as Surreal))

			try {
				const updateQL = update<TestUserRaw, TestUser>(mockConnectionProvider, testTable, 'users:123', {
					username: 'updated_puffin',
				})
					.map((raw: TestUserRaw) => ({
						id: recordIdToString(raw.id),
						username: raw.username,
						email: raw.email,
						active: raw.active,
						created_at: raw.created_at.toISOString(),
					}))

				const result = await updateQL.execute()

				assertEquals(result.id, 'users:123')
				assertEquals(result.username, 'updated_puffin')
			} finally {
				connectionStub.restore()
			}
		})

		it('should support replace mode', async () => {
			const mockRecordId = new RecordId('users', '123')
			const mockData = [
				{
					id: mockRecordId,
					username: 'replaced_user',
					email: 'new@example.com',
					active: false,
					created_at: new Date(),
				},
			]

			const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
				Promise.resolve({
					query: () => Promise.resolve([mockData]),
					close: () => Promise.resolve(),
				} as unknown as Surreal))

			try {
				const updateQL = update<TestUserRaw, TestUser>(mockConnectionProvider, testTable, 'users:123', {
					username: 'replaced_user',
					email: 'new@example.com',
					active: false,
				})
					.replace()
					.map((raw: TestUserRaw) => ({
						id: recordIdToString(raw.id),
						username: raw.username,
						email: raw.email,
						active: raw.active,
						created_at: raw.created_at.toISOString(),
					}))

				const result = await updateQL.execute()

				assertEquals(result.username, 'replaced_user')
				assertEquals(result.email, 'new@example.com')
				assertEquals(result.active, false)
			} finally {
				connectionStub.restore()
			}
		})

		it('should throw error when no records returned', async () => {
			const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
				Promise.resolve({
					query: () => Promise.resolve([[]]),
					close: () => Promise.resolve(),
				} as unknown as Surreal))

			try {
				const updateQL = update<TestUserRaw, TestUser>(mockConnectionProvider, testTable, 'users:999', {
					username: 'test',
				})
					.map((raw: TestUserRaw) => ({
						id: recordIdToString(raw.id),
						username: raw.username,
						email: raw.email,
						active: raw.active,
						created_at: raw.created_at.toISOString(),
					}))

				await assertRejects(
					() => updateQL.execute(),
					Error,
					'Update operation returned no records',
				)
			} finally {
				connectionStub.restore()
			}
		})
	})

})

describe('DeleteQL', () => {
	describe('constructor', () => {
		it('should create a new DeleteQL instance', () => {
			const deleteQL = new DeleteQL(mockConnectionProvider, testTable, 'users:123')
			assert(deleteQL instanceof DeleteQL)
		})

		it('should accept RecordId parameter', () => {
			const recordId = new RecordId('users', '123')
			const deleteQL = new DeleteQL(mockConnectionProvider, testTable, recordId)
			assert(deleteQL instanceof DeleteQL)
		})
	})

	describe('execute()', () => {
		it('should execute delete operation and return Promise<T>', async () => {
			const mockRecordId = new RecordId('users', '123')
			const mockData = [
				{
					id: mockRecordId,
					username: 'deleted_user',
					email: 'deleted@example.com',
					active: false,
					created_at: new Date(),
				},
			]

			const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
				Promise.resolve({
					query: () => Promise.resolve([mockData]),
					close: () => Promise.resolve(),
				} as unknown as Surreal))

			try {
				const deleteQL = remove<TestUserRaw, TestUser>(mockConnectionProvider, testTable, 'users:123')
					.map((raw: TestUserRaw) => ({
						id: recordIdToString(raw.id),
						username: raw.username,
						email: raw.email,
						active: raw.active,
						created_at: raw.created_at.toISOString(),
					}))

				const result = await deleteQL.execute()

				assertEquals(result.id, 'users:123')
				assertEquals(result.username, 'deleted_user')
			} finally {
				connectionStub.restore()
			}
		})

		it('should throw error when no records returned', async () => {
			const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
				Promise.resolve({
					query: () => Promise.resolve([[]]),
					close: () => Promise.resolve(),
				} as unknown as Surreal))

			try {
				const deleteQL = remove<TestUserRaw, TestUser>(mockConnectionProvider, testTable, 'users:999')
					.map((raw: TestUserRaw) => ({
						id: recordIdToString(raw.id),
						username: raw.username,
						email: raw.email,
						active: raw.active,
						created_at: raw.created_at.toISOString(),
					}))

				await assertRejects(
					() => deleteQL.execute(),
					Error,
					'Delete operation returned no records',
				)
			} finally {
				connectionStub.restore()
			}
		})
	})

})

describe('Factory functions', () => {
	describe('create()', () => {
		it('should create a CreateQL instance', () => {
			const createQL = create(mockConnectionProvider, testTable, { username: 'test' })
			assert(createQL instanceof CreateQL)
		})

		it('should accept custom context', () => {
			const createQL = create(mockConnectionProvider, testTable, { username: 'test' })
			assert(createQL instanceof CreateQL)
		})
	})

	describe('update()', () => {
		it('should create an UpdateQL instance', () => {
			const updateQL = update(mockConnectionProvider, testTable, 'users:123', { username: 'updated' })
			assert(updateQL instanceof UpdateQL)
		})

		it('should accept custom context', () => {
			const updateQL = update(mockConnectionProvider, testTable, 'users:123', { username: 'updated' })
			assert(updateQL instanceof UpdateQL)
		})
	})

	describe('remove()', () => {
		it('should create a DeleteQL instance', () => {
			const deleteQL = remove(mockConnectionProvider, testTable, 'users:123')
			assert(deleteQL instanceof DeleteQL)
		})

		it('should accept custom context', () => {
			const deleteQL = remove(mockConnectionProvider, testTable, 'users:123')
			assert(deleteQL instanceof DeleteQL)
		})
	})

	describe('T = R defaults (new functionality)', () => {
		describe('create() with T = R', () => {
			it('should work without explicit T type parameter and return raw types', async () => {
				const mockRecordId = new RecordId('users', '123')
				const mockData = [
					{
						id: mockRecordId,
						username: 'puffin123',
						email: 'puffin@example.com',
						active: true,
						created_at: new Date(),
					},
				]

				const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
					Promise.resolve({
						query: () => Promise.resolve([mockData]),
						close: () => Promise.resolve(),
					} as unknown as Surreal))

				try {
					// Using create with explicit R type but T = R default
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

			it('should show console warning when no mapper provided but type specified', async () => {
				const mockRecordId = new RecordId('users', '123')
				const mockData = [
					{
						id: mockRecordId,
						username: 'puffin123',
						email: 'puffin@example.com',
						active: true,
						created_at: new Date(),
					},
				]

				const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
					Promise.resolve({
						query: () => Promise.resolve([mockData]),
						close: () => Promise.resolve(),
					} as unknown as Surreal))

				// Mock console.warn to capture warnings
				const originalWarn = console.warn
				let warningMessage = ''
				console.warn = (message: string) => {
					warningMessage = message
				}

				try {
					// Explicitly specify different T type but don't provide mapper
					const createQL = create<TestUserRaw, TestUser>(mockConnectionProvider, testTable, {
						username: 'puffin123',
						email: 'puffin@example.com',
						active: true,
					})
					await createQL.execute()

					// No warning expected since operation fails before mapper validation
					assert(warningMessage.includes('Raw database types (RecordId, Date) will be returned'))
				} finally {
					connectionStub.restore()
					console.warn = originalWarn
				}
			})

			it('should maintain backward compatibility with explicit mapping', async () => {
				const mockRecordId = new RecordId('users', '123')
				const mockData = [
					{
						id: mockRecordId,
						username: 'puffin123',
						email: 'puffin@example.com',
						active: true,
						created_at: new Date(),
					},
				]

				const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
					Promise.resolve({
						query: () => Promise.resolve([mockData]),
						close: () => Promise.resolve(),
					} as unknown as Surreal))

				try {
					// Explicit mapping should still work as before
					const createQL = create<TestUserRaw, TestUser>(mockConnectionProvider, testTable, {
						username: 'puffin123',
						email: 'puffin@example.com',
						active: true,
					})
						.map((raw: TestUserRaw) => ({
							id: recordIdToString(raw.id),
							username: raw.username,
							email: raw.email,
							active: raw.active,
							created_at: raw.created_at.toISOString(),
						}))

					const result = await createQL.execute()

					assertEquals(typeof result.id, 'string') // Should be string when mapped
					assertEquals(result.id, 'users:123')
					assertEquals(typeof result.created_at, 'string') // Should be string when mapped
				} finally {
					connectionStub.restore()
				}
			})
		})

		describe('update() with T = R', () => {
			it('should work without explicit T type parameter and return raw types', async () => {
				const mockRecordId = new RecordId('users', '123')
				const mockData = [
					{
						id: mockRecordId,
						username: 'updated_puffin',
						email: 'puffin@example.com',
						active: true,
						created_at: new Date(),
					},
				]

				const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
					Promise.resolve({
						query: () => Promise.resolve([mockData]),
						close: () => Promise.resolve(),
					} as unknown as Surreal))

				try {
					const updateQL = update<TestUserRaw>(mockConnectionProvider, testTable, 'users:123', {
						username: 'updated_puffin',
					})

					const result = await updateQL.execute()

					assertEquals(result.id, mockRecordId) // Should be RecordId, not string
					assertEquals(result.username, 'updated_puffin')
					assert(result.created_at instanceof Date) // Should be Date, not string
				} finally {
					connectionStub.restore()
				}
			})

			it('should work in replace mode with T = R defaults', async () => {
				const mockRecordId = new RecordId('users', '123')
				const mockData = [
					{
						id: mockRecordId,
						username: 'replaced_user',
						email: 'new@example.com',
						active: false,
						created_at: new Date(),
					},
				]

				const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
					Promise.resolve({
						query: () => Promise.resolve([mockData]),
						close: () => Promise.resolve(),
					} as unknown as Surreal))

				try {
					const updateQL = update<TestUserRaw>(mockConnectionProvider, testTable, 'users:123', {
						username: 'replaced_user',
						email: 'new@example.com',
						active: false,
					})
						.replace()

					const result = await updateQL.execute()

					assertEquals(result.id, mockRecordId) // Should be RecordId
					assertEquals(result.username, 'replaced_user')
					assertEquals(result.email, 'new@example.com')
					assertEquals(result.active, false)
					assert(result.created_at instanceof Date) // Should be Date
				} finally {
					connectionStub.restore()
				}
			})
		})

		describe('remove() with T = R', () => {
			it('should work without explicit T type parameter and return raw types', async () => {
				const mockRecordId = new RecordId('users', '123')
				const mockData = [
					{
						id: mockRecordId,
						username: 'deleted_user',
						email: 'deleted@example.com',
						active: false,
						created_at: new Date(),
					},
				]

				const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
					Promise.resolve({
						query: () => Promise.resolve([mockData]),
						close: () => Promise.resolve(),
					} as unknown as Surreal))

				try {
					const deleteQL = remove<TestUserRaw>(mockConnectionProvider, testTable, 'users:123')

					const result = await deleteQL.execute()

					assertEquals(result.id, mockRecordId) // Should be RecordId, not string
					assertEquals(result.username, 'deleted_user')
					assert(result.created_at instanceof Date) // Should be Date, not string
				} finally {
					connectionStub.restore()
				}
			})

			it('should maintain backward compatibility with explicit mapping', async () => {
				const mockRecordId = new RecordId('users', '123')
				const mockData = [
					{
						id: mockRecordId,
						username: 'deleted_user',
						email: 'deleted@example.com',
						active: false,
						created_at: new Date(),
					},
				]

				const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
					Promise.resolve({
						query: () => Promise.resolve([mockData]),
						close: () => Promise.resolve(),
					} as unknown as Surreal))

				try {
					// Explicit mapping should still work as before
					const deleteQL = remove<TestUserRaw, TestUser>(mockConnectionProvider, testTable, 'users:123')
						.map((raw: TestUserRaw) => ({
							id: recordIdToString(raw.id),
							username: raw.username,
							email: raw.email,
							active: raw.active,
							created_at: raw.created_at.toISOString(),
						}))

					const result = await deleteQL.execute()

					assertEquals(typeof result.id, 'string') // Should be string when mapped
					assertEquals(result.id, 'users:123')
					assertEquals(typeof result.created_at, 'string') // Should be string when mapped
				} finally {
					connectionStub.restore()
				}
			})
		})

		describe('Error handling with T = R defaults', () => {
			it('should handle no records returned for create with warning', async () => {
				const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
					Promise.resolve({
						query: () => Promise.resolve([[]]),
						close: () => Promise.resolve(),
					} as unknown as Surreal))

				// Mock console.warn to capture warnings
				const originalWarn = console.warn
				let warningMessage = ''
				console.warn = (message: string) => {
					warningMessage = message
				}

				try {
					const createQL = create<TestUserRaw>(mockConnectionProvider, testTable, { username: 'test' })

					await assertRejects(
						() => createQL.execute(),
						Error,
						'Create operation returned no records',
					)

					assertEquals(warningMessage, '')
				} finally {
					connectionStub.restore()
					console.warn = originalWarn
				}
			})

			it('should handle no records returned for update with warning', async () => {
				const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
					Promise.resolve({
						query: () => Promise.resolve([[]]),
						close: () => Promise.resolve(),
					} as unknown as Surreal))

				// Mock console.warn to capture warnings
				const originalWarn = console.warn
				let warningMessage = ''
				console.warn = (message: string) => {
					warningMessage = message
				}

				try {
					const updateQL = update<TestUserRaw>(mockConnectionProvider, testTable, 'users:999', {
						username: 'test',
					})

					await assertRejects(
						() => updateQL.execute(),
						Error,
						'Update operation returned no records',
					)

					assertEquals(warningMessage, '')
				} finally {
					connectionStub.restore()
					console.warn = originalWarn
				}
			})

			it('should handle no records returned for remove with warning', async () => {
				const connectionStub = stub(mockConnectionProvider, 'getConnection', () =>
					Promise.resolve({
						query: () => Promise.resolve([[]]),
						close: () => Promise.resolve(),
					} as unknown as Surreal))

				// Mock console.warn to capture warnings
				const originalWarn = console.warn
				let warningMessage = ''
				console.warn = (message: string) => {
					warningMessage = message
				}

				try {
					const deleteQL = remove<TestUserRaw>(mockConnectionProvider, testTable, 'users:999')

					await assertRejects(
						() => deleteQL.execute(),
						Error,
						'Delete operation returned no records',
					)

					assertEquals(warningMessage, '')
				} finally {
					connectionStub.restore()
					console.warn = originalWarn
				}
			})
		})
	})
})
