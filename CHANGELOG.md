# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2025-01-13

- **Updated**: Minor updates to documentation.

## [0.2.0] - 2025-01-13

### Added - Core Features

#### 🔐 Authentication & Session Management

- **Multi-Level Authentication**: Complete support for Root, Namespace, Database, and Scope-level authentication
- **`signin()`** method supporting all credential types with comprehensive validation
- **`signup()`** method for creating new scope users with custom fields
- **`authenticate()`** method for JWT token-based authentication
- **`invalidate()`** method for secure session termination
- **`info()`** method for retrieving current session information
- **`isAuthenticated()`** method for checking authentication status
- **`getCurrentToken()`** method for accessing current JWT token
- **Automatic JWT token lifecycle management** with expiration handling
- **Session state persistence** across operations
- **Enhanced error handling** with specific authentication error classes:
  - `AuthenticationError` - Base authentication error
  - `SessionExpiredError` - Session expiration handling
  - `InvalidCredentialsError` - Invalid login credentials
  - `InvalidTokenError` - Malformed or invalid JWT tokens
  - `InsufficientPermissionsError` - Permission-based access control
  - `SignupError` - User registration failures
  - `ScopeAuthenticationError` - Scope-specific authentication issues

#### 🛠️ Advanced CRUD Operations

- **`MergeQL`** class for partial data updates preserving existing fields
  - Smart merge operations that combine new data with existing records
  - Support for nested object merging
  - Comprehensive error handling for non-existent records
- **`PatchQL`** class implementing JSON Patch RFC 6902 operations
  - Support for all standard operations: `add`, `remove`, `replace`, `move`, `copy`, `test`
  - Fluent API with `addOperation()` and `addOperations()` methods
  - Path validation and security checks to prevent injection attacks
  - Comprehensive operation validation following RFC 6902 specifications
- **`UpsertQL`** class for intelligent insert-or-update operations
  - `withId()` method for specifying exact record IDs
  - `onConflict()` method for conflict detection on specific fields
  - Smart conditional logic handling both insert and update scenarios
  - Support for complex conflict resolution strategies

#### 📊 Enhanced Query Builder Capabilities

- **`GroupByCapability`** mixin for advanced grouping functionality
  - Support for multiple grouping fields
  - Input validation and injection prevention
  - Integration with aggregation and having clauses
- **`HavingCapability`** mixin for filtered aggregations
  - Fluent syntax: `having('field', Op.GREATER_THAN, value)`
  - Direct condition syntax: `having('COUNT(*) > 10')`
  - Multiple condition support with automatic AND logic
  - Security validation for condition strings
- **`AggregationCapability`** mixin with comprehensive aggregation functions
  - `count()` - Record counting with optional field specification
  - `sum()` - Numerical field summation
  - `avg()` - Average calculation
  - `min()` - Minimum value detection
  - `max()` - Maximum value detection
  - Automatic field aliasing for result clarity
- **Enhanced pagination** with new `page()` method
  - Traditional `limit()` and `offset()` support maintained
  - New `page(pageNumber, pageSize)` method for simplified pagination
  - Integration with grouping and aggregation operations

#### 🏗️ Architecture Improvements

- **Capability-based mixin architecture** for composable query building
- **Enhanced SurQLClient** with all new factory methods
- **Backward compatibility** - all existing APIs remain unchanged
- **Type safety enhancements** with proper generic constraints
- **Comprehensive input validation** across all new features
- **Security-focused design** with injection prevention

### Enhanced

- **README.md** Feature documentation
- **Error handling patterns** with specific error types and examples
- **Security considerations** section with best practices
- **Migration guide** for upgrading from previous versions
- **API Reference** expanded with all new methods and capabilities
- **Code examples** showcasing real-world usage patterns

### Security

- **Input validation** for all user-provided data
- **SQL injection prevention** in field names and conditions
- **Path traversal protection** in JSON Patch operations
- **Credential validation** for authentication operations
- **Secure token handling** with automatic expiration management

### Testing

- **Additional tests** across features
- **95%+ test coverage** for all new functionality with exception of authentication tests
- **Authentication test suite** (`auth.test.ts`) with full credential type coverage
- **CRUD operations test suite** (`crud.test.ts`) with comprehensive operation testing
- **Query enhancements test suite** (`queryEnhancements.test.ts`) with capability testing
- **Integration tests** ensuring feature interoperability
- **Security validation tests** for injection prevention
- **Error handling tests** for all new error types

### Performance

- **Optimized query building** with efficient mixin composition
- **Minimal overhead** for new authentication features
- **Connection reuse** for authenticated operations
- **Efficient parameter binding** for all new query types
- **Memory-efficient** aggregation and grouping operations

### Documentation

- **Complete API documentation** with TypeScript signatures
- **Practical code examples** for all new features
- **Security best practices** and considerations
- **Migration guide** for existing users
- **Error handling patterns** with specific error types
- **Real-world usage examples** for e-commerce and user management

## [0.1.0] - Previous Release

### Added

- Initial SurQL implementation with basic CRUD operations
- Promise-based query builder with fluent interface
- Type-safe operations with TypeScript support
- Connection management with SurrealConnectionManager
- Basic ReadQL, CreateQL, UpdateQL, DeleteQL builders
- Utility types and serialization helpers

---
