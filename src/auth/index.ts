/**
 * Authentication module for SurQL
 *
 * Provides authentication types, error classes, and credential interfaces
 * for SurrealDB authentication operations including signin, signup, and session management.
 */

// Export authentication types
export type {
  AuthCredentials,
  AuthToken,
  DatabaseCredentials,
  NamespaceCredentials,
  RootCredentials,
  ScopeCredentials,
  SessionInfo,
} from './types.ts'

// Export authentication errors
export { AuthenticationError, InvalidCredentialsError, SessionExpiredError } from './errors.ts'
