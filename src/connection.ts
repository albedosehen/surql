import Surreal from 'surrealdb'
import { decodeJWTPayload } from './utils.ts'
import { intoSurrealDbError } from './surrealError.ts'

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
 */
export class SurrealConnectionManager {
	private db: InstanceType<typeof Surreal> | null = null
	private isConnected = false
	private connectionPromise: Promise<Surreal> | null = null
	private expiresAt = 0
	private readonly config: ConnectionConfig
	private readonly endpoint: string

	constructor(config: ConnectionConfig) {
		this.config = config
		this.endpoint = `http://${config.host}:${config.port}/rpc`
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
				throw intoSurrealDbError('Connection promise failed:', e)
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
			throw intoSurrealDbError('Connection failed:', e)
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

		const { exp, ID: _ID } = decodeJWTPayload<SurrealJwt>(token)
		this.expiresAt = exp * 1_000
	}

	/**
	 * Check if the current JWT token is still valid
	 */
	private isTokenValid(): boolean {
		return this.expiresAt > Date.now() + 60_000 // 1 minute buffer
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
			}
		} catch (e) {
			throw intoSurrealDbError('Failed to close connection:', e)
		}
	}
}
