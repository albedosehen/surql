# SurQL - Promise-Based SurrealDB Query Builder

SurQL is a modern, type-safe query builder for SurrealDB designed for Deno. It provides a fluent interface for building complex queries using native JavaScript Promises, eliminating external dependencies while maintaining excellent developer experience.

## ✨ Features

- **🚀 Native Promises**: Built with standard JavaScript Promises - no external dependencies
- **🦕 Deno First**: Designed specifically for Deno with proper import conventions
- **🔒 Type Safe**: Full TypeScript support with generic types and strict typing
- **⚡ High Performance**: No abstraction overhead - direct Promise execution
- **🔗 Fluent Interface**: Chainable methods for readable query construction
- **🎯 Zero Dependencies**: Minimal footprint with no external dependencies
- **🧠 Smart Defaults**: T = R defaults allow omitting type parameters when no transformation needed
- **🛠️ Utility Types**: Automated type conversion with `Serialized<T>` and helper functions
- **🧪 Well Tested**: Comprehensive test suite ensuring reliability
- **📚 Well Documented**: Complete examples and migration guides

## 📦 Installation

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
import { SurrealConnectionManager } from "surql"

const connectionProvider = new SurrealConnectionManager({
  host: 'localhost',
  port: '8000',
  namespace: 'your_namespace',
  database: 'your_database',
  username: 'your_username',
  password: 'your_password'
})
```

### Basic Query Example

```typescript
import { query } from "surql"
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

// Define table reference
const userTable = { users: 'users' }

// Create mapping function
const mapUser = (raw: UserRaw): User => ({
  id: raw.id.toString(),
  username: raw.username,
  email: raw.email,
  createdAt: raw.created_at.toISOString(),
  active: raw.active
})

// Execute query with explicit transformation (existing pattern)
try {
  const activeUsers = await query<UserRaw, User>(connectionProvider, userTable)
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
import { query, Serialized, createSerializer } from "surql"

// NEW: Simplified usage with T = R defaults
// No explicit transformation - works directly with raw SurrealDB types
try {
  const rawUsers = await query<UserRaw>(connectionProvider, userTable)
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

## API Reference

### Reading Data

#### Simple Queries

```typescript
// NEW: Get all users with raw SurrealDB types (T = R default)
const rawUsers = await query<UserRaw>(connectionProvider, userTable)
  .execute() // Returns UserRaw[] with RecordId and Date objects

// EXISTING: Get all users with explicit transformation
const users = await query<UserRaw, User>(connectionProvider, userTable)
  .map(mapUser)
  .execute()

// NEW: Get first user with raw types
const firstRawUser = await query<UserRaw>(connectionProvider, userTable)
  .first() // Returns UserRaw | undefined

// EXISTING: Get first user with transformation
const firstUser = await query<UserRaw, User>(connectionProvider, userTable)
  .map(mapUser)
  .first()

// Use unwrap() for direct Promise access (works with both patterns)
const users = await query<UserRaw, User>(connectionProvider, userTable)
  .map(mapUser)
  .unwrap()
```

#### Advanced Filtering

```typescript
// Object-style WHERE conditions with raw types
const rawUsers = await query<UserRaw>(connectionProvider, userTable)
  .where({
    active: true,
    role: 'admin',
    'profile.verified': true
  })
  .execute() // Returns UserRaw[] with SurrealDB types

// Object-style WHERE conditions with transformation
const users = await query<UserRaw, User>(connectionProvider, userTable)
  .where({
    active: true,
    role: 'admin',
    'profile.verified': true
  })
  .map(mapUser)
  .execute()

// Fluent-style WHERE conditions with raw types
const rawFilteredUsers = await query<UserRaw>(connectionProvider, userTable)
  .where('age', Op.GREATER_THAN, 18)
  .where('username', Op.LIKE, '%admin%')
  .execute()

// Fluent-style WHERE conditions with transformation
const users = await query<UserRaw, User>(connectionProvider, userTable)
  .where('age', Op.GREATER_THAN, 18)
  .where('username', Op.LIKE, '%admin%')
  .map(mapUser)
  .execute()

// Convenience methods work with both patterns
const verifiedUsers = await query<UserRaw>(connectionProvider, userTable)
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

SurQL uses standard JavaScript Promise patterns for error handling:

### Try-Catch Pattern

```typescript
try {
  const users = await query<UserRaw, User>(connectionProvider, userTable)
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
query<UserRaw, User>(connectionProvider, userTable)
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

## Examples

### E-commerce Query

```typescript
// Get premium customers with raw types for quick analysis
const rawPremiumCustomers = await query<CustomerRaw>(connectionProvider, customerTable)
  .where({ tier: 'premium', active: true })
  .where('lastOrder', Op.GREATER_THAN, new Date('2024-01-01'))
  .orderBy('totalSpent', SortDirection.DESC)
  .limit(100)
  .execute() // Returns CustomerRaw[] with SurrealDB types

// Get premium customers with transformation for UI display
const premiumCustomers = await query<CustomerRaw, Customer>(connectionProvider, customerTable)
  .where({ tier: 'premium', active: true })
  .where('lastOrder', Op.GREATER_THAN, new Date('2024-01-01'))
  .orderBy('totalSpent', SortDirection.DESC)
  .limit(100)
  .map(mapCustomer)
  .execute()

// Create new order with raw types
const newRawOrder = await create<OrderRaw>(connectionProvider, orderTable, {
  customerId: rawPremiumCustomers[0].id, // Using RecordId directly
  items: [
    { productId: 'prod:123', quantity: 2, price: 29.99 },
    { productId: 'prod:456', quantity: 1, price: 49.99 }
  ],
  total: 109.97,
  status: 'pending'
})
  .execute()

// Create new order with transformation
const newOrder = await create<OrderRaw, Order>(connectionProvider, orderTable, {
  customerId: premiumCustomers[0].id, // Using string id from transformed data
  items: [
    { productId: 'prod:123', quantity: 2, price: 29.99 },
    { productId: 'prod:456', quantity: 1, price: 49.99 }
  ],
  total: 109.97,
  status: 'pending'
})
  .map(mapOrder)
  .execute()
```

### User Management

```typescript
// Bulk user operations with raw types for processing
const rawInactiveUsers = await query<UserRaw>(connectionProvider, userTable)
  .where({ active: false })
  .where('lastLogin', Op.LESS_THAN, new Date('2023-01-01'))
  .execute() // Returns UserRaw[] with RecordId objects

// Activate users using raw RecordId objects directly
for (const user of rawInactiveUsers) {
  await update<UserRaw>(connectionProvider, userTable, user.id, {
    active: true,
    lastLogin: new Date(),
    reactivatedAt: new Date()
  })
    .execute()
}

// Bulk user operations with transformation
const users = await query<UserRaw, User>(connectionProvider, userTable)
  .where({ active: false })
  .where('lastLogin', Op.LESS_THAN, new Date('2023-01-01'))
  .map(mapUser)
  .execute()

// Activate users and update login with transformation
for (const user of users) {
  await update<UserRaw, User>(connectionProvider, userTable, user.id, {
    active: true,
    lastLogin: new Date(),
    reactivatedAt: new Date()
  })
    .map(mapUser)
    .execute()
}
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

**SurQL** - Type-safe, Promise-native SurrealDB queries for modern TypeScript applications.
