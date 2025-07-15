/**
 * SurQL authentication module exports
 * This module provides authentication and authorization functionalities for SurQL.
 */

export { buildSigninParams, type ConnectionConfig, SurrealConnectionManager } from './connection.ts'
export { SIGNIN_FIELDS_BY_TYPE } from './constants.ts'

export {
  AuthenticationError,
  AuthenticationRequiredError,
  InsufficientPermissionsError,
  InvalidCredentialsError,
  InvalidTokenError,
  SessionExpiredError,
  SignupError,
} from './errors.ts'

export type {
  AuthCredentials,
  AuthToken,
  DatabaseCredentials,
  EnhancedConnectionConfig,
  NamespaceCredentials,
  RootCredentials,
  ScopeCredentials,
  SessionInfo,
  SignupData,
} from './types.ts'
