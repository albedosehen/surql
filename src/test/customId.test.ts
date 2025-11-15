import { assertEquals, assertNotEquals } from '@std/assert'
import { create } from '../crud/write.ts'
import { describe, it } from '@std/testing/bdd'
import { RecordId } from 'surrealdb'
import { stub } from '@std/testing/mock'
import {
  createMockConnectionStub,
  createTestUserRaw,
  mapTestUser,
  mockConnectionProvider,
  testTable,
  type TestUser,
  type TestUserRaw,
} from './helpers.ts'

describe('CreateQL - Custom ID Feature', () => {
  describe('withId() method', () => {
    it('should create a record with explicit ID using withId() method', async () => {
      const mockData = [createTestUserRaw({
        id: new RecordId('users', 'jane'),
        username: 'jane_doe',
        email: 'jane@example.com',
      })]

      const connectionStub = stub(mockConnectionProvider, 'getConnection', createMockConnectionStub(mockData))

      try {
        const createQL = create<TestUserRaw, TestUser>(mockConnectionProvider, testTable, {
          username: 'jane_doe',
          email: 'jane@example.com',
          active: true,
        })
          .withId('user:jane')
          .map(mapTestUser)

        const result = await createQL.execute()

        assertEquals(result.id, 'users:jane')
        assertEquals(result.username, 'jane_doe')
      } finally {
        connectionStub.restore()
      }
    })

    it('should work with RecordId objects in withId() method', async () => {
      const mockData = [createTestUserRaw({
        id: new RecordId('users', 'john'),
        username: 'john_doe',
        email: 'john@example.com',
      })]

      const connectionStub = stub(mockConnectionProvider, 'getConnection', createMockConnectionStub(mockData))

      try {
        const createQL = create<TestUserRaw, TestUser>(mockConnectionProvider, testTable, {
          username: 'john_doe',
          email: 'john@example.com',
          active: true,
        })
          .withId(new RecordId('users', 'john'))
          .map(mapTestUser)

        const result = await createQL.execute()

        assertEquals(result.id, 'users:john')
        assertEquals(result.username, 'john_doe')
      } finally {
        connectionStub.restore()
      }
    })
  })

  describe('ID from data object', () => {
    it('should extract ID from data object when no explicit ID is set', async () => {
      const mockData = [createTestUserRaw({
        id: new RecordId('users', 'from-data'),
        username: 'data_user',
        email: 'data@example.com',
      })]

      const connectionStub = stub(mockConnectionProvider, 'getConnection', createMockConnectionStub(mockData))

      try {
        const createQL = create<TestUserRaw, TestUser>(mockConnectionProvider, testTable, {
          id: 'user:from-data',
          username: 'data_user',
          email: 'data@example.com',
          active: true,
        })
          .map(mapTestUser)

        const result = await createQL.execute()

        assertEquals(result.id, 'users:from-data')
        assertEquals(result.username, 'data_user')
        assertNotEquals(result.email, undefined)
      } finally {
        connectionStub.restore()
      }
    })

    it('should work with RecordId in data object', async () => {
      const recordId = new RecordId('users', 'record-id-data')
      const mockData = [createTestUserRaw({
        id: recordId,
        username: 'record_id_user',
        email: 'recordid@example.com',
      })]

      const connectionStub = stub(mockConnectionProvider, 'getConnection', createMockConnectionStub(mockData))

      try {
        const createQL = create<TestUserRaw, TestUser>(mockConnectionProvider, testTable, {
          id: recordId,
          username: 'record_id_user',
          email: 'recordid@example.com',
          active: true,
        })
          .map(mapTestUser)

        const result = await createQL.execute()

        assertEquals(result.id, 'users:record-id-data')
        assertEquals(result.username, 'record_id_user')
      } finally {
        connectionStub.restore()
      }
    })
  })

  describe('Backward compatibility', () => {
    it('should maintain auto-generated ID behavior when no ID is specified', async () => {
      const mockData = [createTestUserRaw({
        username: 'auto_generated',
        email: 'auto@example.com',
      })]

      const connectionStub = stub(mockConnectionProvider, 'getConnection', createMockConnectionStub(mockData))

      try {
        const createQL = create<TestUserRaw, TestUser>(mockConnectionProvider, testTable, {
          username: 'auto_generated',
          email: 'auto@example.com',
          active: true,
        })
          .map(mapTestUser)

        const result = await createQL.execute()

        assertEquals(result.id, 'users:123') // Default mock ID
        assertEquals(result.username, 'auto_generated')
      } finally {
        connectionStub.restore()
      }
    })

    it('should prioritize explicit ID over ID in data object', async () => {
      const mockData = [createTestUserRaw({
        id: new RecordId('users', 'explicit-id'),
        username: 'priority_test',
        email: 'priority@example.com',
      })]

      const connectionStub = stub(mockConnectionProvider, 'getConnection', createMockConnectionStub(mockData))

      try {
        const createQL = create<TestUserRaw, TestUser>(mockConnectionProvider, testTable, {
          id: 'user:data-id', // This should be ignored
          username: 'priority_test',
          email: 'priority@example.com',
          active: true,
        })
          .withId('user:explicit-id') // This should take precedence
          .map(mapTestUser)

        const result = await createQL.execute()

        assertEquals(result.id, 'users:explicit-id')
        assertEquals(result.username, 'priority_test')
      } finally {
        connectionStub.restore()
      }
    })
  })
})
