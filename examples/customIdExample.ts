import { SurQLClient } from '@oneiriq/surql'

// Setup connection
const client = new SurQLClient({
  database: Deno.env.get('DB_DATABASE') || 'db',
  namespace: Deno.env.get('DB_NAMESPACE') || 'ns',
  host: Deno.env.get('DB_HOST') || 'localhost',
  username: Deno.env.get('DB_USERNAME') || 'root',
  password: Deno.env.get('DB_PASSWORD') || 'password',
  port: Deno.env.get('DB_PORT') || '8000',
  protocol: 'http',
  useSSL: false,
})

// Example 1: Auto-generated ID (current behavior)
const user1 = await client.create('users', {
  name: 'John Doe',
  email: 'john@example.com'
}).execute()

console.log('Auto-generated ID user:', user1)

// Example 2: Explicit ID via withId() method
const user2 = await client.create('users', {
  name: 'Jane Smith',
  email: 'jane@example.com'
})
  .withId('user:jane-smith')
  .execute()

console.log('Explicit ID user:', user2)

// Example 3: ID from data object
const user3 = await client.create('users', {
  id: 'user:bob-johnson',
  name: 'Bob Johnson',
  email: 'bob@example.com'
}).execute()

console.log('ID from data user:', user3)

// Clean up
await client.remove('users', user1.id).execute()
await client.remove('users', user2.id).execute()
await client.remove('users', user3.id).execute()

await client.invalidate()