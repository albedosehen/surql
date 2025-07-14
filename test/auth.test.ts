import { assert, assertEquals, assertRejects } from '@std/assert'
import { describe, it } from '@std/testing/bdd'
import { stub } from '@std/testing/mock'
import { SurrealConnectionManager } from '../src/connection.ts'
import { SurQLClient } from '../src/client.ts'
import type {
	AuthCredentials,
	AuthToken,
	SessionInfo,
	SignupData,
	RootCredentials,
	NamespaceCredentials,
	DatabaseCredentials,
	ScopeCredentials,
} from '../src/auth/types.ts'
import {
	AuthenticationError,
	InvalidCredentialsError,
	InvalidTokenError,
	SessionExpiredError,
	SignupError,
	InsufficientPermissionsError,
	AuthenticationRequiredError,
	ScopeAuthenticationError,
} from '../src/auth/errors.ts'
import type { Surreal } from 'surrealdb'

// Test configuration
const testConfig = {
	host: 'localhost',
	port: '8000',
	namespace: 'test',
	database: 'auth_test',
	username: 'root',
	password: 'root',
}

// Mock JWT tokens for testing - using base64 encoded JSON
const futureExp = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
const pastExp = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago

// Create properly formatted JWT tokens
const createMockJWT = (exp: number, id: string = 'user:123') => {
	const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }))
	const payload = btoa(JSON.stringify({ exp, ID: id }))
	const signature = 'mock_signature'
	return `${header}.${payload}.${signature}`
}

const validJWT = createMockJWT(futureExp)
const expiredJWT = createMockJWT(pastExp)

describe('Authentication Error Classes', () => {
	describe('AuthenticationError', () => {
		it('should create base authentication error with code', () => {
			const error = new AuthenticationError('Test error', 'TEST_CODE')
			assertEquals(error.message, 'Test error')
			assertEquals(error.code, 'TEST_CODE')
			assertEquals(error.name, 'AuthenticationError')
		})
	})

	describe('SessionExpiredError', () => {
		it('should create session expired error', () => {
			const error = new SessionExpiredError()
			assertEquals(error.message, 'Session has expired')
			assertEquals(error.code, 'SESSION_EXPIRED')
			assertEquals(error.name, 'SessionExpiredError')
		})
	})

	describe('InvalidCredentialsError', () => {
		it('should create invalid credentials error', () => {
			const error = new InvalidCredentialsError()
			assertEquals(error.message, 'Invalid credentials provided')
			assertEquals(error.code, 'INVALID_CREDENTIALS')
			assertEquals(error.name, 'InvalidCredentialsError')
		})
	})

	describe('InsufficientPermissionsError', () => {
		it('should create error without specific permission', () => {
			const error = new InsufficientPermissionsError()
			assertEquals(error.message, 'Insufficient permissions for this operation')
			assertEquals(error.code, 'INSUFFICIENT_PERMISSIONS')
		})

		it('should create error with specific permission', () => {
			const error = new InsufficientPermissionsError('admin')
			assertEquals(error.message, 'Insufficient permissions. Required: admin')
			assertEquals(error.code, 'INSUFFICIENT_PERMISSIONS')
		})
	})

	describe('InvalidTokenError', () => {
		it('should create invalid token error', () => {
			const error = new InvalidTokenError()
			assertEquals(error.message, 'Invalid or malformed authentication token')
			assertEquals(error.code, 'INVALID_TOKEN')
		})
	})

	describe('AuthenticationRequiredError', () => {
		it('should create authentication required error', () => {
			const error = new AuthenticationRequiredError()
			assertEquals(error.message, 'Authentication is required for this operation')
			assertEquals(error.code, 'AUTHENTICATION_REQUIRED')
		})
	})

	describe('SignupError', () => {
		it('should create signup error with custom message', () => {
			const error = new SignupError('Email already exists')
			assertEquals(error.message, 'Email already exists')
			assertEquals(error.code, 'SIGNUP_FAILED')
			assertEquals(error.name, 'SignupError')
		})
	})

	describe('ScopeAuthenticationError', () => {
		it('should create scope auth error with default message', () => {
			const error = new ScopeAuthenticationError('user')
			assertEquals(error.message, 'Authentication failed for scope: user')
			assertEquals(error.code, 'SCOPE_AUTH_FAILED')
		})

		it('should create scope auth error with custom message', () => {
			const error = new ScopeAuthenticationError('user', 'Custom error message')
			assertEquals(error.message, 'Custom error message')
			assertEquals(error.code, 'SCOPE_AUTH_FAILED')
		})
	})
})

