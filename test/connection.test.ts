import { assert, assertEquals, assertRejects } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { stub } from '@std/testing/mock'
import { type ConnectionConfig, SurrealConnectionManager } from '../src/connection.ts'
import Surreal from 'surrealdb'

// Test connection config - using environment variables for security
const testConfig: ConnectionConfig = {
	host: Deno.env.get('SURQL_TEST_HOST') || 'localhost',
	port: Deno.env.get('SURQL_TEST_PORT') || '8000',
	namespace: Deno.env.get('SURQL_TEST_NAMESPACE') || 'test',
	database: Deno.env.get('SURQL_TEST_DATABASE') || 'test',
	username: Deno.env.get('SURQL_TEST_USERNAME') || 'testuser',
	password: Deno.env.get('SURQL_TEST_PASSWORD') || 'testpass',
}

describe('SurrealConnectionManager', () => {
	describe('constructor', () => {
		it('should create a new connection manager instance', () => {
			const manager = new SurrealConnectionManager(testConfig)
			assert(manager instanceof SurrealConnectionManager)
		})
	})

	describe('getConnection()', () => {
		it('should establish connection and return Surreal instance', async () => {
			const connectStub = stub(Surreal.prototype, 'connect', () => Promise.resolve(true as const))
			const signinStub = stub(
				Surreal.prototype,
				'signin',
				() => {
					// Create a proper JWT with valid header
					const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }))
					const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ID: 'test' }))
					return Promise.resolve(`${header}.${payload}.signature`)
				}
			)
			const useStub = stub(Surreal.prototype, 'use', () => Promise.resolve(true as const))

			try {
				const manager = new SurrealConnectionManager(testConfig)
				const connection = await manager.getConnection()
				assert(connection instanceof Surreal)
			} finally {
				connectStub.restore()
				signinStub.restore()
				useStub.restore()
			}
		})

		it('should reuse existing connection', async () => {
			const connectStub = stub(Surreal.prototype, 'connect', () => Promise.resolve(true as const))
			// Use a future expiration time (year 2030)
			const futureExp = Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years from now
			const signinStub = stub(Surreal.prototype, 'signin', () => {
				// Create a proper JWT with future expiration
				const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }))
				const payload = btoa(JSON.stringify({ exp: futureExp, ID: 'test' }))
				return Promise.resolve(`${header}.${payload}.signature`)
			})
			const useStub = stub(Surreal.prototype, 'use', () => Promise.resolve(true as const))

			try {
				const manager = new SurrealConnectionManager(testConfig)

				const connection1 = await manager.getConnection()
				const connection2 = await manager.getConnection()

				assertEquals(connection1, connection2)
				assertEquals(connectStub.calls.length, 1) // Should only connect once
			} finally {
				connectStub.restore()
				signinStub.restore()
				useStub.restore()
			}
		})

		it('should handle connection errors', async () => {
			const connectStub = stub(Surreal.prototype, 'connect', () => Promise.reject(new Error('Connection failed')))

			try {
				const manager = new SurrealConnectionManager(testConfig)

				await assertRejects(
					() => manager.getConnection(),
					Error,
					'Connection failed',
				)
			} finally {
				connectStub.restore()
			}
		})

		it('should handle authentication errors', async () => {
			const connectStub = stub(Surreal.prototype, 'connect', () => Promise.resolve(true as const))
			const signinStub = stub(Surreal.prototype, 'signin', () => Promise.reject(new Error('Auth failed')))

			try {
				const manager = new SurrealConnectionManager(testConfig)

				await assertRejects(
					() => manager.getConnection(),
					Error,
					'Auth failed',
				)
			} finally {
				connectStub.restore()
				signinStub.restore()
			}
		})

		it('should handle database selection errors', async () => {
			const connectStub = stub(Surreal.prototype, 'connect', () => Promise.resolve(true as const))
			const signinStub = stub(
				Surreal.prototype,
				'signin',
				() => {
					const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }))
					const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ID: 'test' }))
					return Promise.resolve(`${header}.${payload}.signature`)
				},
			)
			const useStub = stub(Surreal.prototype, 'use', () => Promise.reject(new Error('Database not found')))

			try {
				const invalidConfig = { ...testConfig, database: 'nonexistent' }
				const manager = new SurrealConnectionManager(invalidConfig)

				await assertRejects(
					() => manager.getConnection(),
					Error,
					'Database not found',
				)
			} finally {
				connectStub.restore()
				signinStub.restore()
				useStub.restore()
			}
		})

		it('should handle concurrent connection requests', async () => {
			const connectStub = stub(Surreal.prototype, 'connect', () => Promise.resolve(true as const))
			const signinStub = stub(
				Surreal.prototype,
				'signin',
				() => {
					const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }))
					const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ID: 'test' }))
					return Promise.resolve(`${header}.${payload}.signature`)
				},
			)
			const useStub = stub(Surreal.prototype, 'use', () => Promise.resolve(true as const))

			try {
				const manager = new SurrealConnectionManager(testConfig)

				// Make multiple concurrent connection requests
				const promises = [
					manager.getConnection(),
					manager.getConnection(),
					manager.getConnection(),
				]

				const connections = await Promise.all(promises)

				// All should return the same connection instance
				assertEquals(connections[0], connections[1])
				assertEquals(connections[1], connections[2])
				assertEquals(connectStub.calls.length, 1) // Should only connect once
			} finally {
				connectStub.restore()
				signinStub.restore()
				useStub.restore()
			}
		})
	})

	describe('close()', () => {
		it('should close existing connection', async () => {
			const connectStub = stub(Surreal.prototype, 'connect', () => Promise.resolve(true as const))
			const signinStub = stub(
				Surreal.prototype,
				'signin',
				() => {
					const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }))
					const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ID: 'test' }))
					return Promise.resolve(`${header}.${payload}.signature`)
				},
			)
			const useStub = stub(Surreal.prototype, 'use', () => Promise.resolve(true as const))
			const closeStub = stub(Surreal.prototype, 'close', () => Promise.resolve(true as const))

			try {
				const manager = new SurrealConnectionManager(testConfig)

				// Establish connection first
				await manager.getConnection()

				// Then close it
				await manager.close()

				assertEquals(closeStub.calls.length, 1)
			} finally {
				connectStub.restore()
				signinStub.restore()
				useStub.restore()
				closeStub.restore()
			}
		})

		it('should handle closing when no connection exists', async () => {
			const manager = new SurrealConnectionManager(testConfig)

			// Should not throw when closing non-existent connection
			await manager.close()
			assert(true) // Test passes if no error thrown
		})

		it('should handle close errors gracefully', async () => {
			const connectStub = stub(Surreal.prototype, 'connect', () => Promise.resolve(true as const))
			const signinStub = stub(
				Surreal.prototype,
				'signin',
				() => {
					const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }))
					const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ID: 'test' }))
					return Promise.resolve(`${header}.${payload}.signature`)
				},
			)
			const useStub = stub(Surreal.prototype, 'use', () => Promise.resolve(true as const))
			const closeStub = stub(Surreal.prototype, 'close', () => Promise.reject(new Error('Close failed')))

			try {
				const manager = new SurrealConnectionManager(testConfig)

				// Establish connection first
				await manager.getConnection()

				// Close should handle errors gracefully
				await assertRejects(
					() => manager.close(),
					Error,
					'Close failed',
				)
			} finally {
				connectStub.restore()
				signinStub.restore()
				useStub.restore()
				closeStub.restore()
			}
		})
	})

	describe('connection configuration', () => {
		it('should use provided host and port', () => {
			const customConfig: ConnectionConfig = {
				host: 'custom-host',
				port: '9000',
				namespace: 'custom-ns',
				database: 'custom-db',
				username: 'custom-user',
				password: 'custom-pass',
			}

			const manager = new SurrealConnectionManager(customConfig)
			assert(manager instanceof SurrealConnectionManager)
		})

		it('should use provided namespace and database', async () => {
			const connectStub = stub(Surreal.prototype, 'connect', () => Promise.resolve(true as const))
			const signinStub = stub(
				Surreal.prototype,
				'signin',
				() => {
					const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }))
					const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ID: 'test' }))
					return Promise.resolve(`${header}.${payload}.signature`)
				},
			)
			const useStub = stub(Surreal.prototype, 'use', () => Promise.resolve(true as const))

			try {
				const customConfig: ConnectionConfig = {
					...testConfig,
					namespace: 'production',
					database: 'main',
				}

				const manager = new SurrealConnectionManager(customConfig)
				await manager.getConnection()

				// Verify use was called with correct namespace and database
				assertEquals(useStub.calls.length, 1)
				assertEquals(useStub.calls[0].args[0], {
					namespace: 'production',
					database: 'main',
				})
			} finally {
				connectStub.restore()
				signinStub.restore()
				useStub.restore()
			}
		})

		it('should use provided credentials', async () => {
			const connectStub = stub(Surreal.prototype, 'connect', () => Promise.resolve(true as const))
			const signinStub = stub(
				Surreal.prototype,
				'signin',
				() => {
					const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }))
					const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ID: 'test' }))
					return Promise.resolve(`${header}.${payload}.signature`)
				},
			)
			const useStub = stub(Surreal.prototype, 'use', () => Promise.resolve(true as const))

			try {
				const customConfig: ConnectionConfig = {
					...testConfig,
					username: 'admin',
					password: 'secret123',
				}

				const manager = new SurrealConnectionManager(customConfig)
				await manager.getConnection()

				// Verify signin was called with correct credentials
				assertEquals(signinStub.calls.length, 1)
				assertEquals(signinStub.calls[0].args[0], {
					username: 'admin',
					password: 'secret123',
				})
			} finally {
				connectStub.restore()
				signinStub.restore()
				useStub.restore()
			}
		})
	})

	describe('error handling', () => {
		it('should throw SurrealDbError for connection failures', async () => {
			const connectStub = stub(Surreal.prototype, 'connect', () => Promise.reject(new Error('Network error')))

			try {
				const manager = new SurrealConnectionManager(testConfig)

				await assertRejects(
					() => manager.getConnection(),
					Error,
					'Connection failed',
				)
			} finally {
				connectStub.restore()
			}
		})

		it('should throw SurrealDbError for authentication failures', async () => {
			const connectStub = stub(Surreal.prototype, 'connect', () => Promise.resolve(true as const))
			const signinStub = stub(Surreal.prototype, 'signin', () => Promise.reject(new Error('Invalid credentials')))

			try {
				const manager = new SurrealConnectionManager(testConfig)

				await assertRejects(
					() => manager.getConnection(),
					Error,
					'Connection failed',
				)
			} finally {
				connectStub.restore()
				signinStub.restore()
			}
		})

		it('should throw SurrealDbError for close failures', async () => {
			const connectStub = stub(Surreal.prototype, 'connect', () => Promise.resolve(true as const))
			const signinStub = stub(
				Surreal.prototype,
				'signin',
				() => {
					const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }))
					const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ID: 'test' }))
					return Promise.resolve(`${header}.${payload}.signature`)
				},
			)
			const useStub = stub(Surreal.prototype, 'use', () => Promise.resolve(true as const))
			const closeStub = stub(Surreal.prototype, 'close', () => Promise.reject(new Error('Close error')))

			try {
				const manager = new SurrealConnectionManager(testConfig)
				await manager.getConnection()

				await assertRejects(
					() => manager.close(),
					Error,
					'Failed to close connection',
				)
			} finally {
				connectStub.restore()
				signinStub.restore()
				useStub.restore()
				closeStub.restore()
			}
		})
	})
})
