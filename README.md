# SurQL - SurrealDB Query Builder

[![JSR Version](https://img.shields.io/jsr/v/@albedosehen/surql)](https://jsr.io/@albedosehen/surql)
[![NPM Version](https://img.shields.io/npm/v/@albedosehen/surql)](https://www.npmjs.com/package/@albedosehen/surql)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/dotwin/dotwin)

I built SurQL to be a modern, type-safe query builder for SurrealDB available for Deno and Node.js. It provides a fluent interface for building complex queries using native TypeScript. It also aims to simplify client instantiation, ease data manipulation, and improve the security posture for developers and users using sanitization techniques. This library is designed to work seamlessly with both Deno and Node.js runtimes, leveraging native Promise support and TypeScript capabilities.

Don't know what SurrealDB is? [Learn more about the modern database here!](https://surrealdb.com/)

## ✨ Features

### Core Features

- **Fluent Builder API**: Chainable methods for complex data operations
- **Native Promises**: Built with standard JavaScript Promises - no external dependencies
- **Multi-Runtime Support**: Works seamlessly with both Deno and Node.js (v18+)
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

---

## SurrealDB SurQL Client – Quick Start

---

### 1. Installation

#### Install from NPM (Node.js)

For Node.js projects, install via npm, yarn, or pnpm:

```bash
npm install @albedosehen/surql
```

```bash
yarn add @albedosehen/surql
```

```bash
pnpm add @albedosehen/surql
```

Then import in your project:

```typescript
import { SurQLClient, query, SurrealConnectionManager } from '@albedosehen/surql'
```

#### Install from JSR (Deno)

In your Deno project, import SurQL directly from JSR:

```typescript
import { query, SurrealConnectionManager } from "jsr:@albedosehen/surql"
```

**Optional:**
Set up an alias in your `deno.json` for simpler imports:

```json
{
  "imports": {
    "surql": "jsr:@albedosehen/surql"
  }
}
```

Then you can import:

```typescript
import { query, SurrealConnectionManager } from "surql"
```

---

### 2. Connecting to SurrealDB

You need your SurrealDB server running and reachable.

#### Environment Variables

Always store credentials (like usernames and passwords) in environment variables—**never** hardcode secrets in code.

---

### 3. Authentication

SurQL supports multiple authentication types. Here are common examples:

#### Root User Authentication

```typescript
const rootToken = await client.signin({
  type: 'root',
  username: Deno.env.get('SURREALDB_ROOT_USERNAME') ?? 'root',
  password: Deno.env.get('SURREALDB_ROOT_PASSWORD') ?? 'password'
});
```

#### Namespace/Database/Scope User Authentication

```typescript
const userToken = await client.signin({
  type: 'scope',
  namespace: Deno.env.get('SURREALDB_NAMESPACE') ?? 'dev',
  database: Deno.env.get('SURREALDB_DATABASE') ?? 'myapp',
  scope: 'user',
  username: Deno.env.get('SURREALDB_USER_USERNAME') ?? 'username',
  password: Deno.env.get('SURREALDB_USER_PASSWORD') ?? 'password'
});
```

#### Sign Up a New Scope User

```typescript
const newUserToken = await client.signup({
  namespace: Deno.env.get('SURREALDB_NAMESPACE') ?? 'dev',
  database: Deno.env.get('SURREALDB_DATABASE') ?? 'myapp',
  scope: 'user',
  username: 'randomuser',
  password: 'randompassword',
  email: 'random@example.com',
  name: 'Random User'
});
```

---

#### Session Management

```typescript
if (client.isAuthenticated()) {
  const sessionInfo = await client.info();
  console.log('Logged in as:', sessionInfo.id);
  console.log('Session expires:', sessionInfo.expires);
}

// Sign out
await client.invalidate();
```

---

### 4. Basic Query Example

Once authenticated, you can query your SurrealDB instance.

```typescript
const result = await client.query(conn, 'posts', { warnings: 'suppress' })
  .where({ published: true })
  .execute();
```

#### Using Strong Typing & Mapping

```typescript
import { SurQLClient, RecordId } from "surql"

// Define types for raw and serialized user data
interface UserRaw {
  id: RecordId;
  username: string;
  email: string;
  created_at: Date;
  active: boolean;
}

interface SerializedUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  active: boolean;
}

// Mapper to convert SurrealDB types to plain objects
const mapUser = (raw: UserRaw): SerializedUser => ({
  id: raw.id.toString(),
  username: raw.username,
  email: raw.email,
  createdAt: raw.created_at.toISOString(),
  active: raw.active
});

// Execute a query and map the results
try {
  const activeUsers = await client.query<UserRaw, SerializedUser>('users')
    .where({ active: true })
    .orderBy('username')
    .limit(10)
    .map(mapUser)
    .execute();

  console.log('Found active users:', activeUsers);
} catch (error) {
  console.error('Query failed:', error);
}
```

---

### 5. Smart Defaults Example

You can automatically serialize raw SurrealDB records using SurQL utility types:

```typescript
import { SurQLClient, Serialized, createSerializer } from "surql"

try {
  const rawUsers = await client.query<UserRaw>('users')
    .where({ active: true })
    .orderBy('username')
    .limit(10)
    .execute(); // Array of UserRaw

  console.log('Raw users with SurrealDB types:', rawUsers);

  // Use the Serialized utility type
  type SerializedUser = Serialized<UserRaw>; // id: string; created_at: string; etc.

  // Create serializer
  const serializer = createSerializer<UserRaw>();
  const transformedUsers: SerializedUser[] = rawUsers.map(raw => ({
    id: serializer.id(raw),
    username: raw.username,
    email: raw.email,
    created_at: serializer.date(raw.created_at),
    active: raw.active
  }));

  console.log('Transformed users:', transformedUsers);
} catch (error) {
  console.error('Query failed:', error);
}
```

---

### 6. API Reference

#### Authentication Methods

Root User

```typescript
await client.signin({ type: 'root', username: 'root', password: 'password' });
```

Namespace Admin

```typescript
await client.signin({ type: 'namespace', namespace: 'myapp', username: 'admin', password: 'password' });
```

Database User

```typescript
await client.signin({
  type: 'database',
  namespace: 'myapp',
  database: 'production',
  username: 'dbuser',
  password: 'password'
});
```

Scope User

```typescript
await client.signin({
  type: 'scope',
  namespace: 'myapp',
  database: 'production',
  scope: 'user',
  username: 'john@example.com',
  password: 'userpassword'
});
```

Sign Up Scope User

```typescript
await client.signup({
  namespace: 'myapp',
  database: 'production',
  scope: 'user',
  username: 'jane@example.com',
  password: 'newpassword',
  email: 'jane@example.com',
  name: 'Jane Doe',
  preferences: { theme: 'dark' }
});
```

Authenticate with an Existing Token

```typescript
await client.authenticate(token);

// Session management
const sessionInfo = await client.info();
await client.invalidate();
const isLoggedIn = client.isAuthenticated();
const currentToken = client.getCurrentToken();
```

---

## SurQL Query Guide

---

### 1. Reading Data

#### Simple Read Queries

```typescript
// Get all users (raw SurrealDB types)
const rawUsers = await client.query<UserRaw>('users').execute();

// Get all users with transformation
const users = await client.query<UserRaw, User>('users').map(mapUser).execute();

// Get first user (raw)
const firstRawUser = await client.query<UserRaw>('users').first();

// Get first user (transformed)
const firstUser = await client.query<UserRaw, User>('users').map(mapUser).first();
```

---

### 2. Filtering Data

#### Object-style WHERE

```typescript
const rawUsers = await client.query<UserRaw>('users')
  .where({ active: true, role: 'admin', 'profile.verified': true })
  .execute();

const users = await client.query<UserRaw, User>('users')
  .where({ active: true, role: 'admin', 'profile.verified': true })
  .map(mapUser)
  .execute();
```

#### Fluent-style WHERE

```typescript
const rawFilteredUsers = await client.query<UserRaw>('users')
  .where('age', Op.GREATER_THAN, 18)
  .where('username', Op.LIKE, '%admin%')
  .execute();

const users = await client.query<UserRaw, User>('users')
  .where('age', Op.GREATER_THAN, 18)
  .where('username', Op.LIKE, '%admin%')
  .map(mapUser)
  .execute();
```

#### Convenience WHERE Methods

```typescript
const verifiedUsers = await client.query<UserRaw>('users')
  .whereEquals('status', 'verified')
  .whereContains('tags', 'premium')
  .whereLike('email', '%@company.com')
  .execute();
```

---

### 3. Sorting and Pagination

#### Sorting

```typescript
const rawUsers = await query<UserRaw>(connectionProvider, userTable)
  .orderBy('created_at', SortDirection.DESC)
  .orderBy('username', SortDirection.ASC)
  .execute();

const users = await query<UserRaw, User>(connectionProvider, userTable)
  .orderBy('created_at', SortDirection.DESC)
  .orderBy('username', SortDirection.ASC)
  .map(mapUser)
  .execute();
```

#### Pagination

```typescript
const rawPagedUsers = await query<UserRaw>(connectionProvider, userTable)
  .limit(25)
  .offset(50)
  .execute();

const users = await query<UserRaw, User>(connectionProvider, userTable)
  .limit(25)
  .offset(50)
  .map(mapUser)
  .execute();
```

#### Field Selection

```typescript
const partialUsers = await query<UserRaw>(connectionProvider, userTable)
  .select('username', 'email', 'created_at')
  .execute();
```

---

### 4. Creating Data

```typescript
// Raw types
const newRawUser = await create<UserRaw>(connectionProvider, userTable, {
  username: 'johndoe',
  email: 'john@example.com',
  active: true,
  profile: { firstName: 'John', lastName: 'Doe' }
}).execute();

console.log('Created raw user:', newRawUser);

// With transformation
const newUser = await create<UserRaw, User>(connectionProvider, userTable, {
  username: 'johndoe',
  email: 'john@example.com',
  active: true,
  profile: { firstName: 'John', lastName: 'Doe' }
}).map(mapUser).execute();

console.log('Created transformed user:', newUser);
```

---

### 5. Updating Data

#### Merge Update

```typescript
const updatedRawUser = await update<UserRaw>(
  connectionProvider, userTable, 'users:123', {
    active: false, lastLogin: new Date()
  }
).execute();

const updatedUser = await update<UserRaw, User>(
  connectionProvider, userTable, 'users:123', {
    active: false, lastLogin: new Date()
  }
).map(mapUser).execute();
```

#### Replace Entire Record

```typescript
const replacedRawUser = await update<UserRaw>(
  connectionProvider, userTable, 'users:123', {
    username: 'newusername', email: 'new@example.com', active: true
  }
).replace().execute();

const replacedUser = await update<UserRaw, User>(
  connectionProvider, userTable, 'users:123', {
    username: 'newusername', email: 'new@example.com', active: true
  }
).replace().map(mapUser).execute();
```

---

### 6. Deleting Data

```typescript
const deletedRawUser = await remove<UserRaw>(connectionProvider, userTable, 'users:123').execute();
console.log('Deleted raw user:', deletedRawUser);

const deletedUser = await remove<UserRaw, User>(connectionProvider, userTable, 'users:123')
  .map(mapUser)
  .execute();
console.log('Deleted transformed user:', deletedUser);
```

---

### 7. Partial/Merge & Patch Operations

#### Merge (Partial Update)

```typescript
const updatedUser = await client.merge('users', 'user:123', {
  email: 'newemail@example.com', lastLogin: new Date(), preferences: { notifications: true }
}).map(mapUser).execute();

const updatedProduct = await client.merge('products', 'product:456', {
  'pricing.discount': 0.15, 'metadata.updated_by': 'admin', tags: ['sale', 'featured']
}).execute();
```

#### JSON Patch (RFC 6902)

```typescript
const patchedRecord = await client.patch('users', 'user:123', [
  { op: 'add', path: '/preferences/theme', value: 'dark' },
  { op: 'replace', path: '/email', value: 'updated@example.com' },
  { op: 'remove', path: '/tempField' },
  { op: 'move', from: '/oldField', path: '/newField' },
  { op: 'copy', from: '/template', path: '/newCopy' },
  { op: 'test', path: '/version', value: '1.0' }
]).map(mapUser).execute();

const result = await client.patch('documents', 'doc:789', [])
  .addOperation({ op: 'add', path: '/sections/-', value: newSection })
  .addOperation({ op: 'replace', path: '/lastModified', value: new Date() })
  .addOperations([
    { op: 'remove', path: '/draft' },
    { op: 'add', path: '/published', value: true }
  ])
  .execute();
```

---

### 8. Grouping, Aggregations, and HAVING

#### GROUP BY & Aggregations

```typescript
const salesByRegion = await client.query('sales')
  .groupBy('region')
  .count()
  .sum('amount')
  .avg('order_value')
  .execute();

const detailedAnalytics = await client.query('orders')
  .groupBy('customer_id', 'product_category', 'sales_channel')
  .count('order_id')
  .sum('total_amount')
  .min('order_date')
  .max('order_date')
  .execute();

const customAggregation = await client.query('products')
  .groupBy('category')
  .count()
  .sum('price')
  .avg('rating')
  .min('stock')
  .max('stock')
  .execute();
```

#### HAVING Conditions

```typescript
const highValueCustomers = await client.query('customer_orders')
  .groupBy('customer_id')
  .sum('order_total')
  .count()
  .having('SUM(order_total)', Op.GREATER_THAN, 10000)
  .having('COUNT(*)', Op.GREATER_THAN, 5)
  .execute();

const activeCategories = await client.query('products')
  .groupBy('category')
  .count()
  .having('COUNT(*) > 10')
  .having('AVG(price) BETWEEN 50 AND 500')
  .execute();

const premiumSegments = await client.query('sales')
  .groupBy('product_line', 'quarter')
  .sum('revenue')
  .avg('margin')
  .count('transactions')
  .having('SUM(revenue)', Op.GREATER_THAN, 100000)
  .having('AVG(margin)', Op.GREATER_THAN, 0.25)
  .having('COUNT(transactions)', Op.GREATER_THAN, 50)
  .execute();
```

---

### 9. Pagination (Advanced)

```typescript
// Traditional limit/offset
const paginatedResults = await client.query('users')
  .where({ active: true })
  .orderBy('created_at', SortDirection.DESC)
  .limit(25)
  .offset(50)
  .execute();

// Offset-based pagination with page number and size
const pageResults = await client.query('products')
  .where({ in_stock: true })
  .orderBy('name')
  .page(3, 20) // Page 3, 20 items per page
  .execute();

// Complex grouped/paginated example
const groupedPage = await client.query('analytics')
  .groupBy('date', 'channel')
  .sum('visits')
  .count('conversions')
  .having('SUM(visits)', Op.GREATER_THAN, 100)
  .orderBy('sum_visits', SortDirection.DESC)
  .page(1, 10)
  .execute();
```

---

#### **Tips**

- Add `.map(mapUser)` to any query to transform from raw SurrealDB types to your domain models.
- Use `execute()`, `first()`, etc., depending on your return type.
- Most patterns support both **raw** and **transformed** types.

---

### 🔩 Utility Types & Helpers

SurQL provides powerful utility types and helper functions to enhance DX while maintaining type safety.

#### Serializer Helpers

 Serialized `<T>` Utility Type Automatically converts SurrealDB types to their serialized equivalents. Useful for consistent data mapping in an application.
 The benefit of this is that it simplifies the process of working with complex data structures by providing a clear and consistent way to transform data between different formats.

The `createSerializer` Provides a simple set of transformation utilities to handle common complex data structures, edge cases, and provide reusable conversion logic. Refer to `examples/complexMapping.ts` for examples.

#### Optional Mapping with Warnings

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

### 👾 Error Handling

SurQL uses standard JavaScript Promise patterns with enhanced error types for easier troubleshooting and debugging.
The below examples are snippets of *some* error types and error handling patterns. These are optional and are provided for convenience.

#### Authentication Errors

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

#### Session Management Errors

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

#### Query & Operation Errors

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

##### Try-Catch Pattern

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

##### Promise Chain Pattern

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

---

### Connection Management

---

SurQL provides a `SurQLClient` and `SurrealConnectionManager` classes for managing authentication & connections to the database.
Both work similarly, but the class you choose depends upon your needs.

- If you require multiple concurrent operations/connections -> `SurrealConnectionManager`
- If you need a simpler interface for a single connection -> `SurQLClient`

#### SurQLClient

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

#### SurrealConnectionManager

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

---

### Examples

---

Examples are available in the `examples/` directory. They assume you have a SurrealDB instance and the necessary database/schema set up.

```bash
# Run a specific example
deno run -A examples/basicCrud.ts
```

---

## 🤓 Contributing

---

Want to contribute? Please see my ***non-existing*** [Contributing Guidelines](./CONTRIBUTING.md) for details. For now, just open an issue or PR with your ideas!

### Local Development Setup

Clone the repository and make your changes in the `src` directory. Provide clear commit messages and follow the project's coding style.

Clone the repository. Tasks are defined in the `deno.json` file.

```bash
# Clone the repository
git clone https://github.com/albedosehen/surql.git
cd surql
```

### Tasks & Testing

You should run these yourself before pushing to the repository. GitHub actions will also run these tasks automatically to check the code.

- `deno check` to check for type errors
- `deno lint` to run the linter
- `deno fmt` to format the code
- `deno task test` to run the tests

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

### ❤️ Acknowledgments

- Built for the [SurrealDB](https://surrealdb.com/) ecosystem
- Designed for [Deno](https://deno.land/) and [Node.js](https://nodejs.org/) 🦖🟢
- Inspired by modern query builders (LINQ, SQLAlchemy, etc.)

***Note:** I am not affiliated with SurrealDB or Deno. This is an independent project built to enhance the SurrealDB experience for developers using Deno.*

---

![Static Badge](https://img.shields.io/badge/made_with_%E2%9D%A4%EF%B8%8F-green)
