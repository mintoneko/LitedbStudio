import fs from 'node:fs';
import { SQLiteAdapter } from './db-adapter.js';
import { Collection } from './collection.js';
import { generateId, nowTimestamp, sanitizeCollectionName } from './utils.js';

/**
 * LiteDB Core Engine
 */
export class LiteDBEngine {
  /**
   * @param {object} [options]
   * @param {string} [options.path] - Database file path or ':memory:'
   * @param {string} [options.adminKey] - Initial admin API key
   */
  constructor(options = {}) {
    this.path = options.path || './data/litedb.db';
    this.adapter = new SQLiteAdapter(this.path);
    this._collections = new Map();
    this._initSystemTables(options.adminKey);
  }

  /**
   * Initialize internal system tables for metadata and auth
   */
  _initSystemTables(defaultAdminKey = null) {
    this.adapter.exec(`
      CREATE TABLE IF NOT EXISTS "_litedb_meta" (
        "name" TEXT PRIMARY KEY,
        "created_at" TEXT NOT NULL,
        "updated_at" TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "_litedb_keys" (
        "id" TEXT PRIMARY KEY,
        "key" TEXT UNIQUE NOT NULL,
        "name" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'write', -- 'admin', 'write', 'read'
        "created_at" TEXT NOT NULL,
        "last_used_at" TEXT
      );
    `);

    // Ensure at least one admin API key exists
    const adminCount = this.adapter.prepare(`SELECT COUNT(*) as count FROM "_litedb_keys" WHERE role = 'admin'`).get()?.count || 0;
    if (adminCount === 0) {
      const adminKey = defaultAdminKey || `admin_${generateId(24)}`;
      this.createApiKey('管理员密钥', 'admin', adminKey);
    }
  }

  /**
   * Get or create a Collection instance
   * @param {string} name - Collection name
   * @param {object} [options] - Options (e.g. { idType: 'auto-increment' })
   * @returns {Collection}
   */
  collection(name, options = {}) {
    const cleanName = sanitizeCollectionName(name);
    if (!this._collections.has(cleanName)) {
      this._collections.set(cleanName, new Collection(cleanName, this, options));
    }
    return this._collections.get(cleanName);
  }

  /**
   * Check if a collection exists in metadata
   * @param {string} name
   * @returns {boolean}
   */
  hasCollection(name) {
    const cleanName = sanitizeCollectionName(name);
    const row = this.adapter.prepare(`SELECT name FROM "_litedb_meta" WHERE name = ?`).get(cleanName);
    return !!row;
  }

  /**
   * List all collections with stats
   * @returns {{ name: string, count: number, created_at: string, updated_at: string }[]}
   */
  listCollections() {
    const rows = this.adapter.prepare(`
      SELECT name, created_at, updated_at FROM "_litedb_meta" ORDER BY created_at ASC, name ASC
    `).all();

    return rows.map((meta) => {
      let count = 0;
      try {
        const stmt = this.adapter.prepare(`SELECT COUNT(*) as c FROM "col_${meta.name}"`);
        const res = stmt.get();
        count = res ? Number(res.c) : 0;
      } catch {
        count = 0;
      }
      return {
        name: meta.name,
        count,
        created_at: meta.created_at,
        updated_at: meta.updated_at
      };
    });
  }

  /**
   * Drop a collection by name
   * @param {string} name
   */
  dropCollection(name) {
    const cleanName = sanitizeCollectionName(name);
    if (this._collections.has(cleanName)) {
      const col = this._collections.get(cleanName);
      col.drop();
      this._collections.delete(cleanName);
    } else {
      this.adapter.exec(`DROP TABLE IF EXISTS "col_${cleanName}"`);
      this._unregisterCollection(cleanName);
    }
  }

  /**
   * Internal registration of a collection
   */
  _registerCollection(name) {
    const now = nowTimestamp();
    this.adapter.prepare(`
      INSERT INTO "_litedb_meta" (name, created_at, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET updated_at = excluded.updated_at
    `).run(name, now, now);
  }

  /**
   * Internal unregistration of a collection
   */
  _unregisterCollection(name) {
    this.adapter.prepare(`DELETE FROM "_litedb_meta" WHERE name = ?`).run(name);
  }

  /**
   * Normalize role name to ensure compatibility across read/write/admin and legacy names
   */
  _normalizeRole(role) {
    if (role === 'read-only' || role === 'read') return 'read';
    if (role === 'read-write' || role === 'write') return 'write';
    if (role === 'admin') return 'admin';
    return 'write';
  }

