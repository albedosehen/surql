import { Serialized, createSerializer, RecordId, query, SurrealConnectionManager } from "@albedosehen/surql";

// Setup connection
const conn = new SurrealConnectionManager({
  database: Deno.env.get('DB_DATABASE') || 'db',
  namespace: Deno.env.get('DB_NAMESPACE') || 'ns',
  host: Deno.env.get('DB_HOST') || 'localhost',
  username: Deno.env.get('DB_USERNAME') || 'root',
  password: Deno.env.get('DB_PASSWORD') || 'password',
  port: Deno.env.get('DB_PORT') || '8000',
  protocol: 'http',
  useSSL: false,
})

// Define the raw record structure in the database
interface User {
  id: RecordId
  username: string
  email: string
  created_at: Date
  updated_at?: Date
  birth_year: number
  active: boolean
  profile: {
    bio: string
    avatar_url?: string
  }
}

// Create a serialized model for the User
type SerializedUser = Serialized<User> & {
  age: number // Add additional properties
}

const serializer = createSerializer<User>()

const mapUser = (user: User): SerializedUser & {
  age: number // Extend the model and add computed properties if you want
} => ({
  id: serializer.id(user), // RecordId → string
  username: user.username,
  email: user.email,
  created_at: serializer.date(user.created_at), // Date → ISO string
  updated_at: serializer.optionalDate(user.updated_at), // Date → ISO string if exists
  active: user.active,
  birth_year: user.birth_year,
  profile: user.profile,
  age: new Date().getFullYear() - user.birth_year
})

const users = await query<User, SerializedUser & { age: number }>(conn, 'user_account')
  .map(mapUser)
  .execute()

console.log('Users with Age (Using Serializer):', users)

await conn.close()