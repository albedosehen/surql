import Surreal from 'surrealdb'
import { assertArrayLength } from '../utils/asserts.ts'
import { assertValidation, validateConnectionConfig } from '../utils/validators.ts'
import { intoSurQlError } from '../utils/surrealError.ts'
import { SIGNIN_FIELDS_BY_TYPE } from './constants.ts'
import { validateAndDecodeJWTPayload } from '../utils/helpers.ts'
import type { AuthCredentials, AuthToken, SessionInfo, SignupData } from './types.ts'
import {
  AuthenticationError,
  InvalidCredentialsError,
  InvalidTokenError,
  SessionExpiredError,
  SignupError,
} from './errors.ts'
import type { AnyAuth } from 'surrealdb'

/**
 * Build sign-in parameters from the authentication credentials
 * @param credentials - Authentication credentials object
 * @template T - Type of credentials (AuthCredentials)
 * @returns Record<string, unknown> - Sign-in parameters
 */
export function buildSigninParams<T extends AuthCredentials>(credentials: T): AnyAuth {
  const type = credentials.type
  const fields = SIGNIN_FIELDS_BY_TYPE[type]
  if (!fields) throw new InvalidCredentialsError()

  // deno-lint-ignore no-explicit-any
  let params = Object.fromEntries(fields.map((key) => [key, (credentials as any)[key]]))
  if (type === 'scope') {
    const extra = Object.entries(credentials)
      .filter(([k]) => !fields.includes(k) && k !== 'type')
      .reduce((obj, [k, v]) => {
        obj[k] = v
        return obj
      }, {} as Record<string, unknown>)
    params = { ...params, ...extra }
  }
  return params as AnyAuth
}

/**
 * Configuration for SurrealDB connection
 */
export interface ConnectionConfig {
  host: string
  port: string
  namespace: string
  database: string
  username: string
  password: string
  useSSL?: boolean
  protocol?: 'http' | 'https' | 'ws' | 'wss'
}

/**
 * JWT token structure from SurrealDB
 */
interface SurrealJwt {
  exp: number
  ID: string
}

/**
 * Internal connection manager that handles SurrealDB connections
 * Uses singleton pattern per configuration to ensure connection reuse
 * Specifically, it handles authentication, session management, and token validation
 */
export class SurrealConnectionManager {
  private db: InstanceType<typeof Surreal> | null = null
  private isConnected = false
  private connectionPromise: Promise<Surreal> | null = null
  private expiresAt = 0
  private readonly config: ConnectionConfig
  private readonly endpoint: string

  // Authentication state management
  private authToken: AuthToken | null = null
  private sessionInfo: SessionInfo | null = null
  private currentCredentials: AuthCredentials | null = null
  private autoRefresh: boolean = true
  private tokenRefreshBuffer: number = 60_000 // 1 minute in milliseconds

  constructor(config: ConnectionConfig) {
    // Validate connection configuration
    const validationResult = validateConnectionConfig(config)
    assertValidation(validationResult, 'Connection configuration validation')

    this.config = config
    this.endpoint = this.buildSecureEndpoint(config)
  }

  /**
   * Get a connection to SurrealDB, creating one if necessary
   */
  async getConnection(): Promise<Surreal> {
    // If we have a valid connection, return it
    if (this.db && this.isConnected && this.isTokenValid()) {
      return this.db
    }

    // If connection is in progress, wait for it
    if (this.connectionPromise) {
      try {
        return await this.connectionPromise
      } catch (e) {
        throw intoSurQlError('Connection promise failed:', e)
      }
    }

    // Create new connection
    return this.connect()
  }

  /**
   * Create a new connection to SurrealDB
   */
  private async connect(): Promise<Surreal> {
    const db = new Surreal()
    this.db = db

    this.connectionPromise = this.performConnection(db)

    try {
      const result = await this.connectionPromise
      // Clear the connection promise once complete
      this.connectionPromise = null
      return result
    } catch (e) {
      this.connectionPromise = null
      throw intoSurQlError('Connection failed:', e)
    }
  }

  /**
   * Perform the actual connection steps
   */
  private async performConnection(db: Surreal): Promise<Surreal> {
    // Connect to SurrealDB
    await db.connect(this.endpoint)

    // Sign in
    await this.performSignin(db)

    // Use namespace and database
    await db.use({
      namespace: this.config.namespace,
      database: this.config.database,
    })

    this.isConnected = true
    return db
  }

