import { HttpAdapter } from './adapters/http-adapter.js';
import { EmbeddedAdapter } from './adapters/embedded-adapter.js';
import { CollectionClient } from './collection-client.js';

export class LiteDB {
  /**
   * @param {object} [options]
   * @param {'http' | 'embedded'} [options.mode] - 'http' (default) or 'embedded'
   * @param {string} [options.endpoint] - Server URL (e.g. 'http://localhost:3000')
   * @param {string} [options.apiKey] - API key for authentication
   * @param {string} [options.dbPath] - Database file path (used in 'embedded' mode)
   * @param {number} [options.timeout] - Request timeout in ms (default: 15000)
   */
  constructor(options = {}) {
    const mode = options.mode || (options.dbPath ? 'embedded' : 'http');
    this.mode = mode;

    if (mode === 'embedded') {
      this.adapter = new EmbeddedAdapter(options);
    } else {
      this.adapter = new HttpAdapter(options);
    }

    this._collections = new Map();
  }

  /**
   * Get a collection instance
   * @param {string} name - Collection name
   * @returns {CollectionClient}
   */
  collection(name) {
    if (!this._collections.has(name)) {
      this._collections.set(name, new CollectionClient(name, this.adapter));
    }
    return this._collections.get(name);
  }

  /**
   * List all collections
   */
  async listCollections() {
    return this.adapter.listCollections();
  }

  /**
   * Create a collection
   * @param {string} name
   */
  async createCollection(name) {
    return this.adapter.createCollection(name);
  }

  /**
   * Drop a collection
   * @param {string} name
   */
  async dropCollection(name) {
    this._collections.delete(name);
    return this.adapter.dropCollection(name);
  }

  /**
   * Execute raw SQL (Admin)
   * @param {string} sql
   * @param {any[]} [params]
   */
  async rawSql(sql, params = []) {
    return this.adapter.rawSql(sql, params);
  }

  /**
   * Get system status
   */
  async getStats() {
    return this.adapter.getStats();
  }

  /**
   * Export snapshot
   */
  async exportSnapshot() {
    return this.adapter.exportSnapshot();
  }

  /**
   * Import snapshot
   * @param {object} snapshot
   */
  async importSnapshot(snapshot) {
    return this.adapter.importSnapshot(snapshot);
  }

  /**
   * Close connection (for embedded mode)
   */
  close() {
    if (this.adapter.close) {
      this.adapter.close();
    }
    this._collections.clear();
  }
}
