import { LiteDBEngine } from '@litedb/core';

/**
 * Embedded Adapter for local desktop / Node.js apps without HTTP overhead
 */
export class EmbeddedAdapter {
  constructor(options = {}) {
    this.engine = new LiteDBEngine({
      path: options.dbPath || './data/litedb.db',
      adminKey: options.adminKey
    });
  }

  async insert(collection, docOrDocs) {
    const col = this.engine.collection(collection);
    if (Array.isArray(docOrDocs)) {
      return col.insertMany(docOrDocs);
    }
    return col.insert(docOrDocs);
  }

  async findById(collection, id) {
    const col = this.engine.collection(collection);
    return col.findById(id);
  }

  async query(collection, options = {}) {
    const col = this.engine.collection(collection);
    const { filter = {}, sort, limit, skip, select, page, pageSize } = options;

    if (page !== undefined || pageSize !== undefined) {
      return col.paginate(filter, { sort, select, page, pageSize: pageSize || limit });
    }

    return col.find(filter, { sort, limit, skip, select });
  }

  async count(collection, filter = {}) {
    const col = this.engine.collection(collection);
    return col.count(filter);
  }

  async updateById(collection, id, patch) {
    const col = this.engine.collection(collection);
    return col.updateById(id, patch);
  }

  async updateMany(collection, filter, patch) {
    const col = this.engine.collection(collection);
    return col.updateMany(filter, patch);
  }

  async deleteById(collection, id) {
    const col = this.engine.collection(collection);
    return col.deleteById(id);
  }

  async deleteMany(collection, filter = {}) {
    const col = this.engine.collection(collection);
    return col.deleteMany(filter);
  }

  async clear(collection) {
    const col = this.engine.collection(collection);
    col.clear();
    return true;
  }

  async createIndex(collection, field) {
    const col = this.engine.collection(collection);
    col.createIndex(field);
    return true;
  }

  async listCollections() {
    return this.engine.listCollections();
  }

  async createCollection(name) {
    const col = this.engine.collection(name);
    return { name: col.name };
  }

  async dropCollection(name) {
    this.engine.dropCollection(name);
    return true;
  }

  async rawSql(sql, params = []) {
    return this.engine.rawSql(sql, params);
  }

  async getStats() {
    return this.engine.getStats();
  }

  async exportSnapshot() {
    return this.engine.exportSnapshot();
  }

  async importSnapshot(snapshot) {
    return this.engine.importSnapshot(snapshot);
  }

  close() {
    this.engine.close();
  }
}
