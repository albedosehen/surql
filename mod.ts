// Core SurQL functionality (existing exports - preserved for backward compatibility)
export * from './src/crud/base.ts'
export * from './src/crud/read.ts'
export * from './src/crud/write.ts'
export * from './src/connection.ts'
export * from './src/client.ts'
export * from './src/types.ts'
export * from './src/zodError.ts'
export * from './src/surrealError.ts'
export * from './src/utils.ts'

// Phase 1 enhancements - Authentication & Session Management
export * from './src/auth/index.ts'

// Phase 1 enhancements - Advanced CRUD Operations
export * from './src/crud/index.ts'

// Phase 1 enhancements - Query Builder Capabilities
export * from './src/capabilities/index.ts'