describe('SurrealConnectionManager Authentication', () => {
	describe('signin()', () => {
		it('should signin with root credentials', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const rootCredentials: RootCredentials = {
				type: 'root',
				username: 'root',
				password: 'password',
			}

			const mockDB = {
				signin: () => Promise.resolve(validJWT),
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				const token = await connectionManager.signin(rootCredentials)
				
				assert(token.token)
				assert(token.expires instanceof Date)
				assertEquals(typeof token.token, 'string')
			} finally {
				connectionStub.restore()
			}
		})

		it('should signin with namespace credentials', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const namespaceCredentials: NamespaceCredentials = {
				type: 'namespace',
				namespace: 'myapp',
				username: 'nsuser',
				password: 'password',
			}

			const mockDB = {
				signin: (params: any) => {
					assertEquals(params.namespace, 'myapp')
					assertEquals(params.username, 'nsuser')
					return Promise.resolve(validJWT)
				},
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				const token = await connectionManager.signin(namespaceCredentials)
				
				assert(token.token)
				assert(token.expires instanceof Date)
			} finally {
				connectionStub.restore()
			}
		})

		it('should signin with database credentials', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const databaseCredentials: DatabaseCredentials = {
				type: 'database',
				namespace: 'myapp',
				database: 'production',
				username: 'dbuser',
				password: 'password',
			}

			const mockDB = {
				signin: (params: any) => {
					assertEquals(params.namespace, 'myapp')
					assertEquals(params.database, 'production')
					assertEquals(params.username, 'dbuser')
					return Promise.resolve(validJWT)
				},
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				const token = await connectionManager.signin(databaseCredentials)
				
				assert(token.token)
				assert(token.expires instanceof Date)
			} finally {
				connectionStub.restore()
			}
		})

		it('should signin with scope credentials', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const scopeCredentials: ScopeCredentials = {
				type: 'scope',
				namespace: 'myapp',
				database: 'production',
				scope: 'user',
				email: 'john@example.com',
				password: 'userpass',
			}

			const mockDB = {
				signin: (params: any) => {
					assertEquals(params.namespace, 'myapp')
					assertEquals(params.database, 'production')
					assertEquals(params.scope, 'user')
					assertEquals(params.email, 'john@example.com')
					assertEquals(params.password, 'userpass')
					return Promise.resolve(validJWT)
				},
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				const token = await connectionManager.signin(scopeCredentials)
				
				assert(token.token)
				assert(token.expires instanceof Date)
			} finally {
				connectionStub.restore()
			}
		})

		it('should throw InvalidCredentialsError for invalid credentials', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const credentials: RootCredentials = {
				type: 'root',
				username: 'wrong',
				password: 'wrong',
			}

			const mockDB = {
				signin: () => Promise.resolve(null), // Invalid credentials return null
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				await assertRejects(
					() => connectionManager.signin(credentials),
					InvalidCredentialsError,
					'Invalid credentials provided'
				)
			} finally {
				connectionStub.restore()
			}
		})

		it('should throw InvalidTokenError for malformed JWT', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const credentials: RootCredentials = {
				type: 'root',
				username: 'root',
				password: 'password',
			}

			const mockDB = {
				signin: () => Promise.resolve('invalid.jwt.token'),
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				await assertRejects(
					() => connectionManager.signin(credentials),
					InvalidTokenError,
					'Invalid or malformed authentication token'
				)
			} finally {
				connectionStub.restore()
			}
		})

		it('should throw AuthenticationError for unsupported credential type', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const invalidCredentials = {
				type: 'invalid',
				username: 'test',
				password: 'test',
			} as any

			const mockDB = {} as unknown as Surreal
			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				await assertRejects(
					() => connectionManager.signin(invalidCredentials),
					InvalidCredentialsError
				)
			} finally {
				connectionStub.restore()
			}
		})
	})

	describe('signup()', () => {
		it('should signup new scope user', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const signupData: SignupData = {
				namespace: 'myapp',
				database: 'production',
				scope: 'user',
				email: 'jane@example.com',
				password: 'newpassword',
				name: 'Jane Doe',
			}

			const mockDB = {
				signup: (params: any) => {
					assertEquals(params.namespace, 'myapp')
					assertEquals(params.database, 'production')
					assertEquals(params.scope, 'user')
					assertEquals(params.email, 'jane@example.com')
					assertEquals(params.name, 'Jane Doe')
					return Promise.resolve(validJWT)
				},
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				const token = await connectionManager.signup(signupData)
				
				assert(token.token)
				assert(token.expires instanceof Date)
			} finally {
				connectionStub.restore()
			}
		})

		it('should throw SignupError when signup fails', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const signupData: SignupData = {
				namespace: 'myapp',
				database: 'production',
				scope: 'user',
				email: 'existing@example.com',
				password: 'password',
			}

			const mockDB = {
				signup: () => Promise.resolve(null), // Signup failure
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				await assertRejects(
					() => connectionManager.signup(signupData),
					SignupError,
					'Signup failed - no token returned'
				)
			} finally {
				connectionStub.restore()
			}
		})

		it('should throw InvalidTokenError for malformed signup JWT', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const signupData: SignupData = {
				namespace: 'myapp',
				database: 'production',
				scope: 'user',
				email: 'test@example.com',
				password: 'password',
			}

			const mockDB = {
				signup: () => Promise.resolve('malformed.jwt'),
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				await assertRejects(
					() => connectionManager.signup(signupData),
					InvalidTokenError
				)
			} finally {
				connectionStub.restore()
			}
		})
	})

	describe('authenticate()', () => {
		it('should authenticate with valid JWT token', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const mockDB = {
				authenticate: (token: string) => {
					assertEquals(token, validJWT)
					return Promise.resolve()
				},
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				const sessionInfo = await connectionManager.authenticate(validJWT)
				
				assertEquals(sessionInfo.id, 'user:123')
				assertEquals(sessionInfo.type, 'scope')
				assert(sessionInfo.expires instanceof Date)
			} finally {
				connectionStub.restore()
			}
		})

		it('should throw SessionExpiredError for expired token', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const mockDB = {
				authenticate: () => Promise.resolve(),
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				await assertRejects(
					() => connectionManager.authenticate(expiredJWT),
					SessionExpiredError,
					'Session has expired'
				)
			} finally {
				connectionStub.restore()
			}
		})

		it('should throw InvalidTokenError for malformed token', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const mockDB = {
				authenticate: () => Promise.resolve(),
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				await assertRejects(
					() => connectionManager.authenticate('invalid.token'),
					InvalidTokenError
				)
			} finally {
				connectionStub.restore()
			}
		})
	})

	describe('invalidate()', () => {
		it('should invalidate current session', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const mockDB = {
				invalidate: () => Promise.resolve(),
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				await connectionManager.invalidate()
				
				// Verify auth state is cleared
				assertEquals(connectionManager.isAuthenticated(), false)
				assertEquals(connectionManager.getCurrentToken(), null)
			} finally {
				connectionStub.restore()
			}
		})

		it('should throw AuthenticationError when invalidation fails', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const mockDB = {
				invalidate: () => Promise.reject(new Error('Invalidation failed')),
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				await assertRejects(
					() => connectionManager.invalidate(),
					AuthenticationError,
					'Session invalidation failed'
				)
			} finally {
				connectionStub.restore()
			}
		})
	})

	describe('info()', () => {
		it('should return session info when authenticated', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			// First signin to establish session
			const credentials: RootCredentials = {
				type: 'root',
				username: 'root',
				password: 'password',
			}

			const mockDB = {
				signin: () => Promise.resolve(validJWT),
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				await connectionManager.signin(credentials)
				const sessionInfo = await connectionManager.info()
				
				assertEquals(sessionInfo.id, 'user:123')
				assertEquals(sessionInfo.type, 'root')
				assert(sessionInfo.expires instanceof Date)
			} finally {
				connectionStub.restore()
			}
		})

		it('should throw AuthenticationError when no active session', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			await assertRejects(
				() => connectionManager.info(),
				AuthenticationError,
				'No active session'
			)
		})

		it('should throw SessionExpiredError when session is expired', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			// Mock an expired session
			const credentials: RootCredentials = {
				type: 'root',
				username: 'root',
				password: 'password',
			}

			const mockDB = {
				signin: () => Promise.resolve(expiredJWT),
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				await connectionManager.signin(credentials)
				await assertRejects(
					() => connectionManager.info(),
					SessionExpiredError
				)
			} finally {
				connectionStub.restore()
			}
		})
	})

	describe('isAuthenticated()', () => {
		it('should return false when not authenticated', () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			assertEquals(connectionManager.isAuthenticated(), false)
		})

		it('should return true when authenticated with valid token', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const credentials: RootCredentials = {
				type: 'root',
				username: 'root',
				password: 'password',
			}

			const mockDB = {
				signin: () => Promise.resolve(validJWT),
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				await connectionManager.signin(credentials)
				assertEquals(connectionManager.isAuthenticated(), true)
			} finally {
				connectionStub.restore()
			}
		})

		it('should return false when token is expired', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const credentials: RootCredentials = {
				type: 'root',
				username: 'root',
				password: 'password',
			}

			const mockDB = {
				signin: () => Promise.resolve(expiredJWT),
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				await connectionManager.signin(credentials)
				assertEquals(connectionManager.isAuthenticated(), false)
			} finally {
				connectionStub.restore()
			}
		})
	})

	describe('getCurrentToken()', () => {
		it('should return null when not authenticated', () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			assertEquals(connectionManager.getCurrentToken(), null)
		})

		it('should return auth token when authenticated', async () => {
			const connectionManager = new SurrealConnectionManager(testConfig)
			const credentials: RootCredentials = {
				type: 'root',
				username: 'root',
				password: 'password',
			}

			const mockDB = {
				signin: () => Promise.resolve(validJWT),
			} as unknown as Surreal

			const connectionStub = stub(connectionManager, 'getConnection', () => Promise.resolve(mockDB))

			try {
				const signinToken = await connectionManager.signin(credentials)
				const currentToken = connectionManager.getCurrentToken()
				
				assert(currentToken)
				assertEquals(currentToken.token, signinToken.token)
				assertEquals(currentToken.expires?.getTime(), signinToken.expires?.getTime())
			} finally {
				connectionStub.restore()
			}
		})
	})
})

