/**
 * Simple regex list of dangerous SQL patterns to check against.
 * This is used for general validation of user input to prevent SQL injection attacks.
 * It checks for common SQL injection patterns that should not be present in user input.
 */
const FIELD_NAME_INJECTION_PATTERNS: RegExp[] = [
  /;/, // Statement terminator
  /--/, // SQL comments
  /\/\*/, // Block comments
  /\*\//, // Block comments
  /\bunion\b/i, // UNION attacks
  /\bselect\b/i, // SELECT injections
  /\binsert\b/i, // INSERT injections
  /\bupdate\b/i, // UPDATE injections
  /\bdelete\b/i, // DELETE injections
  /\bdrop\b/i, // DROP injections
]

/**
 * Simple regex but more targeted list of dangerous SQL patterns to check against.
 * This is used for conditional checks like HAVING clauses where we want to allow some patterns
 * but still prevent common SQL injection attacks.
 */
const CLAUSE_INJECTION_PATTERNS: RegExp[] = [
  /;.*(?:union|select|insert|update|delete|drop)/i,
  /'\s*(?:union|select|insert|update|delete|drop)/i,
  /"\s*(?:union|select|insert|update|delete|drop)/i,
  /\/\*.*\*\//,
  /--.*$/m,
]

/**
 * Table name must start with a letter and can contain letters, numbers, underscores, and hyphens.
 */
const TABLE_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/

/**
 * Field names can contain letters, numbers, underscores, colons, hyphens, parentheses, and dots.
 * This is a more permissive pattern to allow for complex field names for SurrealDB.
 */
const FIELD_NAME_PATTERN = /^[a-zA-Z0-9_.():*-]+$/

/**
 * Validates a hostname according to RFC 1035 and RFC 1123.
 * Hostnames can contain letters, numbers, hyphens, and must not start or end with a hyphen.
 * Each label must be between 1 and 63 characters long.
 */
const HOSTNAME_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

/**
 * Validates an IPv4 address.
 * Each octet must be between 0 and 255, and there must be exactly four octets separated by dots.
 * This pattern allows leading zeros in each octet.
 */
const IP_PATTERN = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

/**
 * Validates a localhost hostname.
 * This is a simple pattern that matches "localhost" case-insensitively.
 */
const LOCALHOST_PATTERN = /^localhost$/i

/**
 * Simple numeric string.
 * This pattern matches strings that consist only of digits (0-9).
 * It is used to validate numeric inputs that are expected to be strings.
 */
const NUMERIC_STRING_PATTERN = /^\d+$/

/**
 * Matches a single asterisk (*) used for wildcard queries.
 */
const WILDCARD_PATTERN = /^\*$/

/**
 * Ensures that passwords consist of printable ASCII characters.
 * This pattern allows any character in the printable ASCII range (from space to tilde).
 */
const PASSWORD_PATTERN = /^[\x20-\x7E]+$/

/**
 * Sensitive information patterns.
 * Use this for field/key name filtering, or to flag presence of a sensitive word.
 */
const SENSITIVE_PATTERN = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /credentials/i,
  /authorization/i,
  /authentication/i,
  /jwt/i,
  /api.?key/i,
  /connection.?string/i,
]

/**
 * Secret information patterns.
 * Use this for flagging or extracting actual sensitive values (e.g., making tokens in logs)
 */
export const SECRET_PATTERN = [
  /(password|token|secret|key|authorization|authentication|jwt|api.?key|credentials)(\s*[:=]\s*)([^\s]+)/gi,
  /(bearer\s+)([a-zA-Z0-9\-._~+/]+=*)/gi,
]

const INTERNAL_PATHS_PATTERNS: RegExp[] = [
  /file:\/\/.*$/gm, // File paths
  /at.*\([^)]*\)/g, // Stack traces
  /\b[A-Za-z]:\\[^\\]+\\.*$/gm, // Windows paths
  /\/[^\/\s]+\/[^\/\s]+\/.*$/gm, // Unix path
]

/**
 * All patterns
 */
export const PATTERNS = {
  FIELD_NAME: FIELD_NAME_PATTERN,
  HOST: [HOSTNAME_PATTERN, IP_PATTERN, LOCALHOST_PATTERN],
  TABLE_NAME: TABLE_NAME_PATTERN,
  NUMERIC_STRING: NUMERIC_STRING_PATTERN,
  WILDCARD: WILDCARD_PATTERN,
  PASSWORD: PASSWORD_PATTERN,
  PATHS: INTERNAL_PATHS_PATTERNS,
  SANITIZE: {
    SENSITIVE: SENSITIVE_PATTERN,
    SECRET: SECRET_PATTERN,
  },
  SQL: {
    FIELD_NAME_INJECTION_PATTERNS,
    CLAUSE_INJECTION_PATTERNS,
  },
}
