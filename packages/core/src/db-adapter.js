import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let SqliteDriver = null;
let driverName = 'node:sqlite';

try {
  const { DatabaseSync } = await import('node:sqlite');
  SqliteDriver = DatabaseSync;
  driverName = 'node:sqlite';
} catch {
  try {
    const BetterSqlite3 = require('better-sqlite3');
    SqliteDriver = class {
      constructor(filePath, opts) {
        return new BetterSqlite3(filePath, opts);
      }
    };
    driverName = 'better-sqlite3';
  } catch {
    throw new Error('Neither node:sqlite nor better-sqlite3 is available in this environment.');
  }
}

/**
 * Unified SQLite driver adapter supporting both node:sqlite and better-sqlite3.
 */
export class SQLiteAdapter {
  constructor(dbPath = ':memory:', options = {}) {
    this.dbPath = dbPath;
    this.options = options;
    this.driverType = driverName;
    this.rawDb = null;
    this._init();
  }

  _init() {
    if (this.dbPath !== ':memory:') {
      const dir = path.dirname(path.resolve(this.dbPath));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.rawDb = new SqliteDriver(this.dbPath, this.options);

    // Performance & safety optimizations (WAL mode, foreign keys, synchronous)
    try {
      this.exec('PRAGMA journal_mode = WAL;');
      this.exec('PRAGMA foreign_keys = ON;');
      this.exec('PRAGMA synchronous = NORMAL;');
      this.exec('PRAGMA cache_size = -64000;');
      this.exec('PRAGMA temp_store = MEMORY;');
    } catch {
      // Ignore pragmas if memory or unsupported
    }
  }

  exec(sql) {
    return this.rawDb.exec(sql);
  }

  prepare(sql) {
    const stmt = this.rawDb.prepare(sql);
    return {
      run: (...params) => {
        const flat = flattenParams(params);
        return stmt.run(...flat);
      },
      all: (...params) => {
        const flat = flattenParams(params);
        return stmt.all(...flat);
      },
      get: (...params) => {
        const flat = flattenParams(params);
        return stmt.get(...flat);
      }
    };
  }

  transaction(fn) {
    return (...args) => {
      this.exec('BEGIN IMMEDIATE TRANSACTION');
      try {
        const result = fn(...args);
        this.exec('COMMIT');
        return result;
      } catch (err) {
        this.exec('ROLLBACK');
        throw err;
      }
    };
  }

  close() {
    if (this.rawDb) {
      this.rawDb.close();
      this.rawDb = null;
    }
  }
}

function flattenParams(params) {
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0];
  }
  return params;
}
