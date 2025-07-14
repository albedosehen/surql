/**
 * Authentication interfaces and types for SurQL Phase 1
 * Supports root, namespace, database, and scope-level authentication
 */

/**
 * Root user credentials for system-level access
 */
export interface RootCredentials {
  type: 'root'
  username: string
  password: string
}

/**
 * Namespace user credentials for namespace-level access
 */
export interface NamespaceCredentials {
  type: 'namespace'
  namespace: string
  username: string
  password: string
}

/**
 * Database user credentials for database-level access
 */
export interface DatabaseCredentials {
  type: 'database'
  namespace: string
  database: string
  username: string
  password: string
}

/**
 * Scope user credentials for scope-level access with custom fields
 */
export interface ScopeCredentials {
  type: 'scope'
  namespace: string
  database: string
  scope: string
  [key: string]: unknown // Additional scope-specific fields
}

/**
 * Union type of all supported authentication credential types
 */
export type AuthCredentials =
  | RootCredentials
  | NamespaceCredentials
  | DatabaseCredentials
  | ScopeCredentials

/**
 * JWT token structure returned by SurrealDB authentication
 */
export interface AuthToken {
  token: string
  expires?: Date
}

/**
 * User session information containing authentication details
 */
export interface SessionInfo {
  id: string
  type: 'root' | 'namespace' | 'database' | 'scope'
  namespace?: string
  database?: string
  scope?: string
  expires?: Date
  permissions?: string[]
}

/**
 * Signup data for creating new scope users
 */
export interface SignupData {
  namespace: string
  database: string
  scope: string
  [key: string]: unknown // User-defined fields for scope registration
}

/**
 * Enhanced connection configuration with authentication support
 */
export interface EnhancedConnectionConfig {
  host: string
  port: string
  namespace: string
  database: string
  username?: string // Optional for token-based auth
  password?: string // Optional for token-based auth
  useSSL?: boolean
  protocol?: 'http' | 'https' | 'ws' | 'wss'
  // New authentication fields
  authToken?: string
  autoRefresh?: boolean
  tokenRefreshBuffer?: number // Minutes before expiry to refresh
}
