/**
 * Consolidated test suite for write operations
 *
 * This file imports and runs all the individual test suites for write operations.
 * The original 775-line test file has been refactored into smaller, focused test files
 * for better maintainability and organization.
 *
 * Test files:
 * - src/write/shared.ts - Shared test utilities and types
 * - src/write/create_test.ts - Tests for CREATE operations (CreateQL)
 * - src/write/update_test.ts - Tests for UPDATE operations (UpdateQL)
 * - src/write/delete_test.ts - Tests for DELETE operations (DeleteQL)
 * - src/write/factory_test.ts - Tests for factory functions and error handling
 */

// Import all test modules to run them
import './create.test.ts'
import './update.test.ts'
import './delete.test.ts'
import './factory.test.ts'

// Export shared utilities for external use if needed
export {
	captureConsoleWarnings,
	createEmptyMockConnectionStub,
	createMockConnectionStub,
	createTestUserRaw,
	mapTestUser,
	mockConnectionProvider,
	testTable,
	type TestUser,
	type TestUserRaw,
} from './shared.ts'
