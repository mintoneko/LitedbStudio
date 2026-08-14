import { parseQuery, parseSort } from './query-parser.js';
import { generateId, nowTimestamp, sanitizeCollectionName } from './utils.js';

/**
 * Collection represents a document store table in SQLite.
 */
export class Collection {
  /**
   * @param {string} name - Collection name
   * @param {import('./engine.js').LiteDBEngine} engine - Engine reference
   * @param {object} [options]
   * @param {'auto-increment' | 'nanoid'} [options.idType]
   */
  constructor(name, engine, options = {}) {
    this.name = sanitizeCollectionName(name);
    this.engine = engine;
    this.db = engine.adapter;
    this.tableName = `col_${this.name}`;
    // Default to auto-increment integer IDs (1, 2, 3...)
    this.idType = options.idType || 'auto-increment';
    this._ensureTable();
  }

  /**
   * Ensure SQLite table exists for this collection
   */
  _ensureTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS "${this.tableName}" (
        "id" TEXT PRIMARY KEY,
        "_data" TEXT NOT NULL,
        "created_at" TEXT NOT NULL,
        "updated_at" TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "idx_${this.tableName}_created" ON "${this.tableName}" ("created_at");
      CREATE INDEX IF NOT EXISTS "idx_${this.tableName}_updated" ON "${this.tableName}" ("updated_at");
    `);

    // Register collection in metadata table
    this.engine._registerCollection(this.name);
  }

  /**
   * Get next auto-increment integer ID starting from 1
   */
  _getNextAutoId() {
    try {
      const res = this.db.prepare(`
        SELECT MAX(CAST(id AS INTEGER)) as max_id FROM "${this.tableName}"
      `).get();
      const currentMax = res && res.max_id !== null ? Number(res.max_id) : 0;
      return currentMax + 1;
    } catch {
      return 1;
    }
  }

  /**
   * Format a raw database row back into a user-facing document
   */
  _formatRow(row, select = null) {
    if (!row) return null;
    let dataObj = {};
    try {
      dataObj = JSON.parse(row._data);
    } catch {
      dataObj = {};
    }

    // If row.id is a pure numeric string, convert to Number for seamless integer ID support
    let formattedId = row.id;
    if (typeof row.id === 'string' && /^\d+$/.test(row.id) && Number.isSafeInteger(Number(row.id))) {
      formattedId = Number(row.id);
    }

    const doc = {
      id: formattedId,
      ...dataObj,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    if (Array.isArray(select) && select.length > 0) {
      const filtered = {};
      for (const field of select) {
        if (field in doc) {
          filtered[field] = doc[field];
        }
      }
      return filtered;
    }

    return doc;
  }

  /**
   * Insert a document into the collection with auto-increment numeric ID
   * @param {object} doc - Document to insert
   * @returns {object} The inserted document with id, created_at, updated_at
   */
  insert(doc) {
    if (!doc || typeof doc !== 'object') {
      throw new Error('Document must be a valid object');
    }

    let id;
    if (typeof doc.id === 'number' && Number.isSafeInteger(doc.id)) {
      id = doc.id;
    } else if (doc.id !== undefined && doc.id !== null && doc.id !== '' && !isNaN(Number(doc.id))) {
      id = Number(doc.id);
    } else {
      id = this._getNextAutoId();
    }

    const now = nowTimestamp();
    const created_at = doc.created_at || now;
    const updated_at = doc.updated_at || now;

    // Separate system fields from custom user payload
    const { id: _ignoredId, created_at: _c, updated_at: _u, ...customData } = doc;
    const jsonStr = JSON.stringify(customData);

    const stmt = this.db.prepare(`
      INSERT INTO "${this.tableName}" ("id", "_data", "created_at", "updated_at")
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(String(id), jsonStr, created_at, updated_at);

    return {
      id,
      ...customData,
      created_at,
      updated_at
    };
  }

  /**
   * Insert multiple documents in a single transaction
   * @param {object[]} docs - Array of documents
   * @returns {object[]} Inserted documents
   */
  insertMany(docs) {
    if (!Array.isArray(docs) || docs.length === 0) {
      return [];
    }

    const insertTx = this.db.transaction((items) => {
      const results = [];
      for (const doc of items) {
        results.push(this.insert(doc));
      }
      return results;
    });

    return insertTx(docs);
  }

  /**
   * Find a document by its primary ID (supports numeric or string ID)
   * @param {string|number} id - Document ID
   * @param {string[]} [select] - Fields to select
   * @returns {object|null}
   */
  findById(id, select = null) {
    if (id === undefined || id === null) return null;
    const strId = String(id);
    const stmt = this.db.prepare(`
      SELECT * FROM "${this.tableName}" WHERE "id" = ? LIMIT 1
    `);
    const row = stmt.get(strId);
    return this._formatRow(row, select);
  }