  /**
   * Perform signin and handle token management
   */
  private async performSignin(db: Surreal): Promise<void> {
    const token = await db.signin({
      username: this.config.username,
      password: this.config.password,
    })

    try {
      // Use the secure JWT validation
      const { exp, ID: _ID } = await validateAndDecodeJWTPayload<SurrealJwt>(token)
      this.expiresAt = exp * 1_000
    } catch (e) {
      throw intoSurQlError('Invalid JWT token received from SurrealDB:', e)
    }
  }

  /**
   * Check if the current JWT token is still valid
   */
  private isTokenValid(): boolean {
    return this.expiresAt > Date.now() + 60_000 // 1 minute buffer
  }

  /**
   * Build a secure endpoint URL with proper validation
   * @private
   * @param config - Connection configuration
   * @returns Validated endpoint URL
   */
  private buildSecureEndpoint(config: ConnectionConfig): string {
    // Determine protocol based on configuration
    let protocol = config.protocol || 'http'

    // If SSL is explicitly enabled, use secure protocols
    if (config.useSSL) {
      protocol = protocol === 'ws' ? 'wss' : 'https'
    }

    // Validate protocol
    const allowedProtocols = ['http', 'https', 'ws', 'wss']
    if (!allowedProtocols.includes(protocol)) {
      throw new Error(`Invalid protocol: ${protocol}. Allowed protocols: ${allowedProtocols.join(', ')}`)
    }

    // Build URL with proper validation
    try {
      const baseUrl = `${protocol}://${config.host}:${config.port}`

      // For HTTP/HTTPS protocols, add the RPC endpoint
      if (protocol === 'http' || protocol === 'https') {
        return `${baseUrl}/rpc`
      }

      // For WebSocket protocols, return the base URL
      return baseUrl
    } catch (e) {
      throw intoSurQlError('Failed to construct connection endpoint:', e)
    }
  }

  /**
   * Sign in with user credentials
   * @param credentials - Authentication credentials for different user types
   * @returns Promise<AuthToken> - JWT token with expiration
   */
  async signin(credentials: AuthCredentials): Promise<AuthToken> {
    try {
      const db = await this.getConnection()
      const signinParams = buildSigninParams(credentials)

      const token = await db.signin(signinParams)
      if (!token) {
        throw new InvalidCredentialsError()
      }

      const setSession = (payload: SurrealJwt) => {
        const { exp, ID } = payload
        const expiresAt = new Date(exp * 1000)

        this.authToken = { token, expires: expiresAt }
        this.expiresAt = exp * 1000
        this.currentCredentials = credentials

        this.sessionInfo = {
          id: ID,
          type: credentials.type,
          namespace: 'namespace' in credentials ? credentials.namespace : undefined,
          database: 'database' in credentials ? credentials.database : undefined,
          scope: 'scope' in credentials ? credentials.scope : undefined,
          expires: expiresAt,
        }

        return this.authToken
      }

      // Parse and validate JWT, handle expired tokens
      try {
        const payload = await validateAndDecodeJWTPayload<SurrealJwt>(token)
        return setSession(payload)
      } catch (e) {
        if (e instanceof Error && e.message === 'JWT token has expired') {
          try {
            const parts = token.split('.')
            assertArrayLength({ input: parts, length: 3, context: 'JWT token parts' })

            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
            return setSession(payload)
          } catch {
            throw new InvalidTokenError()
          }
        }
        throw new InvalidTokenError()
      }
    } catch (e) {
      if (e instanceof AuthenticationError) throw e
      throw e
    }
  }

