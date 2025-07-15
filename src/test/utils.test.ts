import { assertEquals } from '@std/assert'
import { RecordId } from 'surrealdb'
import { createSerializer, type Serialized } from '../utils/helpers.ts'

Deno.test('utils.ts', async (t) => {
  await t.step('Serialized<T> type', async (t) => {
    await t.step('should transform RecordId to string', () => {
      interface UserRaw {
        id: RecordId
        name: string
      }

      // This is a compile-time test to ensure types work correctly
      const user: UserRaw = {
        id: new RecordId('users', '123'),
        name: 'John Doe',
      }

      // Cast to check type compatibility
      const serialized: Serialized<UserRaw> = {
        id: user.id.toString(),
        name: user.name,
      }

      assertEquals(typeof serialized.id, 'string')
      assertEquals(serialized.name, 'John Doe')
    })

    await t.step('should transform Date to string', () => {
      interface UserRaw {
        id: RecordId
        name: string
        createdAt: Date
      }

      const testDate = new Date('2024-01-01T10:00:00Z')
      const user: UserRaw = {
        id: new RecordId('users', '123'),
        name: 'John Doe',
        createdAt: testDate,
      }

      const serialized: Serialized<UserRaw> = {
        id: user.id.toString(),
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      }

      assertEquals(typeof serialized.id, 'string')
      assertEquals(typeof serialized.createdAt, 'string')
      assertEquals(serialized.createdAt, testDate.toISOString())
    })

    await t.step('should handle nested objects recursively', () => {
      interface UserRaw {
        id: RecordId
        name: string
        profile: {
          lastLogin: Date
          preferences: {
            theme: string
            updatedAt: Date
          }
        }
        metadata: {
          createdBy: RecordId
          tags: string[]
        }
      }

      const testUser: UserRaw = {
        id: new RecordId('users', '123'),
        name: 'John Doe',
        profile: {
          lastLogin: new Date('2024-01-01T10:00:00Z'),
          preferences: {
            theme: 'dark',
            updatedAt: new Date('2024-01-02T10:00:00Z'),
          },
        },
        metadata: {
          createdBy: new RecordId('users', 'admin'),
          tags: ['active', 'premium'],
        },
      }

      // Type check - this should compile correctly
      const serialized: Serialized<UserRaw> = {
        id: testUser.id.toString(),
        name: testUser.name,
        profile: {
          lastLogin: testUser.profile.lastLogin.toISOString(),
          preferences: {
            theme: testUser.profile.preferences.theme,
            updatedAt: testUser.profile.preferences.updatedAt.toISOString(),
          },
        },
        metadata: {
          createdBy: testUser.metadata.createdBy.toString(),
          tags: testUser.metadata.tags,
        },
      }

      assertEquals(typeof serialized.id, 'string')
      assertEquals(typeof serialized.profile.lastLogin, 'string')
      assertEquals(typeof serialized.profile.preferences.updatedAt, 'string')
      assertEquals(typeof serialized.metadata.createdBy, 'string')
      assertEquals(Array.isArray(serialized.metadata.tags), true)
    })

    await t.step('should preserve primitive types', () => {
      interface UserRaw {
        id: RecordId
        name: string
        age: number
        active: boolean
        score: null
        tags: string[]
      }

      const user: UserRaw = {
        id: new RecordId('users', '123'),
        name: 'John Doe',
        age: 30,
        active: true,
        score: null,
        tags: ['premium', 'verified'],
      }

      const serialized: Serialized<UserRaw> = {
        id: user.id.toString(),
        name: user.name,
        age: user.age,
        active: user.active,
        score: user.score,
        tags: user.tags,
      }

      assertEquals(typeof serialized.name, 'string')
      assertEquals(typeof serialized.age, 'number')
      assertEquals(typeof serialized.active, 'boolean')
      assertEquals(serialized.score, null)
      assertEquals(Array.isArray(serialized.tags), true)
    })
  })

  await t.step('createSerializer<R>()', async (t) => {
    interface UserRaw {
      id: RecordId
      name: string
      createdAt: Date
      updatedAt?: Date
      managerId?: RecordId
      tags: RecordId[]
      timestamps: Date[]
    }

    const testUser: UserRaw = {
      id: new RecordId('users', '123'),
      name: 'John Doe',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-02T10:00:00Z'),
      managerId: new RecordId('users', 'manager'),
      tags: [new RecordId('tags', 'premium'), new RecordId('tags', 'verified')],
      timestamps: [new Date('2024-01-01T10:00:00Z'), new Date('2024-01-02T10:00:00Z')],
    }

    const serializer = createSerializer<UserRaw>()

    await t.step('id() should convert record id to string', () => {
      const result = serializer.id(testUser)
      assertEquals(typeof result, 'string')
      assertEquals(result, testUser.id.toString())
    })

    await t.step('date() should convert Date to ISO string', () => {
      const result = serializer.date(testUser.createdAt)
      assertEquals(typeof result, 'string')
      assertEquals(result, testUser.createdAt.toISOString())
    })

    await t.step('recordId() should convert RecordId to string', () => {
      const result = serializer.recordId(testUser.id)
      assertEquals(typeof result, 'string')
      assertEquals(result, testUser.id.toString())
    })

    await t.step('optionalDate() should handle Date and undefined', () => {
      const definedResult = serializer.optionalDate(testUser.updatedAt)
      assertEquals(typeof definedResult, 'string')
      assertEquals(definedResult, testUser.updatedAt!.toISOString())

      const undefinedResult = serializer.optionalDate(undefined)
      assertEquals(undefinedResult, undefined)
    })

    await t.step('optionalRecordId() should handle RecordId and undefined', () => {
      const definedResult = serializer.optionalRecordId(testUser.managerId)
      assertEquals(typeof definedResult, 'string')
      assertEquals(definedResult, testUser.managerId!.toString())

      const undefinedResult = serializer.optionalRecordId(undefined)
      assertEquals(undefinedResult, undefined)
    })

    await t.step('recordIdArray() should convert array of RecordIds to strings', () => {
      const result = serializer.recordIdArray(testUser.tags)
      assertEquals(Array.isArray(result), true)
      assertEquals(result.length, 2)
      assertEquals(typeof result[0], 'string')
      assertEquals(typeof result[1], 'string')
      assertEquals(result[0], testUser.tags[0].toString())
      assertEquals(result[1], testUser.tags[1].toString())
    })

    await t.step('dateArray() should convert array of Dates to ISO strings', () => {
      const result = serializer.dateArray(testUser.timestamps)
      assertEquals(Array.isArray(result), true)
      assertEquals(result.length, 2)
      assertEquals(typeof result[0], 'string')
      assertEquals(typeof result[1], 'string')
      assertEquals(result[0], testUser.timestamps[0].toISOString())
      assertEquals(result[1], testUser.timestamps[1].toISOString())
    })

    await t.step('should work together for complete serialization', () => {
      const mapUser = (raw: UserRaw) => ({
        id: serializer.id(raw),
        name: raw.name,
        createdAt: serializer.date(raw.createdAt),
        updatedAt: serializer.optionalDate(raw.updatedAt),
        managerId: serializer.optionalRecordId(raw.managerId),
        tags: serializer.recordIdArray(raw.tags),
        timestamps: serializer.dateArray(raw.timestamps),
      })

      const serialized = mapUser(testUser)

      assertEquals(typeof serialized.id, 'string')
      assertEquals(typeof serialized.createdAt, 'string')
      assertEquals(typeof serialized.updatedAt, 'string')
      assertEquals(typeof serialized.managerId, 'string')
      assertEquals(Array.isArray(serialized.tags), true)
      assertEquals(Array.isArray(serialized.timestamps), true)
      assertEquals(serialized.tags.every((tag) => typeof tag === 'string'), true)
      assertEquals(serialized.timestamps.every((ts) => typeof ts === 'string'), true)
    })
  })

  await t.step('edge cases and error handling', async (t) => {
    await t.step('should handle empty arrays', () => {
      const serializer = createSerializer<{ id: RecordId }>()

      const emptyRecordIds: RecordId[] = []
      const emptyDates: Date[] = []

      const recordResult = serializer.recordIdArray(emptyRecordIds)
      const dateResult = serializer.dateArray(emptyDates)

      assertEquals(Array.isArray(recordResult), true)
      assertEquals(recordResult.length, 0)
      assertEquals(Array.isArray(dateResult), true)
      assertEquals(dateResult.length, 0)
    })

    await t.step('should handle complex nested structures', () => {
      interface ComplexRaw {
        id: RecordId
        nested: {
          deep: {
            recordId: RecordId
            date: Date
            array: {
              moreRecords: RecordId[]
              moreDates: Date[]
            }
          }
        }
      }

      const complexData: ComplexRaw = {
        id: new RecordId('test', '1'),
        nested: {
          deep: {
            recordId: new RecordId('test', '2'),
            date: new Date('2024-01-01T10:00:00Z'),
            array: {
              moreRecords: [new RecordId('test', '3'), new RecordId('test', '4')],
              moreDates: [new Date('2024-01-01T10:00:00Z'), new Date('2024-01-02T10:00:00Z')],
            },
          },
        },
      }

      // Type check for complex nested serialization
      const serialized: Serialized<ComplexRaw> = {
        id: complexData.id.toString(),
        nested: {
          deep: {
            recordId: complexData.nested.deep.recordId.toString(),
            date: complexData.nested.deep.date.toISOString(),
            array: {
              moreRecords: complexData.nested.deep.array.moreRecords.map((r) => r.toString()),
              moreDates: complexData.nested.deep.array.moreDates.map((d) => d.toISOString()),
            },
          },
        },
      }

      assertEquals(typeof serialized.id, 'string')
      assertEquals(typeof serialized.nested.deep.recordId, 'string')
      assertEquals(typeof serialized.nested.deep.date, 'string')
      assertEquals(Array.isArray(serialized.nested.deep.array.moreRecords), true)
      assertEquals(Array.isArray(serialized.nested.deep.array.moreDates), true)
    })
  })

  await t.step('type safety verification', async (t) => {
    await t.step('should ensure type compatibility between raw and serialized', () => {
      interface UserRaw {
        id: RecordId
        name: string
        createdAt: Date
      }

      interface UserSerialized {
        id: string
        name: string
        createdAt: string
      }

      // This should be assignable
      const rawUser: UserRaw = {
        id: new RecordId('users', '123'),
        name: 'John',
        createdAt: new Date(),
      }

      const serializedUser: Serialized<UserRaw> = {
        id: rawUser.id.toString(),
        name: rawUser.name,
        createdAt: rawUser.createdAt.toISOString(),
      }

      // Should be compatible with manual interface
      const manualSerialized: UserSerialized = serializedUser

      assertEquals(typeof manualSerialized.id, 'string')
      assertEquals(typeof manualSerialized.name, 'string')
      assertEquals(typeof manualSerialized.createdAt, 'string')
    })
  })
})
