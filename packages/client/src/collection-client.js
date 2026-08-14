/**
 * CollectionClient provides fluent document operations for a single collection.
 */
export class CollectionClient {
  constructor(name, adapter) {
    this.name = name;
    this.adapter = adapter;
  }

  /**
   * Insert a document
   * @param {object} doc
   */
  async insert(doc) {
    return this.adapter.insert(this.name, doc);
  }

  /**
   * Insert multiple documents
   * @param {object[]} docs
   */
  async insertMany(docs) {
    return this.adapter.insert(this.name, docs);
  }

  /**
   * Find a document by its ID
   * @param {string} id
   * @param {string[]} [select]
   */
  async findById(id, select = null) {
    if (this.adapter.findById) {
      const doc = await this.adapter.findById(this.name, id);
      if (doc && Array.isArray(select) && select.length > 0) {
        const filtered = {};
        for (const field of select) {
          if (field in doc) filtered[field] = doc[field];
        }
        return filtered;
      }
      return doc;
    }
    const docs = await this.find({ id }, { limit: 1, select });
    return docs.length > 0 ? docs[0] : null;
  }

  /**
   * Find single document matching filter
   * @param {object} filter
   * @param {object} [options]
   */
  async findOne(filter = {}, options = {}) {
    const docs = await this.find(filter, { ...options, limit: 1 });
    return docs.length > 0 ? docs[0] : null;
  }

  /**
   * Find documents matching filter
   * @param {object} filter
   * @param {object} [options]
   */
  async find(filter = {}, options = {}) {
    return this.adapter.query(this.name, {
      filter,
      ...options
    });
  }

  /**
   * Paginated query
   * @param {object} filter
   * @param {object} [options] - { page, pageSize, sort, select }
   */
  async paginate(filter = {}, options = {}) {
    return this.adapter.query(this.name, {
      filter,
      page: options.page || 1,
      pageSize: options.pageSize || options.limit || 20,
      sort: options.sort,
      select: options.select
    });
  }

  /**
   * Count documents
   * @param {object} [filter]
   */
  async count(filter = {}) {
    return this.adapter.count(this.name, filter);
  }

  /**
   * Update a document by ID
   * @param {string} id
   * @param {object} patch
   */
  async updateById(id, patch) {
    return this.adapter.updateById(this.name, id, patch);
  }

  /**
   * Update multiple documents matching filter
   * @param {object} filter
   * @param {object} patch
   */
  async updateMany(filter, patch) {
    return this.adapter.updateMany(this.name, filter, patch);
  }

  /**
   * Delete a document by ID
   * @param {string} id
   */
  async deleteById(id) {
    return this.adapter.deleteById(this.name, id);
  }

  /**
   * Delete multiple documents matching filter
   * @param {object} [filter]
   */
  async deleteMany(filter = {}) {
    return this.adapter.deleteMany(this.name, filter);
  }

  /**
   * Clear all records in this collection
   */
  async clear() {
    return this.adapter.clear(this.name);
  }

  /**
   * Create index on field
   * @param {string} field
   */
  async createIndex(field) {
    return this.adapter.createIndex(this.name, field);
  }
}