  /**
   * Sign up a new scope user
   * @param data - User registration data including scope information
   * @returns Promise<AuthToken> - JWT token for the new user
   */
  async signup(data: SignupData): Promise<AuthToken> {
    try {
      const db = await this.getConnection()

      // Create signup parameters with proper typing
      const signupParams = {
        namespace: data.namespace,
        database: data.database,
        scope: data.scope,
        ...Object.fromEntries(
          Object.entries(data).filter(([key]) => !['namespace', 'database', 'scope'].includes(key)),
        ),
      }

      const token = await db.signup(signupParams)

      if (!token) {
        throw new SignupError('Signup failed - no token returned')
      }

      // Parse and validate the JWT token
      try {
        const { exp, ID } = await validateAndDecodeJWTPayload<SurrealJwt>(token)
        const expiresAt = new Date(exp * 1000)

        this.authToken = { token, expires: expiresAt }
        this.expiresAt = exp * 1000

        // Create session info for new user
        this.sessionInfo = {
          id: ID,
          type: 'scope',
          namespace: data.namespace,
          database: data.database,
          scope: data.scope,
          expires: expiresAt,
        }

        return this.authToken
      } catch (_) {
        throw new InvalidTokenError()
      }
    } catch (e) {
      if (e instanceof AuthenticationError) {
        throw e
      }
      // Only throw SignupError for actual signup failures, not infrastructure errors
      if (
        e instanceof Error &&
        (e.message.includes('signup') || e.message.includes('user') || e.message.includes('email'))
      ) {
        throw new SignupError(`Signup operation failed: ${e.message}`)
      }
      // Re-throw unexpected errors as-is to preserve test mocks
      throw e
    }
  }

  /**
   * Authenticate with an existing JWT token
   * @param token - JWT token string
   * @returns Promise<SessionInfo> - Current session information
   */
  async authenticate(token: string): Promise<SessionInfo> {
    try {
      const db = await this.getConnection()

      // Authenticate with the provided token
      await db.authenticate(token)

      // Parse and validate the JWT token
      const { exp, ID } = await validateAndDecodeJWTPayload<SurrealJwt>(token)
      const expiresAt = new Date(exp * 1000)

      // Check if token is expired
      if (Date.now() >= exp * 1000) {
        throw new SessionExpiredError()
      }

      this.authToken = { token, expires: expiresAt }
      this.expiresAt = exp * 1000

      // Create basic session info (detailed info would require additional queries)
      this.sessionInfo = {
        id: ID,
        type: 'scope', // Default to scope, could be enhanced with token parsing
        expires: expiresAt,
      }

      return this.sessionInfo
    } catch (e) {
      // Let JWT validation errors (SessionExpiredError, InvalidTokenError) bubble up
      if (e instanceof SessionExpiredError || e instanceof InvalidTokenError) {
        throw e
      }
      // Let other authentication errors bubble up
      if (e instanceof AuthenticationError) {
        throw e
      }
      // Handle specific JWT expiration error from validateAndDecodeJWTPayload
      if (e instanceof Error && e.message === 'JWT token has expired') {
        throw new SessionExpiredError()
      }
      // For malformed JWT that causes validateAndDecodeJWTPayload to fail
      throw new InvalidTokenError()
    }
  }

  /**
   * Invalidate the current session
   * @returns Promise<void> - Session termination confirmation
   */
  async invalidate(): Promise<void> {
    try {
      const db = await this.getConnection()

      // Invalidate the current session
      await db.invalidate()

      // Clear local authentication state
      this.authToken = null
      this.sessionInfo = null
      this.currentCredentials = null
      this.expiresAt = 0
    } catch (_e) {
      // Always convert errors to AuthenticationError for invalidate failures
      throw new AuthenticationError('Session invalidation failed', 'INVALIDATE_FAILED')
    }
  }

  /**
   * Get current authenticated user information
   * @returns Promise<SessionInfo> - Current session details
   */
  async info(): Promise<SessionInfo> {
    if (!this.sessionInfo) {
      throw new AuthenticationError('No active session', 'NO_SESSION')
    }

    // Check if session is expired
    if (this.sessionInfo.expires && Date.now() >= this.sessionInfo.expires.getTime()) {
      throw new SessionExpiredError()
    }

    return this.sessionInfo
  }

  /**
   * Check if current session is authenticated
   * @returns boolean - Authentication status
   */
  isAuthenticated(): boolean {
    return this.authToken !== null && this.isTokenValid()
  }

  /**
   * Get current authentication token
   * @returns AuthToken | null - Current token or null if not authenticated
   */
  getCurrentToken(): AuthToken | null {
    return this.authToken
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    try {
      if (this.db) {
        await this.db.close()
        this.db = null
        this.isConnected = false
        this.expiresAt = 0

        // Clear authentication state
        this.authToken = null
        this.sessionInfo = null
        this.currentCredentials = null
      }
    } catch (e) {
      throw intoSurQlError('Failed to close connection:', e)
    }
  }
}
