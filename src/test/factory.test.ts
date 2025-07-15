import { assert, assertEquals, assertRejects } from '@std/assert'
import { create, CreateQL, DeleteQL, remove, update, UpdateQL } from '../crud/write.ts'
import { describe, it } from '@std/testing/bdd'
import { stub } from '@std/testing/mock'
import {
  captureConsoleWarnings,
  createEmptyMockConnectionStub,
  mockConnectionProvider,
  testTable,
  type TestUserRaw,
} from './helpers.ts'

describe('Factory functions', () => {
  describe('create()', () => {
    it('should create a CreateQL instance', () => {
      const createQL = create(mockConnectionProvider, testTable, { username: 'test' })
      assert(createQL instanceof CreateQL)
    })

    it('should accept custom context', () => {
      const createQL = create(mockConnectionProvider, testTable, { username: 'test' })
      assert(createQL instanceof CreateQL)
    })
  })

  describe('update()', () => {
    it('should create an UpdateQL instance', () => {
      const updateQL = update(mockConnectionProvider, testTable, 'users:123', { username: 'updated' })
      assert(updateQL instanceof UpdateQL)
    })

    it('should accept custom context', () => {
      const updateQL = update(mockConnectionProvider, testTable, 'users:123', { username: 'updated' })
      assert(updateQL instanceof UpdateQL)
    })
  })

  describe('remove()', () => {
    it('should create a DeleteQL instance', () => {
      const deleteQL = remove(mockConnectionProvider, testTable, 'users:123')
      assert(deleteQL instanceof DeleteQL)
    })

    it('should accept custom context', () => {
      const deleteQL = remove(mockConnectionProvider, testTable, 'users:123')
      assert(deleteQL instanceof DeleteQL)
    })
  })

  describe('Error handling with T = R defaults', () => {
    it('should handle no records returned for create with warning', async () => {
      const connectionStub = stub(mockConnectionProvider, 'getConnection', createEmptyMockConnectionStub())

      try {
        const { warning } = await captureConsoleWarnings(async () => {
          const createQL = create<TestUserRaw>(mockConnectionProvider, testTable, { username: 'test' })

          await assertRejects(
            () => createQL.execute(),
            Error,
            'Create operation returned no records',
          )
        })

        assertEquals(warning, '')
      } finally {
        connectionStub.restore()
      }
    })

    it('should handle no records returned for update with warning', async () => {
      const connectionStub = stub(mockConnectionProvider, 'getConnection', createEmptyMockConnectionStub())

      try {
        const { warning } = await captureConsoleWarnings(async () => {
          const updateQL = update<TestUserRaw>(mockConnectionProvider, testTable, 'users:999', {
            username: 'test',
          })

          await assertRejects(
            () => updateQL.execute(),
            Error,
            'Update operation returned no records',
          )
        })

        assertEquals(warning, '')
      } finally {
        connectionStub.restore()
      }
    })

    it('should handle no records returned for remove with warning', async () => {
      const connectionStub = stub(mockConnectionProvider, 'getConnection', createEmptyMockConnectionStub())

      try {
        const { warning } = await captureConsoleWarnings(async () => {
          const deleteQL = remove<TestUserRaw>(mockConnectionProvider, testTable, 'users:999')

          await assertRejects(
            () => deleteQL.execute(),
            Error,
            'Delete operation returned no records',
          )
        })

        assertEquals(warning, '')
      } finally {
        connectionStub.restore()
      }
    })
  })
})
