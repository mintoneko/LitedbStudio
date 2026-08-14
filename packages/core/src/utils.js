import crypto from 'node:crypto';

/**
 * Generate a URL-friendly unique identifier (21 chars, NanoID-style)
 */
export function generateId(size = 21) {
  return crypto.randomBytes(size)
    .toString('base64url')
    .slice(0, size);
}

/**
 * Get current ISO 8601 timestamp
 */
export function nowTimestamp() {
  return new Date().toISOString();
}

/**
 * Sanitize collection / table name to prevent SQL injection
 */
export function sanitizeCollectionName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Collection name must be a non-empty string');
  }
  const clean = name.trim();
  if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
    throw new Error(`Invalid collection name "${name}". Allowed characters: a-z, A-Z, 0-9, _`);
  }
  if (clean.startsWith('_litedb_')) {
    throw new Error(`Collection name cannot start with internal prefix '_litedb_'`);
  }
  return clean;
}
