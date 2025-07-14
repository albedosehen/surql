/**
 * Advanced CRUD operations module for SurQL
 *
 * Provides enhanced CRUD operations including merge, patch (JSON Patch RFC 6902),
 * and upsert functionality that extends the base SurQL query builder capabilities.
 */

// Export CRUD operation classes
export { MergeQL } from './merge.ts'
export { PatchOperationError, PatchQL } from './patch.ts'
export { UpsertQL } from './upsert.ts'

// Export factory functions
export { merge } from './merge.ts'
export { patch } from './patch.ts'
export { upsert } from './upsert.ts'

// Export related types
export type { PatchOperation } from './patch.ts'