describe('SurQLClient Authentication Integration', () => {
	describe('authentication methods', () => {
		it('should expose signin method', async () => {
			const client = new SurQLClient(testConfig)
			const credentials: RootCredentials = {
				type: 'root',
				username: 'root',
				password: 'password',
			}

			const mockDB = {
				signin: () => Promise.resolve(validJWT),
			} as unknown as Surreal

			const connectionStub = stub(client, 'getConnection', () => Promise.resolve(mockDB))

			try {
				const token = await client.signin(credentials)
				assert(token.token)
				assert(token.expires instanceof Date)
			} finally {
				connectionStub.restore()
				await client.close()
			}
		})

		it('should expose signup method', async () => {
			const client = new SurQLClient(testConfig)
			const signupData: SignupData = {
				namespace: 'myapp',
				database: 'production',
				scope: 'user',
				email: 'test@example.com',
				password: 'password',
			}

			const mockDB = {
				signup: () => Promise.resolve(validJWT),
			} as unknown as Surreal

			const connectionStub = stub(client, 'getConnection', () => Promise.resolve(mockDB))

			try {
				const token = await client.signup(signupData)
				assert(token.token)
				assert(token.expires instanceof Date)
			} finally {
				connectionStub.restore()
				await client.close()
			}
		})

		it('should expose authenticate method', async () => {
			const client = new SurQLClient(testConfig)
			const mockDB = {
				authenticate: () => Promise.resolve(),
			} as unknown as Surreal

			const connectionStub = stub(client, 'getConnection', () => Promise.resolve(mockDB))

			try {
				const sessionInfo = await client.authenticate(validJWT)
				assertEquals(sessionInfo.id, 'user:123')
				assertEquals(sessionInfo.type, 'scope')
			} finally {
				connectionStub.restore()
				await client.close()
			}
		})

		it('should expose invalidate method', async () => {
			const client = new SurQLClient(testConfig)
			const mockDB = {
				invalidate: () => Promise.resolve(),
			} as unknown as Surreal

			const connectionStub = stub(client, 'getConnection', () => Promise.resolve(mockDB))

			try {
				await client.invalidate()
				assertEquals(client.isAuthenticated(), false)
			} finally {
				connectionStub.restore()
				await client.close()
			}
		})

		it('should expose info method', async () => {
			const client = new SurQLClient(testConfig)
			// Setup authenticated session first
			const credentials: RootCredentials = {
				type: 'root',
				username: 'root',
				password: 'password',
			}

			const mockDB = {
				signin: () => Promise.resolve(validJWT),
			} as unknown as Surreal

			const connectionStub = stub(client, 'getConnection', () => Promise.resolve(mockDB))

			try {
				await client.signin(credentials)
				const info = await client.info()
				assertEquals(info.id, 'user:123')
				assertEquals(info.type, 'root')
			} finally {
				connectionStub.restore()
				await client.close()
			}
		})

		it('should expose isAuthenticated method', async () => {
			const client = new SurQLClient(testConfig)
			try {
				assertEquals(client.isAuthenticated(), false)
			} finally {
				await client.close()
			}
		})

		it('should expose getCurrentToken method', async () => {
			const client = new SurQLClient(testConfig)
			try {
				assertEquals(client.getCurrentToken(), null)
			} finally {
				await client.close()
			}
		})
	})

	describe('authentication flow integration', () => {
		it('should maintain authentication state across operations', async () => {
			const client = new SurQLClient(testConfig)
			const credentials: ScopeCredentials = {
				type: 'scope',
				namespace: 'myapp',
				database: 'production',
				scope: 'user',
				email: 'user@example.com',
				password: 'password',
			}

			const mockDB = {
				signin: () => Promise.resolve(validJWT),
				query: () => Promise.resolve([[]]),
			} as unknown as Surreal

			const connectionStub = stub(client, 'getConnection', () => Promise.resolve(mockDB))

			try {
				// Sign in
				const token = await client.signin(credentials)
				assert(token.token)
				assertEquals(client.isAuthenticated(), true)

				// Perform authenticated operation
				const users = await client.query('users').execute()
				assert(Array.isArray(users))

				// Check session info
				const info = await client.info()
				assertEquals(info.type, 'scope')
				assertEquals(info.namespace, 'myapp')
				assertEquals(info.database, 'production')
				assertEquals(info.scope, 'user')

				// Sign out
				await client.invalidate()
				assertEquals(client.isAuthenticated(), false)
				assertEquals(client.getCurrentToken(), null)
			} finally {
				connectionStub.restore()
				await client.close()
			}
		})

		it('should handle authentication errors gracefully', async () => {
			const client = new SurQLClient(testConfig)
			const invalidCredentials: RootCredentials = {
				type: 'root',
				username: 'wrong',
				password: 'wrong',
			}

			const mockDB = {
				signin: () => Promise.resolve(null),
			} as unknown as Surreal

			const connectionStub = stub(client, 'getConnection', () => Promise.resolve(mockDB))

			try {
				await assertRejects(
					() => client.signin(invalidCredentials),
					InvalidCredentialsError
				)

				// Should still be unauthenticated
				assertEquals(client.isAuthenticated(), false)
				assertEquals(client.getCurrentToken(), null)
			} finally {
				connectionStub.restore()
				await client.close()
			}
		})
	})
})