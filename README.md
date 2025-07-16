# SurQL - SurrealDB Query Builder

[![JSR Version](https://img.shields.io/jsr/v/@albedosehen/surql)](https://jsr.io/@albedosehen/surql)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/dotwin/dotwin)

I built SurQL to be a modern, type-safe query builder for SurrealDB available for Deno. It provides a fluent interface for building complex queries using native TypeScript. It also aims to simplify client instantiation, ease data manipulation, and improve the security posture for developers and users using sanitization techniques. This library is designed to be used with Deno, leveraging its native Promise support and TypeScript capabilities.

Don't know what SurrealDB is? [Learn more about the modern database here!](https://surrealdb.com/)

## ✨ Features

### Core Features

- **Fluent Builder API**: Chainable methods for complex data operations
- **Native Promises**: Built with standard JavaScript Promises - no external dependencies
- **Deno First**: Designed specifically for Deno with proper import conventions
- **Type Safe**: Full TypeScript support with generic types and strict typing
- **High Performance**: No abstraction overhead - direct Promise execution
- **Fluent Interface**: Chainable methods for readable query construction
- **Zero Dependencies**: Minimal footprint with no external dependencies
- **Smart Defaults**: T = R defaults allow omitting type parameters when no transformation needed
- **Utility Types**: Automated type conversion with `Serialized<T>` and helper functions

### Authentication & Session Management

- **Multi-Level Authentication**: Root, Namespace, Database, and Scope-level authentication
- **JWT Token Management**: Automatic token lifecycle with refresh capabilities
- **Session Management**: Persistent session state with info(), invalidate() methods
- **Secure Signup/Signin**: Complete authentication flow with comprehensive error handling
- **Rich Error Types**: Specific authentication errors (SessionExpired, InvalidCredentials, etc.)

### Advanced CRUD Operations

- **Merge Operations**: Partial data updates preserving existing fields!
- **JSON Patch Support**: RFC 6902 compliant patch operations (add, remove, replace, move, copy, test)!
- **Upsert Operations**: Smart insert-or-update with automatic conflict resolution!

### Enhanced Query Builder

- **GROUP BY Support**: Advanced grouping with multiple field support
- **HAVING Conditions**: Filtered aggregations with fluent syntax
- **Aggregation Functions**: count(), sum(), avg(), min(), max() with automatic aliasing
- **Enhanced Pagination**: Traditional limit/offset plus page() method
- **Capability Composition**: Mix and match query capabilities as needed

### Quality & Testing

- **Well Tested**: Comprehensive testing
- **Well Documented**: Robust examples and API documentation (*Coming soon*)
- **Security Minded**: Input validation and injection prevention
- **Error Handling**: Rich error types for all operations with sensitive string handling

## Documentation

- **[Changelog](./CHANGELOG.md)** - Detailed release notes and migration information

## Installation

Simply import from JSR in your file

```typescript
import { query, SurrealConnectionManager } from "jsr:@albedosehen/surql"
```

Or update your imports and create an alias in `deno.json`

```json
{
  "imports": {
    "surql": "jsr:@albedosehen/surql"
  }
}
```

```typescript
import { query, SurrealConnectionManager } from "surql"
```

## Getting Started

To get started, you'll need to first have your SurrealDB server running and reachable.

### Connecting to your SurrealDB server

**Note:** Always use environment variables for sensitive information like credentials.

```typescript
// Root user authentication
const rootToken = await client.signin({
  type: 'root',
  username: Deno.env.get('SURREALDB_ROOT_USERNAME') || 'root',
  password: Deno.env.get('SURREALDB_ROOT_PASSWORD') || 'password'
})

// Scope user authentication
const userToken = await client.signin({
  type: 'scope',
  namespace: Deno.env.get('SURREALDB_NAMESPACE') || 'dev',
  database: Deno.env.get('SURREALDB_DATABASE') || 'myapp',
  scope: 'user',
  username: Deno.env.get('SURREALDB_USER_USERNAME') || 'username',
  password: Deno.env.get('SURREALDB_USER_PASSWORD') || 'password'
})

// Sign up new scope user
const newUserToken = await client.signup({
  namespace: Deno.env.get('SURREALDB_NAMESPACE') || 'dev',
  database: Deno.env.get('SURREALDB_DATABASE') || 'myapp',
  scope: 'user',
  username: 'randomuser',
  password: 'randompassword',
  email: 'random@example.com',
  name: 'Random User'
})

// Check authentication status
if (client.isAuthenticated()) {
  const sessionInfo = await client.info()
  console.log('Logged in as:', sessionInfo.id)
  console.log('Session expires:', sessionInfo.expires)
}

// Sign out
await client.invalidate()
```

### Basic Query Example

Making a query with SurQL is straightforward. You can use the `query()` method to fetch data from your SurrealDB instance.

```typescript
  const result = await client.query(conn, 'posts', { warnings: 'suppress' })
    .where({ published: true })
    .execute()
```

```typescript
import { SurQLClient, RecordId } from "surql"

// Define your types
interface UserRaw {
  id: RecordId
  username: string
  email: string
  created_at: Date
  active: boolean
}

interface User {
  id: string
  username: string
  email: string
  createdAt: string
  active: boolean
}

// Create mapping function
const mapUser = (raw: UserRaw): User => ({
  id: raw.id.toString(),
  username: raw.username,
  email: raw.email,
  createdAt: raw.created_at.toISOString(),
  active: raw.active
})

// Execute query with explicit transformation
try {
  const activeUsers = await client.query<UserRaw, User>('users')
    .where({ active: true })
    .orderBy('username')
    .limit(10)
    .map(mapUser)
    .execute()

  console.log('Found active users:', activeUsers)
} catch (error) {
  console.error('Query failed:', error)
}
```

### Smart Defaults Example

```typescript
import { SurQLClient, Serialized, createSerializer } from "surql"

// NEW: Simplified usage with T = R defaults
// No explicit transformation - works directly with raw SurrealDB types
try {
  const rawUsers = await client.query<UserRaw>('users')
    .where({ active: true })
    .orderBy('username')
    .limit(10)
    .execute() // Returns UserRaw[] with RecordId and Date objects

  console.log('Raw users with SurrealDB types:', rawUsers)

  // Use utility types for automatic conversion
  type User = Serialized<UserRaw> // { id: string; created_at: string; username: string; email: string; active: boolean }

  // Create helper functions when transformation is needed
  const serializer = createSerializer<UserRaw>()
  const transformedUsers: User[] = rawUsers.map(raw => ({
    id: serializer.id(raw),
    username: raw.username,
    email: raw.email,
    created_at: serializer.date(raw.created_at),
    active: raw.active
  }))

  console.log('Transformed users:', transformedUsers)
} catch (error) {
  console.error('Query failed:', error)
}
```

### Advanced CRUD Operations Examples

```typescript
// Merge operations - partial updates
const updatedUser = await client.merge('users', 'user:123', {
  email: 'newemail@example.com',
  lastLogin: new Date()
})
  .map(mapUser)
  .execute()

// JSON Patch operations (RFC 6902)
const patchedUser = await client.patch('users', 'user:123', [
  { op: 'replace', path: '/email', value: 'updated@example.com' },
  { op: 'add', path: '/preferences/theme', value: 'dark' },
  { op: 'remove', path: '/temporaryField' }
])
  .addOperation({ op: 'replace', path: '/lastUpdated', value: new Date().toISOString() })
  .map(mapUser)
  .execute()

// Upsert operations - insert or update
const savedUser = await client.upsert('users', {
  username: 'admin',
  email: 'admin@example.com',
  role: 'administrator'
})
  .withId('user:admin') // Specify exact ID
  .map(mapUser)
  .execute()

// Upsert with conflict detection
const user = await client.upsert('users', {
  username: 'unique_user',
  email: 'user@example.com'
})
  .onConflict('username') // Check for conflicts on username
  .map(mapUser)
  .execute()
```

### Enhanced Query Builder Examples

```typescript
// GROUP BY and aggregations
const salesByCategory = await client.query('orders')
  .groupBy('category')
  .count()
  .sum('amount')
  .avg('price')
  .having('COUNT(*)', Op.GREATER_THAN, 10)
  .orderBy('sum_amount', SortDirection.DESC)
  .execute()

// Complex aggregation query
const customerInsights = await client.query('orders')
  .groupBy('customer_id', 'product_category')
  .count('order_id')
  .sum('total_amount')
  .avg('order_value')
  .min('order_date')
  .max('order_date')
  .having('SUM(total_amount) > 1000')
  .having('COUNT(*)', Op.GREATER_THAN, 5)
  .page(1, 20) // Enhanced pagination
  .execute()

// Advanced filtering with aggregations
const premiumCustomers = await client.query('customer_orders')
  .groupBy('customer_id')
  .count()
  .sum('order_total')
  .having('SUM(order_total)', Op.GREATER_THAN, 5000)
  .having('COUNT(*)', Op.GREATER_THAN, 10)
  .orderBy('sum_order_total', SortDirection.DESC)
  .limit(50)
  .execute()
```

## API Reference

### Authentication Examples

#### Authentication Methods

```typescript
// Sign in with different credential types
await client.signin({
  type: 'root',
  username: 'root',
  password: 'password'
})

await client.signin({
  type: 'namespace',
  namespace: 'myapp',
  username: 'admin',
  password: 'password'
})

await client.signin({
  type: 'database',
  namespace: 'myapp',
  database: 'production',
  username: 'dbuser',
  password: 'password'
})

await client.signin({
  type: 'scope',
  namespace: 'myapp',
  database: 'production',
  scope: 'user',
  username: 'john@example.com',
  password: 'userpassword'
})

// Sign up new scope user
await client.signup({
  namespace: 'myapp',
  database: 'production',
  scope: 'user',
  username: 'jane@example.com',
  password: 'newpassword',
  email: 'jane@example.com',
  name: 'Jane Doe',
  preferences: { theme: 'dark' }
})

// Authenticate with existing token
await client.authenticate('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...')

// Session management
const sessionInfo = await client.info()
await client.invalidate()
const isLoggedIn = client.isAuthenticated()
const currentToken = client.getCurrentToken()
```

#### Merge Operations

```typescript
// Partial updates that preserve existing fields
const updatedUser = await client.merge('users', 'user:123', {
  email: 'newemail@example.com',
  lastLogin: new Date(),
  preferences: { notifications: true }
})
  .map(mapUser)
  .execute()

// Merge with nested object updates
const updatedProduct = await client.merge('products', 'product:456', {
  'pricing.discount': 0.15,
  'metadata.updated_by': 'admin',
  'tags': ['sale', 'featured']
})
  .execute()
```

#### JSON Patch Operations (RFC 6902)

```typescript
// Standard JSON Patch operations
const patchedRecord = await client.patch('users', 'user:123', [
  { op: 'add', path: '/preferences/theme', value: 'dark' },
  { op: 'replace', path: '/email', value: 'updated@example.com' },
  { op: 'remove', path: '/tempField' },
  { op: 'move', from: '/oldField', path: '/newField' },
  { op: 'copy', from: '/template', path: '/newCopy' },
  { op: 'test', path: '/version', value: '1.0' }
])
  .map(mapUser)
  .execute()

// Fluent patch building
const result = await client.patch('documents', 'doc:789', [])
  .addOperation({ op: 'add', path: '/sections/-', value: newSection })
  .addOperation({ op: 'replace', path: '/lastModified', value: new Date() })
  .addOperations([
    { op: 'remove', path: '/draft' },
    { op: 'add', path: '/published', value: true }
  ])
  .execute()
```

#### Upsert Operations

```typescript
// Upsert with specific ID
const savedUser = await client.upsert('users', {
  username: 'admin',
  email: 'admin@example.com',
  role: 'administrator'
})
  .withId('user:admin')
  .map(mapUser)
  .execute()

// Upsert with conflict detection
const user = await client.upsert('users', {
  username: 'unique_user',
  email: 'user@example.com',
  profile: { bio: 'Software developer' }
})
  .onConflict('username', 'email')
  .map(mapUser)
  .execute()

// Simple upsert (creates new record)
const newRecord = await client.upsert('logs', {
  level: 'info',
  message: 'Application started',
  timestamp: new Date()
})
  .execute()
```

#### GROUP BY and Aggregations

```typescript
// Basic grouping with aggregations
const salesByRegion = await client.query('sales')
  .groupBy('region')
  .count()
  .sum('amount')
  .avg('order_value')
  .execute()

// Multiple grouping fields
const detailedAnalytics = await client.query('orders')
  .groupBy('customer_id', 'product_category', 'sales_channel')
  .count('order_id')
  .sum('total_amount')
  .min('order_date')
  .max('order_date')
  .execute()

// Custom aggregation aliases
const customAggregation = await client.query('products')
  .groupBy('category')
  .count() // Creates 'count' field
  .sum('price') // Creates 'sum_price' field
  .avg('rating') // Creates 'avg_rating' field
  .min('stock') // Creates 'min_stock' field
  .max('stock') // Creates 'max_stock' field
  .execute()
```

#### HAVING Conditions

```typescript
// HAVING with aggregation functions
const highValueCustomers = await client.query('customer_orders')
  .groupBy('customer_id')
  .sum('order_total')
  .count()
  .having('SUM(order_total)', Op.GREATER_THAN, 10000)
  .having('COUNT(*)', Op.GREATER_THAN, 5)
  .execute()

// Direct HAVING conditions
const activeCategories = await client.query('products')
  .groupBy('category')
  .count()
  .having('COUNT(*) > 10')
  .having('AVG(price) BETWEEN 50 AND 500')
  .execute()

// Complex HAVING with multiple conditions
const premiumSegments = await client.query('sales')
  .groupBy('product_line', 'quarter')
  .sum('revenue')
  .avg('margin')
  .count('transactions')
  .having('SUM(revenue)', Op.GREATER_THAN, 100000)
  .having('AVG(margin)', Op.GREATER_THAN, 0.25)
  .having('COUNT(transactions)', Op.GREATER_THAN, 50)
  .execute()
```

#### Enhanced Pagination

```typescript
// Traditional limit/offset
const paginatedResults = await client.query('users')
  .where({ active: true })
  .orderBy('created_at', SortDirection.DESC)
  .limit(25)
  .offset(50)
  .execute()

// Using offset-based pagination
const pageResults = await client.query('products')
  .where({ in_stock: true })
  .orderBy('name')
  .page(3, 20) // Page 3, 20 items per page
  .execute()

// Complex example
const groupedPage = await client.query('analytics')
  .groupBy('date', 'channel')
  .sum('visits')
  .count('conversions')
  .having('SUM(visits)', Op.GREATER_THAN, 100)
  .orderBy('sum_visits', SortDirection.DESC)
  .page(1, 10)
  .execute()
```

### Reading Data

You probably want to read data from your SurrealDB instance. SurQL provides a fluent interface for building queries and executing them.
Here are some simple examples to get you started.

#### Simple Read Queries

```typescript
// Get all users with raw SurrealDB types (T = R default)
const rawUsers = await client.query<UserRaw>('users')
  .execute() // Returns UserRaw[] with RecordId and Date objects

// Get all users with explicit transformation
const users = await client.query<UserRaw, User>('users')
  .map(mapUser)
  .execute()

// Get first user with raw types
const firstRawUser = await client.query<UserRaw>('users')
  .first() // Returns UserRaw | undefined

// Get first user with transformation
const firstUser = await client.query<UserRaw, User>('users')
  .map(mapUser)
  .first()
```

### Filtering Data

```typescript
// Object-style WHERE conditions with raw types
const rawUsers = await client.query<UserRaw>('users')
  .where({
    active: true,
    role: 'admin',
    'profile.verified': true
  })
  .execute() // Returns UserRaw[] with SurrealDB types

// Object-style WHERE conditions with transformation
const users = await client.query<UserRaw, User>('users')
  .where({
    active: true,
    role: 'admin',
    'profile.verified': true
  })
  .map(mapUser)
  .execute()

// Fluent-style WHERE conditions with raw types
const rawFilteredUsers = await client.query<UserRaw>('users')
  .where('age', Op.GREATER_THAN, 18)
  .where('username', Op.LIKE, '%admin%')
  .execute()

// Fluent-style WHERE conditions with transformation
const users = await client.query<UserRaw, User>('users')
  .where('age', Op.GREATER_THAN, 18)
  .where('username', Op.LIKE, '%admin%')
  .map(mapUser)
  .execute()

// Convenience methods work with both patterns
const verifiedUsers = await client.query<UserRaw>('users')
  .whereEquals('status', 'verified')
  .whereContains('tags', 'premium')
  .whereLike('email', '%@company.com')
  .execute() // Or add .map(mapUser) for transformation
```

#### Sorting and Pagination

```typescript
// Sorting with raw types
const rawUsers = await query<UserRaw>(connectionProvider, userTable)
  .orderBy('created_at', SortDirection.DESC)
  .orderBy('username', SortDirection.ASC)
  .execute() // Returns sorted UserRaw[] with Date objects

// Sorting with transformation
const users = await query<UserRaw, User>(connectionProvider, userTable)
  .orderBy('created_at', SortDirection.DESC)
  .orderBy('username', SortDirection.ASC)
  .map(mapUser)
  .execute()

// Pagination with raw types
const rawPagedUsers = await query<UserRaw>(connectionProvider, userTable)
  .limit(25)
  .offset(50)
  .execute()

// Pagination with transformation
const users = await query<UserRaw, User>(connectionProvider, userTable)
  .limit(25)
  .offset(50)
  .map(mapUser)
  .execute()

// Field selection works with both patterns
const partialUsers = await query<UserRaw>(connectionProvider, userTable)
  .select('username', 'email', 'created_at')
  .execute() // Or add .map(mapUser) for transformation
```

### Creating Data

```typescript
// Create new user with raw types (T = R default)
const newRawUser = await create<UserRaw>(connectionProvider, userTable, {
  username: 'johndoe',
  email: 'john@example.com',
  active: true,
  profile: {
    firstName: 'John',
    lastName: 'Doe'
  }
})
  .execute() // Returns UserRaw with RecordId and Date objects

console.log('Created raw user:', newRawUser)

// Create new user with transformation
const newUser = await create<UserRaw, User>(connectionProvider, userTable, {
  username: 'johndoe',
  email: 'john@example.com',
  active: true,
  profile: {
    firstName: 'John',
    lastName: 'Doe'
  }
})
  .map(mapUser)
  .execute()

console.log('Created transformed user:', newUser)
```

### Updating Data

```typescript
// Update with merge using raw types (T = R default)
const updatedRawUser = await update<UserRaw>(
  connectionProvider,
  userTable,
  'users:123',
  {
    active: false,
    lastLogin: new Date()
  }
)
  .execute() // Returns UserRaw with RecordId and Date objects

// Update with merge and transformation
const updatedUser = await update<UserRaw, User>(
  connectionProvider,
  userTable,
  'users:123',
  {
    active: false,
    lastLogin: new Date()
  }
)
  .map(mapUser)
  .execute()

// Replace entire record with raw types
const replacedRawUser = await update<UserRaw>(
  connectionProvider,
  userTable,
  'users:123',
  {
    username: 'newusername',
    email: 'new@example.com',
    active: true
  }
)
  .replace() // Switch to replace mode
  .execute()

// Replace entire record with transformation
const replacedUser = await update<UserRaw, User>(
  connectionProvider,
  userTable,
  'users:123',
  {
    username: 'newusername',
    email: 'new@example.com',
    active: true
  }
)
  .replace() // Switch to replace mode
  .map(mapUser)
  .execute()
```

### Deleting Data

```typescript
// Delete by ID with raw types (T = R default)
const deletedRawUser = await remove<UserRaw>(connectionProvider, userTable, 'users:123')
  .execute() // Returns UserRaw with RecordId and Date objects

console.log('Deleted raw user:', deletedRawUser)

// Delete by ID with transformation
const deletedUser = await remove<UserRaw, User>(connectionProvider, userTable, 'users:123')
  .map(mapUser)
  .execute()

console.log('Deleted transformed user:', deletedUser)
```

## 🔩 Utility Types & Helpers

SurQL provides powerful utility types and helper functions to enhance DX while maintaining type safety.

### Smart Defaults (T = R)

All query functions default to `T = R`, allowing you to omit the transformation type parameter when no mapping is needed:

```typescript
// Directly using a raw SurrealDB types
const users = await query<UserRaw>(connectionProvider, userTable)
  .where({ active: true })
  .execute() // Returns UserRaw[] with RecordId and Date objects

// Explicit transformation
const transformedUsers = await query<UserRaw, User>(connectionProvider, userTable)
  .where({ active: true })
  .map(mapUser)
  .execute() // Returns User[] with transformed types
```

### Serializer Helpers

 Serialized `<T>` Utility Type Automatically converts SurrealDB types to their serialized equivalents. Useful for consistent data mapping in an application.
 The benefit of this is that it simplifies the process of working with complex data structures by providing a clear and consistent way to transform data between different formats.

The `createSerializer` Provides a simple set of transformation utilities to handle common complex data structures, edge cases, and provide reusable conversion logic. Refer to `examples/complexMapping.ts` for examples.

### Optional Mapping with Warnings

Functions provide helpful warnings when no mapper is provided but still return results. You can suppress these warnings as desired.

I may change the defaults for this in the future if the warnings are annoying. You can mix any of these patterns freely in your application.

```typescript
const rawUsers = await query<UserRaw>(connectionProvider, userTable)
  .map((raw) => ({ ... }))
  .execute() // No warnings, explicit mapping provided

const rawUsers = await query<UserRaw>(connectionProvider, userTable)
  .execute() // Warning: Consider using .map() for type transformation

const rawUsers = await query<UserRaw>(connectionProvider, userTable, { warnings: 'suppress' })
  .execute() // Suppress warning with explicit raw data usage
```

## 👾 Error Handling

SurQL uses standard JavaScript Promise patterns with enhanced error types for easier troubleshooting and debugging.
The below examples are snippets of *some* error types and error handling patterns. These are optional and are provided for convenience.

### Authentication Errors

Examples with error types to handle authentication issues:

```typescript
// ...

try {
  await client.signin({
    type: 'scope',
    namespace: 'app',
    database: 'prod',
    scope: 'user',
    username: 'user@example.com',
    password: 'wrongpassword'
  })
} catch (error) {
  if (error instanceof InvalidCredentialsError) {
    console.error('Login failed: Invalid username or password')
  } else if (error instanceof ScopeAuthenticationError) {
    console.error('Scope authentication failed:', error.message)
  } else if (error instanceof AuthenticationError) {
    console.error('Authentication error:', error.code, error.message)
  }
}
```

### Session Management Errors

Examples with error types to handle session management issues:

```typescript
//...

try {
  const sessionInfo = await client.info()
} catch (error) {
  if (error instanceof SessionExpiredError) {
    console.error('Session expired, please login again')
    // Redirect to login
  } else if (error instanceof InvalidTokenError) {
    console.error('Invalid token, clearing session')
    // Clear stored token
  }
}
```

### Query & Operation Errors

Examples with errors types to handle various query / CRUD operation issues:

```typescript
//...

// Patch operation error example
try {
  await client.patch('users', 'user:123', [
    { op: 'invalid', path: '/field', value: 'test' } // Invalid operation
  ]).execute()
} catch (error) {
  if (error instanceof PatchOperationError) {
    console.error('Patch failed:', error.message)
    console.error('Operation:', error.operation)
  }
}
```

```typescript
//...

// Merge/Upsert error example
try {
  await client.merge('users', 'nonexistent:id', { name: 'test' }).execute()
} catch (error) {
  if (error.message.includes('returned no records')) {
    console.error('Record not found for merge operation')
  }
}
```

#### Try-Catch Pattern

SurQL supports both async/await and Promise chain patterns for error handling following standard JavaScript practices.
There is no special syntax for error handling when using SurQL, so standard JavaScript error handling patterns apply.

```typescript
try {
  const users = await client.query<UserRaw, User>('users')
    .where({ active: true })
    .map(mapUser)
    .execute()

  console.log('Success:', users)
} catch (error) {
  console.error('Error:', error)
  // Handle specific error types
  if (error.message.includes('connection')) {
    // Handle connection errors
  }
}
```

#### Promise Chain Pattern

```typescript
client.query<UserRaw, User>('users')
  .where({ active: true })
  .map(mapUser)
  .execute()
  .then(users => {
    console.log('Success:', users)
    return processUsers(users)
  })
  .catch(error => {
    console.error('Error:', error)
    return handleError(error)
  })
```

## Connection Management

SurQL provides a `SurQLClient` and `SurrealConnectionManager` classes for managing authentication & connections to the database.
Both work similarly, but the class you choose depends upon your needs.

- If you require multiple concurrent operations/connections -> `SurrealConnectionManager`
- If you need a simpler interface for a single connection -> `SurQLClient`

### SurQLClient

SurQL also provides a `SurQLClient` that wraps the connection manager and provides a more convenient interface for authentication and session management for lighter use cases.
Useful for accessing all of SurQL's features from a single client instance or when first working with the query builder.

```typescript
// Create SurQL client with connection manager
const client = new SurQLClient(config)

// Use the client for queries
const users = await client.query<UserRaw, User>('users')
  .where({ active: true })
  .map(mapUser)
  .execute()

console.log('Success:', users)
```

### SurrealConnectionManager

SurQL provides a `SurrealConnectionManager` to handle connection pooling and management automatically. This allows you to reuse connections across multiple operations without worrying about connection lifecycle.
This also means that you can perform multiple queries concurrently without creating new connections each time, or having to pass around a connection instance.

```typescript
// Connection pooling is handled automatically for you
const connectionProvider = new SurrealConnectionManager(config)

// Use across multiple operations
const users = await query<UserRaw, User>(connectionProvider, userTable)
  .map(mapUser)
  .execute()

const posts = await query<PostRaw, Post>(connectionProvider, postTable)
  .map(mapPost)
  .execute()

// Close when done (optional - handles cleanup automatically)
await connectionProvider.close()
```

### Complex Queries

```typescript
// Chaining multiple operations with raw types
const rawResult = await query<UserRaw>(connectionProvider, userTable)
  .where({ active: true })
  .where('created_at', Op.GREATER_THAN, new Date('2024-01-01'))
  .whereContains('tags', 'premium')
  .orderBy('created_at', SortDirection.DESC)
  .orderBy('username', SortDirection.ASC)
  .limit(50)
  .offset(0)
  .select('username', 'email', 'created_at')
  .execute() // Returns UserRaw[] with SurrealDB types

console.log('Complex query raw result:', rawResult)

// Chaining multiple operations with transformation
const result = await query<UserRaw, User>(connectionProvider, userTable)
  .where({ active: true })
  .where('created_at', Op.GREATER_THAN, new Date('2024-01-01'))
  .whereContains('tags', 'premium')
  .orderBy('created_at', SortDirection.DESC)
  .orderBy('username', SortDirection.ASC)
  .limit(50)
  .offset(0)
  .select('username', 'email', 'created_at')
  .map(mapUser)
  .execute()

console.log('Complex query transformed result:', result)
```

### Custom Mapping

```typescript
// Using utility types and helper functions
import { Serialized, createSerializer } from "surql"

type User = Serialized<UserRaw> // Automatic type conversion
const serializer = createSerializer<UserRaw>()

// Complex mapping with computed fields using helpers
const mapUserWithAge = (raw: UserRaw): User & { age: number } => ({
  id: serializer.id(raw),        // RecordId → string
  username: raw.username,
  email: raw.email,
  createdAt: serializer.date(raw.created_at), // Date → ISO string
  active: raw.active,
  age: new Date().getFullYear() - raw.birth_year
})

const usersWithAge = await query<UserRaw, User & { age: number }>(connectionProvider, userTable)
  .map(mapUserWithAge)
  .execute()

// Complex mapping with manual conversion (still works)
const mapUserWithAgeManual = (raw: UserRaw): User & { age: number } => ({
  id: raw.id.toString(),
  username: raw.username,
  email: raw.email,
  createdAt: raw.created_at.toISOString(),
  active: raw.active,
  age: new Date().getFullYear() - raw.birth_year
})

const usersWithAgeManual = await query<UserRaw, User & { age: number }>(connectionProvider, userTable)
  .map(mapUserWithAgeManual)
  .execute()
```

## Examples

Examples are available in the `examples/` directory. They assume you have a SurrealDB instance and the necessary database/schema set up.

```bash
# Run a specific example
deno run -A examples/basicCrud.ts
```

## 🤓 Contributing

Want to contribute? Please see my ***non-existing*** [Contributing Guidelines](./CONTRIBUTING.md) for details. For now, just open an issue or PR with your ideas!

### Local Development Setup

Clone the repository and make your changes in the `src` directory. Provide clear commit messages and follow the project's coding style.

Clone the repository. Tasks are defined in the `deno.json` file.

```bash
# Clone the repository
git clone https://github.com/albedosehen/surql.git
cd surql
```

You should run these yourself before pushing to the repository. GitHub actions will also run these tasks automatically to check the code.

- `deno check` to check for type errors
- `deno lint` to run the linter
- `deno fmt` to format the code
- `deno task test` to run the tests

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ❤️ Acknowledgments

- Built for the [SurrealDB](https://surrealdb.com/) ecosystem
- Designed for [Deno](https://deno.land/), *the superior JavaScript runtime* 🦖
- Inspired by modern query builders (LINQ, SQLAlchemy, etc.)

***Note:** I am not affiliated with SurrealDB or Deno. This is an independent project built to enhance the SurrealDB experience for developers using Deno.*

---

![Static Badge](https://img.shields.io/badge/made_with_%E2%9D%A4%EF%B8%8F-green)
