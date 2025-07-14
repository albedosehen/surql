# SurQL - Promise-Based SurrealDB Query Builder

[![JSR Version](https://img.shields.io/jsr/v/@albedosehen/surql)](https://jsr.io/@albedosehen/surql)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/dotwin/dotwin)

SurQL is a modern, type-safe query builder for SurrealDB designed for Deno. It provides a fluent interface for building complex queries using native JavaScript Promises, eliminating external dependencies while maintaining excellent developer experience.

## ✨ Features

### Core Features

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

- **Merge Operations**: Partial data updates preserving existing fields
- **JSON Patch Support**: RFC 6902 compliant patch operations (add, remove, replace, move, copy, test)
- **Upsert Operations**: Smart insert-or-update with conflict resolution
- **Fluent Builder API**: Chainable methods for complex data operations

### Enhanced Query Builder

- **GROUP BY Support**: Advanced grouping with multiple field support
- **HAVING Conditions**: Filtered aggregations with fluent syntax
- **Aggregation Functions**: count(), sum(), avg(), min(), max() with automatic aliasing
- **Enhanced Pagination**: Traditional limit/offset plus page() method
- **Capability Composition**: Mix and match query capabilities as needed

### Quality & Testing

- **Well Tested**: Comprehensive test suite with 95%+ coverage (1,970+ test lines)
- **Well Documented**: Complete examples and migration guides
- **Security Focused**: Input validation and injection prevention
- **Backward Compatible**: All existing APIs remain unchanged

## Documentation

- **[Changelog](./CHANGELOG.md)** - Detailed release notes and migration information

## Installation

### Using Deno

```typescript
// Import directly from JSR (when published)
import { query, create, update, remove, SurrealConnectionManager, Serialized, createSerializer } from "jsr:@/surql"

// Or import from URL
import { query, create, update, remove, SurrealConnectionManager, Serialized, createSerializer } from "https://deno.land/x/surql/mod.ts"
```

### Using deno.json

```json
{
  "imports": {
    "surql": "jsr:https://deno.land/x/surql/mod.ts"
  }
}
```

```typescript
import { query, create, update, remove, SurrealConnectionManager, Serialized, createSerializer } from "surql"
```

## ⚡ Quick Start

### Setting up Connection

```typescript
import { SurQLClient } from "surql"

const client = new SurQLClient({
  host: 'localhost',
  port: '8000',
  namespace: 'your_namespace',
  database: 'your_database',
  username: 'your_username',
  password: 'your_password'
})
```

### Authentication

```typescript
// Root user authentication
const rootToken = await client.signin({
  type: 'root',
  username: 'root',
  password: 'password'
})

// Scope user authentication
const userToken = await client.signin({
  type: 'scope',
  namespace: 'myapp',
  database: 'production',
  scope: 'user',
  username: 'john@example.com',
  password: 'mypassword'
})

// Sign up new scope user
const newUserToken = await client.signup({
  namespace: 'myapp',
  database: 'production',
  scope: 'user',
  username: 'jane@example.com',
  password: 'newpassword',
  email: 'jane@example.com',
  name: 'Jane Doe'
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

```typescript
import { SurQLClient } from "surql"
import { RecordId } from "surrealdb"

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

### Smart Defaults Example (New)

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

// New page() method
const pageResults = await client.query('products')
  .where({ in_stock: true })
  .orderBy('name')
  .page(3, 20) // Page 3, 20 items per page
  .execute()

// Complex pagination with grouping
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

#### Simple Queries

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

#### Advanced Filtering

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

### Serialized `<T>` Utility Type

Automatically converts SurrealDB types to their serialized equivalents:

```typescript
interface UserRaw {
  id: RecordId
  username: string
  email: string
  created_at: Date
  profile: {
    bio: string
    avatar_url?: string
  }
}

// Automatic type conversion
type User = Serialized<UserRaw>
// Result: {
//   id: string;
//   username: string;
//   email: string;
//   created_at: string;
//   profile: {
//     bio: string;
//     avatar_url?: string;
//   }
// }
```

### createSerializer() Helper Functions

Provides robust transformation utilities that handle complex data structures, edge cases, and provide reusable conversion logic:

```typescript
import { createSerializer } from "surql"

// Complex data structure with arrays, optional fields, and nested objects
interface PostRaw {
  id: RecordId
  authorId: RecordId
  collaboratorIds: RecordId[]
  categoryId?: RecordId
  publishedAt: Date
  updatedAt?: Date
  archivedAt: Date | null
  tags: { id: RecordId; name: string; createdAt: Date }[]
  metadata: {
    viewCount: number
    lastViewed?: Date
  }
}

interface Post {
  id: string
  authorId: string
  collaboratorIds: string[]
  categoryId?: string
  publishedAt: string
  updatedAt?: string
  archivedAt: string | null
  tags: { id: string; name: string; createdAt: string }[]
  metadata: {
    viewCount: number
    lastViewed?: string
  }
}

// Create reusable serializer for consistent transformations
const serializer = createSerializer<PostRaw>()

// Complex mapper handling arrays, optional fields, and nested transformations
const mapPost = (raw: PostRaw): Post => ({
  id: serializer.id(raw),
  authorId: serializer.id(raw, 'authorId'),
  collaboratorIds: serializer.recordIdArray(raw.collaboratorIds),
  categoryId: serializer.optionalId(raw.categoryId),
  publishedAt: serializer.date(raw.publishedAt),
  updatedAt: serializer.optionalDate(raw.updatedAt),
  archivedAt: serializer.nullableDate(raw.archivedAt),
  tags: raw.tags.map(tag => ({
    id: serializer.id(tag),
    name: tag.name,
    createdAt: serializer.date(tag.createdAt)
  })),
  metadata: {
    viewCount: raw.metadata.viewCount,
    lastViewed: serializer.optionalDate(raw.metadata.lastViewed)
  }
})

// Reuse same serializer across different mappers for consistency
const mapAuthor = (raw: UserRaw): Author => ({
  id: serializer.id(raw),
  joinedAt: serializer.date(raw.created_at),
  lastActive: serializer.optionalDate(raw.lastActive)
})

const mapComment = (raw: CommentRaw): Comment => ({
  id: serializer.id(raw),
  postId: serializer.id(raw, 'postId'),
  authorId: serializer.id(raw, 'authorId'),
  createdAt: serializer.date(raw.createdAt),
  editedAt: serializer.optionalDate(raw.editedAt)
})

// Compare with a manual approach without the serializer
//
const mapPostManual = (raw: PostRaw): Post => ({
  id: raw.id?.toString() ?? '',
  authorId: raw.authorId?.toString() ?? '',
  collaboratorIds: raw.collaboratorIds?.map(id => id?.toString()).filter(Boolean) ?? [],
  categoryId: raw.categoryId ? raw.categoryId.toString() : undefined,
  publishedAt: raw.publishedAt?.toISOString() ?? '',
  updatedAt: raw.updatedAt ? raw.updatedAt.toISOString() : undefined,
  archivedAt: raw.archivedAt ? raw.archivedAt.toISOString() : null,
  tags: raw.tags?.map(tag => ({
    id: tag.id?.toString() ?? '',
    name: tag.name,
    createdAt: tag.createdAt?.toISOString() ?? ''
  })) ?? [],
  metadata: {
    viewCount: raw.metadata?.viewCount ?? 0,
    lastViewed: raw.metadata?.lastViewed ? raw.metadata.lastViewed.toISOString() : undefined
  }
})

// Use serializer with error handling and consistent transformations
try {
  const posts = await query<PostRaw, Post>(connectionProvider, postTable)
    .where({ published: true })
    .map(mapPost) // Clean, consistent, handles all edge cases
    .execute()

  const authors = await query<UserRaw, Author>(connectionProvider, userTable)
    .where({ role: 'author' })
    .map(mapAuthor) // Reuses same serializer logic
    .execute()

  console.log('Posts with consistent formatting:', posts)
  console.log('Authors with consistent formatting:', authors)
} catch (error) {
  console.error('Transformation error handled gracefully:', error)
}
```

#### Benefits Of The Serializer Helper

**🛡️ Robust Edge Case Handling:**

- `serializer.optionalId()` - Safely handles `RecordId | undefined`
- `serializer.nullableDate()` - Properly handles `Date | null`
- `serializer.recordIdArray()` - Transforms arrays while filtering invalid entries
- Consistent `null` vs `undefined` handling

**🔄 Reusability & Consistency:**

- Same serializer instance across multiple mappers
- Consistent transformation logic throughout application
- Reduced code duplication and maintenance burden
- Standardized error handling

**🚨 Error Prevention:**

- No more manual null checking for every field
- Automatic filtering of invalid array entries
- Type-safe transformations with proper fallbacks
- Prevents runtime errors from malformed data

**🗑️ Cleaner Syntax:**

- Eliminates repetitive `?.toString()` and `?.toISOString()` calls
- Reduces cognitive load when reading transformation code
- Self-documenting transformation intent
- Easier to maintain and modify

### Optional Mapping with Warnings

Functions provide helpful warnings when no mapper is provided but still return results:

```typescript
// This will work but show a development warning
const rawUsers = await query<UserRaw>(connectionProvider, userTable)
  .execute() // Warning: Consider using .map() for type transformation

// Suppress warning with explicit raw data usage
const rawUsers = await query<UserRaw>(connectionProvider, userTable, { warnings: 'suppress' })
  .execute() // Use raw SurrealDB types intentionally
```

### Mixing Patterns

You can mix both patterns in the same application based on your needs:

```typescript
// Quick prototyping - use raw types
const rawData = await query<PostRaw>(connectionProvider, postTable)
  .where({ published: true })
  .execute()

// Production code - use explicit transformation
const posts = await query<PostRaw, Post>(connectionProvider, postTable)
  .where({ published: true })
  .map(mapPost)
  .execute()

// Utility types for gradual migration
type Post = Serialized<PostRaw>
const serializer = createSerializer<PostRaw>()
```

## 👾 Error Handling

SurQL uses standard JavaScript Promise patterns with enhanced error types.

### Authentication Errors

```typescript
import {
  AuthenticationError,
  SessionExpiredError,
  InvalidCredentialsError,
  InvalidTokenError,
  SignupError,
  ScopeAuthenticationError
} from "surql"

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

// Session management errors
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

### CRUD Operation Errors

```typescript
import { PatchOperationError } from "surql"

// Patch operation errors
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

// Merge/Upsert errors
try {
  await client.merge('users', 'nonexistent:id', { name: 'test' }).execute()
} catch (error) {
  if (error.message.includes('returned no records')) {
    console.error('Record not found for merge operation')
  }
}
```

### Try-Catch Pattern

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

### Promise Chain Pattern

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

## 🔧 Advanced Usage

### Connection Management

```typescript
// Connection pooling is handled automatically
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

## Performance

SurQL is optimized for performance with:

- **Minimal external dependencies** - Deno-first design with only the `surrealdb` package
- **Native Promise execution** - Direct Promise chains without wrappers
- **Efficient connection pooling** - Automatic connection reuse
- **TypeScript optimizations** - Compile-time type checking

## Testing

```bash
# Run all tests
deno test --allow-read --allow-write --allow-net --allow-sys

# Run specific test files
deno test src/read_test.ts src/write_test.ts --allow-read --allow-write --allow-net --allow-sys

# Run with coverage
deno task test:coverage
```

## 🔒 Security Considerations

### Authentication Security

```typescript
// Use environment variables for credentials
const client = new SurQLClient({
  host: process.env.SURREALDB_HOST,
  port: process.env.SURREALDB_PORT,
  namespace: process.env.SURREALDB_NAMESPACE,
  database: process.env.SURREALDB_DATABASE
})

// Secure credential handling
try {
  const token = await client.signin({
    type: 'scope',
    namespace: 'myapp',
    database: 'prod',
    scope: 'user',
    username: userInput.username, // Validated input
    password: userInput.password  // Secure password handling
  })

  // Store token securely (not in localStorage in browsers)
  secureStorage.setToken(token.token)
} catch (error) {
  // Don't expose internal errors to users
  console.error('Authentication failed:', error)
  throw new Error('Invalid credentials')
}
```

### Query Security

```typescript
// All user inputs are automatically parameterized
const safeResults = await client.query('users')
  .where('email', Op.EQUALS, userEmail) // Automatically parameterized
  .where({ role: userRole }) // Safe object syntax
  .execute()

// Field names are validated to prevent injection
try {
  await client.query('users')
    .groupBy('valid_field_name') // Validated against injection patterns
    .having('COUNT(*)', Op.GREATER_THAN, 10) // Parameterized values
    .execute()
} catch (error) {
  // Invalid field names throw validation errors
}
```

### New Authentication Features

```typescript
// Before: Manual credential management
const connectionProvider = new SurrealConnectionManager({
  username: 'user',
  password: 'pass'
})

// After: Full authentication lifecycle
const client = new SurQLClient(config)
await client.signin({ type: 'scope', ... })
// Automatic token management, session tracking, etc.
```

### New CRUD Operations

```typescript
// Before: Manual UPDATE queries for partial updates
await client.query('UPDATE user:123 SET email = $email', { email: newEmail })

// After: Semantic merge operations
await client.merge('users', 'user:123', { email: newEmail }).execute()

// Before: Complex conditional logic for upserts
// After: Built-in upsert with conflict resolution
await client.upsert('users', userData).onConflict('username').execute()
```

### Enhanced Query Capabilities

```typescript
// Before: Manual GROUP BY and aggregation queries
await client.query('SELECT category, COUNT(*) as count FROM products GROUP BY category')

// After: Fluent aggregation API
await client.query('products')
  .groupBy('category')
  .count()
  .having('COUNT(*)', Op.GREATER_THAN, 10)
  .execute()
```

## Examples

### E-commerce with Authentication

```typescript
// Authenticate as admin
await client.signin({
  type: 'scope',
  namespace: 'ecommerce',
  database: 'production',
  scope: 'admin',
  username: 'admin@store.com',
  password: process.env.ADMIN_PASSWORD
})

// Get premium customers with enhanced analytics
const premiumInsights = await client.query('orders')
  .groupBy('customer_id')
  .sum('total_amount')
  .count('order_id')
  .avg('order_value')
  .having('SUM(total_amount)', Op.GREATER_THAN, 10000)
  .having('COUNT(order_id)', Op.GREATER_THAN, 20)
  .orderBy('sum_total_amount', SortDirection.DESC)
  .page(1, 50)
  .execute()

// Upsert product with inventory management
const product = await client.upsert('products', {
  sku: 'WIDGET-PRO-2024',
  name: 'Widget Pro 2024',
  price: 299.99,
  category: 'electronics',
  inventory: 150
})
  .withId('product:widget-pro-2024')
  .execute()

// Apply dynamic pricing with patch operations
await client.patch('products', product.id, [
  { op: 'replace', path: '/price', value: 279.99 },
  { op: 'add', path: '/sale_end_date', value: '2024-12-31' },
  { op: 'add', path: '/tags/-', value: 'on-sale' }
])
  .execute()
```

### User Management with Session Tracking

```typescript
// Authenticate user
const token = await client.signin({
  type: 'scope',
  namespace: 'myapp',
  database: 'users',
  scope: 'user',
  username: 'user@example.com',
  password: userPassword
})

// Get user analytics with session info
const userStats = await client.query('user_sessions')
  .where('user_id', Op.EQUALS, (await client.info()).id)
  .groupBy('device_type', 'location')
  .count('session_id')
  .sum('duration_minutes')
  .having('COUNT(session_id)', Op.GREATER_THAN, 5)
  .orderBy('sum_duration_minutes', SortDirection.DESC)
  .execute()

// Bulk user activation with merge operations
const inactiveUsers = await client.query('users')
  .where({ status: 'inactive' })
  .where('last_login', Op.LESS_THAN, new Date('2024-01-01'))
  .execute()

for (const user of inactiveUsers) {
  await client.merge('users', user.id, {
    status: 'reactivated',
    reactivation_date: new Date(),
    'notifications.reactivation_sent': true
  }).execute()
}

// Logout and cleanup
await client.invalidate()
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourorg/surql.git
cd surql

# Run tests
deno task test

# Run linting
deno task lint

# Format code
deno task fmt
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the [SurrealDB](https://surrealdb.com/) ecosystem
- Inspired by modern query builders and TypeScript best practices
- Optimized for [Deno](https://deno.land/) runtime

---

![Static Badge](https://img.shields.io/badge/made_with_%E2%9D%A4%EF%B8%8F-green)
