/**
 * This example file demonstrates three separate queries and mappings for complex data structures.
 * It shows how to handle nested objects, arrays, and optional fields using serializers.
 *
 * Raw models represent the data structure in your database.
 * The models are used internally within your application and undergo transformations to match the expected format.
 */
import {
  createSerializer,
  RecordId,
  Serialized,
  SurQLClient
  } from '@albedosehen/surql';

/**
 * tagModel.ts
 */
interface TagRaw {
  id: RecordId
  name: string
  createdAt: Date
}

/**
 * postModel.ts
 */
interface PostRaw { // Raw record structure in the database
  id: RecordId
  authorId: RecordId
  collaboratorIds: RecordId[]
  categoryId?: RecordId
  publishedAt: Date
  updatedAt?: Date
  archivedAt: Date | null
  tags: TagRaw[]
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

/**
 * authorModel.ts
 */

interface AuthorRaw {
  id: RecordId
  userId: RecordId
  createdAt: Date
  lastActive?: Date
}

const authorSerializer = createSerializer<AuthorRaw>()

/**
 * commentModel.ts
 */

interface CommentRaw {
  id: RecordId
  postId: RecordId
  authorId: RecordId
  createdAt: Date
  editedAt?: Date
}

// Automatic model using the serializer typing
type Comment = Serialized<CommentRaw>
const commentSerializer = createSerializer<CommentRaw>()

const mapComment = (raw: CommentRaw): Comment => ({
  id: commentSerializer.id(raw),
  postId: commentSerializer.recordId(raw.postId),
  authorId: commentSerializer.recordId(raw.authorId),
  createdAt: commentSerializer.date(raw.createdAt),
  editedAt: commentSerializer.optionalDate(raw.editedAt)
})

/**
 * main
 */
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

// Query posts, authors, comments
try {
  /**
   *  The post constant uses manual transforms in an attempt to adhere to the defined model.
   *  It's noisy and error-prone, especially with nested structures.
   * */
  const postA = await client.query<PostRaw, Post>('posts')
    .where({ published: true })
    .map((raw: PostRaw): Post => ({
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
    }))
    .first()

  if (!postA) { throw new Error('No published posts found') }


  /** Using a serializer, we reduce boilerplate and improve maintainability */
  const serializer = createSerializer()
  const postB = await client.query<PostRaw, Serialized<PostRaw>>('posts')
    .where({ published: true })
    .map((raw: PostRaw): Serialized<PostRaw> => ({
      id: serializer.id(raw),
      authorId: serializer.recordId(raw.authorId),
      collaboratorIds: serializer.recordIdArray(raw.collaboratorIds),
      categoryId: serializer.optionalRecordId(raw.categoryId),
      publishedAt: serializer.date(raw.publishedAt),
      updatedAt: serializer.optionalDate(raw.updatedAt),
      archivedAt: serializer.dateOrNull(raw.archivedAt),
      tags: serializer.objectArray(raw.tags, tag => ({
        id: serializer.recordId(tag.id),
        name: tag.name,
        createdAt: serializer.date(tag.createdAt)
      })),
      metadata: {
        viewCount: serializer.number(raw.metadata?.viewCount),
        lastViewed: serializer.optionalDate(raw.metadata?.lastViewed)
      }
    }))
    .first()

  if (!postB) { throw new Error('No published posts found') }

  const author = await client.query<AuthorRaw, Serialized<AuthorRaw>>('users')
    .where({ id: postB.authorId })
    .map((raw: AuthorRaw): Serialized<AuthorRaw> => ({
      id: serializer.recordId(raw.id),
      userId: serializer.recordId(raw.userId),
      createdAt: serializer.date(raw.createdAt),
      lastActive: serializer.optionalDate(raw.lastActive)
    }))
    .first()

  if (!author) { throw new Error('Author not found for the post') }

  const comments = await client.query<CommentRaw, Comment>('comments')
    .where({ postId: postB.id })
    .map(mapComment)
    .execute()

  console.log('(Without Serializer) PostA still produces a consistent result:', postA)
  console.log('PostB:', postB)
  console.log('Author:', author)
  console.log('Comments:', comments)
} catch (error) {
  console.error('Transformation error handled gracefully:', error)
} finally {
  await client.invalidate()
}