  /**
   * Find a single document matching query filter
   * @param {object} filter - Query filter
   * @param {object} [options] - Options (sort, select)
   * @returns {object|null}
   */
  findOne(filter = {}, options = {}) {
    const results = this.find(filter, { ...options, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find documents matching query filter
   * @param {object} filter - Query filter
   * @param {object} [options] - Options (sort, limit, skip, select)
   * @returns {object[]} Array of matching documents
   */
  find(filter = {}, options = {}) {
    const { sql: whereSql, params } = parseQuery(filter);
    const sortSql = parseSort(options.sort || { id: 1 });
    
    let limitSql = '';
    if (typeof options.limit === 'number' && options.limit > 0) {
      limitSql = `LIMIT ${options.limit}`;
      if (typeof options.skip === 'number' && options.skip > 0) {
        limitSql += ` OFFSET ${options.skip}`;
      }
    } else if (typeof options.skip === 'number' && options.skip > 0) {
      limitSql += `LIMIT -1 OFFSET ${options.skip}`;
    }

    const query = `
      SELECT * FROM "${this.tableName}"
      WHERE ${whereSql}
      ${sortSql}
      ${limitSql}
    `.trim();

    const stmt = this.db.prepare(query);
    const rows = stmt.all(params);
    return rows.map((r) => this._formatRow(r, options.select));
  }

  /**
   * Paginated search helper (defaults to ascending ID order)
   * @param {object} filter - Query filter
   * @param {object} [options] - Pagination options ({ page: 1, pageSize: 20, sort, select })
   * @returns {{ data: object[], total: number, page: number, pageSize: number, totalPages: number }}
   */
  paginate(filter = {}, options = {}) {
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const pageSize = Math.max(1, Math.min(1000, parseInt(options.pageSize || options.limit, 10) || 20));
    const skip = (page - 1) * pageSize;

    const total = this.count(filter);
    const totalPages = Math.ceil(total / pageSize);
    const data = this.find(filter, {
      sort: options.sort || { id: 1 },
      select: options.select,
      limit: pageSize,
      skip
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  /**
   * Count documents matching query filter
   * @param {object} filter - Query filter
   * @returns {number}
   */
  count(filter = {}) {
    const { sql: whereSql, params } = parseQuery(filter);
    const query = `SELECT COUNT(*) as count FROM "${this.tableName}" WHERE ${whereSql}`;
    const stmt = this.db.prepare(query);
    const result = stmt.get(params);
    return result ? Number(result.count) : 0;
  }

  /**
   * Update a document by ID with partial patch (merges top-level fields)
   * @param {string|number} id - Document ID
   * @param {object} patch - Fields to update
   * @returns {object|null} Updated document or null if not found
   */
  updateById(id, patch) {
    if (id === undefined || id === null || !patch || typeof patch !== 'object') {
      throw new Error('updateById requires a valid ID and patch object');
    }

    const existing = this.findById(id);
    if (!existing) return null;

    const now = nowTimestamp();
    const { id: _ignored, created_at: _c, updated_at: _u, ...customPatch } = patch;

    // Merge existing custom data with patch
    const updatedData = { ...existing };
    delete updatedData.id;
    delete updatedData.created_at;
    delete updatedData.updated_at;

    Object.assign(updatedData, customPatch);
    const jsonStr = JSON.stringify(updatedData);

    const stmt = this.db.prepare(`
      UPDATE "${this.tableName}"
      SET "_data" = ?, "updated_at" = ?
      WHERE "id" = ?
    `);

    stmt.run(jsonStr, now, String(id));

    return {
      id: existing.id,
      ...updatedData,
      created_at: existing.created_at,
      updated_at: now
    };
  }

  /**
   * Update multiple documents matching query filter
   * @param {object} filter - Query filter
   * @param {object} patch - Fields to update
   * @returns {number} Number of updated documents
   */
  updateMany(filter, patch) {
    if (!filter || !patch || typeof patch !== 'object') {
      throw new Error('updateMany requires filter and patch object');
    }

    const docs = this.find(filter);
    if (docs.length === 0) return 0;

    const updateTx = this.db.transaction((items) => {
      let count = 0;
      for (const doc of items) {
        this.updateById(doc.id, patch);
        count++;
      }
      return count;
    });

    return updateTx(docs);
  }

  /**
   * Delete a document by its ID
   * @param {string|number} id - Document ID
   * @returns {boolean} True if deleted, false if not found
   */
  deleteById(id) {
    if (id === undefined || id === null) return false;
    const stmt = this.db.prepare(`
      DELETE FROM "${this.tableName}" WHERE "id" = ?
    `);
    const info = stmt.run(String(id));
    return (info.changes || info.rowCount || 0) > 0;
  }

  /**
   * Delete multiple documents matching filter
   * @param {object} filter - Query filter
   * @returns {number} Number of deleted documents
   */
  deleteMany(filter = {}) {
    const { sql: whereSql, params } = parseQuery(filter);
    const query = `DELETE FROM "${this.tableName}" WHERE ${whereSql}`;
    const stmt = this.db.prepare(query);
    const info = stmt.run(params);
    return Number(info.changes || info.rowCount || 0);
  }

  /**
   * Create an index on a JSON field for high-speed queries
   * @param {string} fieldName - Field name (e.g. 'status' or 'user.email')
   */
  createIndex(fieldName) {
    const sanitizedField = fieldName.replace(/[^a-zA-Z0-9_]/g, '_');
    const indexName = `idx_${this.tableName}_${sanitizedField}`;
    const jsonPath = `$.${fieldName.replace(/'/g, "''")}`;
    
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS "${indexName}"
      ON "${this.tableName}" (json_extract(_data, '${jsonPath}'));
    `);
  }

  /**
   * Clear all documents in this collection
   */
  clear() {
    this.db.exec(`DELETE FROM "${this.tableName}"`);
  }

  /**
   * Drop the entire collection table and unregister
   */
  drop() {
    this.db.exec(`DROP TABLE IF EXISTS "${this.tableName}"`);
    this.engine._unregisterCollection(this.name);
  }
}
