# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.3] - 2025-07-15

### Added - Enterprise Features

#### Enhanced Authentication System

- **Complete multi-level authentication support**: Root, Namespace, Database, and Scope authentication
- **Advanced JWT token management** with automatic lifecycle handling
- **Comprehensive credential validation** with context-aware error handling
- **Session state persistence** across all operations
- **Enhanced authentication error classes** for granular error handling

#### Advanced CRUD Operations

- **`MergeQL`** class for sophisticated partial data updates
  - Smart merge operations preserving existing field values
  - Support for nested object merging with conflict resolution
- **`PatchQL`** class with full RFC 6902 JSON Patch implementation
  - Complete operation support: `add`, `remove`, `replace`, `move`, `copy`, `test`
  - Path validation and injection attack prevention
- **`UpsertQL`** class for intelligent insert-or-update operations
  - Conditional logic handling for both insert and update scenarios
  - Advanced conflict resolution strategies

#### Query Builder Enhancements

- **Aggregation capabilities** with comprehensive functions
  - `count()`, `sum()`, `avg()`, `min()`, `max()` operations
  - Automatic field aliasing for clear result sets
- **`GroupBy` functionality** with multiple field grouping support
- **`Having` clauses** for filtered aggregations with fluent syntax
- **Enhanced pagination** with both traditional and page-based methods

#### Enterprise Security Infrastructure

- **SQL injection prevention** across all query operations
- **Input validation framework** with comprehensive sanitization
- **Path traversal protection** for JSON Patch operations
- **Secure credential handling** with automatic token expiration

#### Comprehensive Testing Infrastructure

- **2,697+ lines of test coverage** across authentication, CRUD, and query operations
- **95%+ test coverage** for all new functionality
- **Integration test suite** ensuring feature interoperability
- **Security validation tests** for injection prevention

### Enhanced

- **Type system improvements** with automatic serialization utilities
- **Error handling framework** with context-aware error classes
- **Client architecture** with factory methods and capability-based mixins
- **Performance optimizations** for query building and execution

### Security

- **Production-ready input validation** across all user-facing APIs
- **Enhanced credential security** with automatic token lifecycle management
- **Comprehensive injection prevention** for all query types

### Updated - Foundation & Infrastructure

#### Core Architecture

- **Foundational authentication framework** with multi-level support structure
- **Base CRUD operation classes** with comprehensive error handling
- **Security validation infrastructure** with input sanitization
- **Core type system** with serialization utilities

#### Authentication Infrastructure

- **Basic authentication framework** supporting all credential types
- **JWT token handling infrastructure** with lifecycle management
- **Session management foundation** with state persistence
- **Authentication error class hierarchy** for granular error handling

#### Security & Validation Framework

- **Input validation system** with comprehensive sanitization
- **SQL injection prevention infrastructure** across all operations
- **Credential validation framework** with security best practices
- **Path validation system** for secure operations

### Enhanced Project Structure

- **Core client architecture** with modular design patterns
- **Utility functions** for data handling and validation
- **Error handling infrastructure** with specific error types
- **Testing framework foundation** for comprehensive coverage

## [0.2.2] - 2025-07-14

- **Updated**: Minor updates to documentation.

## [0.2.1] - 2025-07-13

- **Updated**: Minor updates to documentation.

## [0.2.0] - 2025-07-13

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

### Enhanced Documentation

- **README.md** Feature documentation
- **Error handling patterns** with specific error types and examples
- **Security considerations** section with best practices
- **Code examples** showcasing real-world usage patterns

### Security Improvements

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
