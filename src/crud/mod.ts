/**
 * SurQL CRUD module exports
 */

export { create, CreateQL, DeleteQL, remove, update, UpdateQL } from './write.ts' // TODO(@oneiriq) - separate these into their own files
export { merge, MergeQL } from './merge.ts'
export { patch, type PatchOperation, PatchQL } from './patch.ts'
export { query, ReadQL } from './read.ts'
export { type Condition, type ConnectionProvider, Op, type OrderBy, type QueryOptions, SortDirection } from './base.ts'
export { upsert, UpsertQL } from './upsert.ts'