  /**
   * API Key Management
   */
  createApiKey(name, role = 'write', customKey = null) {
    const id = generateId();
    let key = customKey ? String(customKey).trim() : '';
    if (!key) {
      key = `key_${generateId(24)}`;
    } else {
      const existing = this.adapter.prepare(`SELECT id FROM "_litedb_keys" WHERE key = ?`).get(key);
      if (existing) {
        throw new Error(`API 密钥 Token '${key}' 已存在，请使用其他 Token`);
      }
    }
    const now = nowTimestamp();
    const normalizedRole = this._normalizeRole(role);

    this.adapter.prepare(`
      INSERT INTO "_litedb_keys" (id, key, name, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, key, name, normalizedRole, now);

    return { id, key, name, role: normalizedRole, created_at: now };
  }

  listApiKeys() {
    const rows = this.adapter.prepare(`
      SELECT id, key, name, role, created_at, last_used_at FROM "_litedb_keys" ORDER BY created_at DESC
    `).all();

    return rows.map((r) => ({
      ...r,
      role: this._normalizeRole(r.role)
    }));
  }

  deleteApiKey(id) {
    const keyRecord = this.adapter.prepare(`SELECT name FROM "_litedb_keys" WHERE id = ?`).get(id);
    if (!keyRecord) {
      return false;
    }
    if (keyRecord.name === '管理员密钥') {
      throw new Error('系统默认的“管理员密钥”受到保护，不可注销删除！');
    }
    const res = this.adapter.prepare(`DELETE FROM "_litedb_keys" WHERE id = ?`).run(id);
    return (res.changes || 0) > 0;
  }

  validateApiKey(apiKey) {
    if (!apiKey) return null;
    const row = this.adapter.prepare(`
      SELECT * FROM "_litedb_keys" WHERE key = ?
    `).get(apiKey);

    if (row) {
      // Update last_used_at asynchronously/silently
      try {
        this.adapter.prepare(`UPDATE "_litedb_keys" SET last_used_at = ? WHERE id = ?`)
          .run(nowTimestamp(), row.id);
      } catch {
        // Ignore timestamp update failure
      }
      return {
        ...row,
        role: this._normalizeRole(row.role)
      };
    }
    return null;
  }

  /**
   * Execute raw SQL (for administrative or complex analytics)
   * @param {string} sql - SQL statement
   * @param {any[]} [params] - Parameter list
   */
  rawSql(sql, params = []) {
    const trimmed = sql.trim().toLowerCase();
    const isSelect = trimmed.startsWith('select') || trimmed.startsWith('pragma') || trimmed.startsWith('explain');

    const stmt = this.adapter.prepare(sql);
    if (isSelect) {
      return {
        type: 'select',
        rows: stmt.all(params)
      };
    } else {
      const info = stmt.run(params);
      return {
        type: 'execute',
        changes: info.changes || 0,
        lastInsertRowid: info.lastInsertRowid
      };
    }
  }

  /**
   * Get overall system and database stats
   */
  getStats() {
    let fileSize = 0;
    if (this.path !== ':memory:' && fs.existsSync(this.path)) {
      try {
        fileSize = fs.statSync(this.path).size;
      } catch {
        fileSize = 0;
      }
    }

    const collections = this.listCollections();
    const totalDocs = collections.reduce((sum, c) => sum + c.count, 0);
    const keysCount = this.adapter.prepare(`SELECT COUNT(*) as c FROM "_litedb_keys"`).get()?.c || 0;

    return {
      path: this.path,
      driver: this.adapter.driverType,
      fileSizeBytes: fileSize,
      fileSizeFormatted: formatBytes(fileSize),
      collectionsCount: collections.length,
      totalDocuments: totalDocs,
      apiKeysCount: Number(keysCount),
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Export all collections and data as a JSON snapshot
   */
  exportSnapshot() {
    const collections = this.listCollections();
    const dump = {
      version: '1.0.0',
      exported_at: nowTimestamp(),
      collections: {}
    };

    for (const colMeta of collections) {
      const col = this.collection(colMeta.name);
      dump.collections[colMeta.name] = col.find({}, { limit: 100000 });
    }

    return dump;
  }

  /**
   * Import data from a JSON snapshot
   */
  importSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || !snapshot.collections) {
      throw new Error('Invalid snapshot format');
    }

    const results = {};
    for (const [colName, docs] of Object.entries(snapshot.collections)) {
      if (Array.isArray(docs)) {
        const col = this.collection(colName);
        col.insertMany(docs);
        results[colName] = docs.length;
      }
    }
    return results;
  }

  /**
   * Close the database connection
   */
  close() {
    this.adapter.close();
    this._collections.clear();
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
