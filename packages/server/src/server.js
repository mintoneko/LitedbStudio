import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { LiteDBEngine } from '@litedb/core';
import { Router } from './router.js';

export class LiteDBServer {
  constructor(options = {}) {
    this.port = options.port || 3000;
    this.host = options.host || '0.0.0.0';
    this.dbPath = options.dbPath || './data/litedb.db';
    this.adminKey = options.adminKey || null;
    this.staticDir = options.staticDir || null;
    this.allowAnonymous = options.allowAnonymous ?? false; // if true, read-write without api key is permitted

    this.engine = new LiteDBEngine({
      path: this.dbPath,
      adminKey: this.adminKey
    });

    this.router = new Router();
    this.server = null;

    this._setupRoutes();
  }

  _setupRoutes() {
    // 1. Health check & Ping
    this.router.get('/api/ping', (req, res) => {
      this._sendJson(res, 200, { success: true, message: 'pong', timestamp: new Date().toISOString() });
    });

    // 2. System Stats
    this.router.get('/api/system/stats', this._requireRole('read-only'), (req, res) => {
      const stats = this.engine.getStats();
      this._sendJson(res, 200, { success: true, data: stats });
    });

    // 3. System Export Snapshot
    this.router.get('/api/system/export', this._requireRole('admin'), (req, res) => {
      const snapshot = this.engine.exportSnapshot();
      this._sendJson(res, 200, { success: true, data: snapshot });
    });

    // 4. System Import Snapshot
    this.router.post('/api/system/import', this._requireRole('admin'), (req, res) => {
      const result = this.engine.importSnapshot(req.body);
      this._sendJson(res, 200, { success: true, data: result });
    });

    // 5. Auth verify (supports both GET and POST)
    const handleAuthVerify = (req, res) => {
      const apiKey = this._extractApiKey(req);
      if (!apiKey) {
        if (this.allowAnonymous) {
          return this._sendJson(res, 200, { success: true, data: { role: 'admin', anonymous: true } });
        }
        return this._sendError(res, 401, 'No API key provided');
      }
      const record = this.engine.validateApiKey(apiKey);
      if (!record) {
        return this._sendError(res, 401, 'Invalid API key');
      }
      this._sendJson(res, 200, { success: true, data: { id: record.id, name: record.name, role: record.role } });
    };

    this.router.get('/api/auth/verify', handleAuthVerify);
    this.router.post('/api/auth/verify', handleAuthVerify);

    // 6. API Keys management (Admin only)
    this.router.get('/api/auth/keys', this._requireRole('admin'), (req, res) => {
      const keys = this.engine.listApiKeys();
      this._sendJson(res, 200, { success: true, data: keys });
    });

    this.router.post('/api/auth/keys', this._requireRole('admin'), (req, res) => {
      const { name, role, customKey } = req.body || {};
      if (!name) {
        return this._sendError(res, 400, 'Key name is required');
      }
      const newKey = this.engine.createApiKey(name, role || 'read-write', customKey);
      this._sendJson(res, 201, { success: true, data: newKey });
    });

    this.router.delete('/api/auth/keys/:id', this._requireRole('admin'), (req, res) => {
      const success = this.engine.deleteApiKey(req.params.id);
      this._sendJson(res, 200, { success, message: success ? 'Key deleted' : 'Key not found' });
    });

    // 7. Collections list & creation
    this.router.get('/api/collections', this._requireRole('read-only'), (req, res) => {
      const collections = this.engine.listCollections();
      this._sendJson(res, 200, { success: true, data: collections });
    });

    this.router.post('/api/collections', this._requireRole('admin'), (req, res) => {
      const { name } = req.body || {};
      if (!name) return this._sendError(res, 400, 'Collection name required');
      const col = this.engine.collection(name);
      this._sendJson(res, 201, { success: true, data: { name: col.name } });
    });

    this.router.delete('/api/collections/:name', this._requireRole('admin'), (req, res) => {
      this.engine.dropCollection(req.params.name);
      this._sendJson(res, 200, { success: true, message: `Collection ${req.params.name} dropped` });
    });

    // 8. Collection CRUD operations
    // Insert single or batch
    this.router.post('/api/collections/:name/insert', this._requireRole('read-write'), (req, res) => {
      const col = this.engine.collection(req.params.name);
      const body = req.body || {};
      if (Array.isArray(body)) {
        const result = col.insertMany(body);
        return this._sendJson(res, 201, { success: true, data: result, count: result.length });
      } else if (body.docs && Array.isArray(body.docs)) {
        const result = col.insertMany(body.docs);
        return this._sendJson(res, 201, { success: true, data: result, count: result.length });
      } else {
        const doc = body.doc || body;
        const result = col.insert(doc);
        return this._sendJson(res, 201, { success: true, data: result });
      }
    });

    // Query documents
    this.router.post('/api/collections/:name/query', this._requireRole('read-only'), (req, res) => {
      if (!this.engine.hasCollection(req.params.name)) {
        const { page, pageSize } = req.body || {};
        if (page !== undefined || pageSize !== undefined) {
          return this._sendJson(res, 200, {
            success: true,
            data: { items: [], total: 0, page: Number(page) || 1, pageSize: Number(pageSize) || 15, totalPages: 0 }
          });
        }
        return this._sendJson(res, 200, { success: true, data: [], count: 0 });
      }

      const col = this.engine.collection(req.params.name);
      const { filter = {}, sort, limit, skip, select, page, pageSize } = req.body || {};

      if (page !== undefined || pageSize !== undefined) {
        const result = col.paginate(filter, { sort, select, page, pageSize: pageSize || limit });
        return this._sendJson(res, 200, { success: true, data: result });
      }

      const rows = col.find(filter, { sort, limit, skip, select });
      this._sendJson(res, 200, { success: true, data: rows, count: rows.length });
    });

    // Count
    this.router.post('/api/collections/:name/count', this._requireRole('read-only'), (req, res) => {
      if (!this.engine.hasCollection(req.params.name)) {
        return this._sendJson(res, 200, { success: true, data: { count: 0 } });
      }
      const col = this.engine.collection(req.params.name);
      const { filter = {} } = req.body || {};
      const count = col.count(filter);
      this._sendJson(res, 200, { success: true, data: { count } });
    });

    // Find by ID
    this.router.get('/api/collections/:name/:id', this._requireRole('read-only'), (req, res) => {
      if (!this.engine.hasCollection(req.params.name)) {
        return this._sendError(res, 404, 'Collection not found');
      }
      const col = this.engine.collection(req.params.name);
      const doc = col.findById(req.params.id);
      if (!doc) {
        return this._sendError(res, 404, 'Document not found');
      }
      this._sendJson(res, 200, { success: true, data: doc });
    });

    // Update by ID (Partial patch)
    this.router.put('/api/collections/:name/:id', this._requireRole('read-write'), (req, res) => {
      if (!this.engine.hasCollection(req.params.name)) {
        return this._sendError(res, 404, 'Collection not found');
      }
      const col = this.engine.collection(req.params.name);
      const patch = req.body || {};
      const updated = col.updateById(req.params.id, patch);
      if (!updated) {
        return this._sendError(res, 404, 'Document not found');
      }
      this._sendJson(res, 200, { success: true, data: updated });
    });

    // Update Many
    this.router.put('/api/collections/:name', this._requireRole('read-write'), (req, res) => {
      if (!this.engine.hasCollection(req.params.name)) {
        return this._sendJson(res, 200, { success: true, data: { updatedCount: 0 } });
      }
      const col = this.engine.collection(req.params.name);
      const { filter, patch } = req.body || {};
      if (!filter || !patch) {
        return this._sendError(res, 400, 'Both filter and patch are required for batch update');
      }
      const updatedCount = col.updateMany(filter, patch);
      this._sendJson(res, 200, { success: true, data: { updatedCount } });
    });

    // Delete by ID
    this.router.delete('/api/collections/:name/:id', this._requireRole('read-write'), (req, res) => {
      if (!this.engine.hasCollection(req.params.name)) {
        return this._sendError(res, 404, 'Document not found');
      }
      const col = this.engine.collection(req.params.name);
      const deleted = col.deleteById(req.params.id);
      if (!deleted) {
        return this._sendError(res, 404, 'Document not found');
      }
      this._sendJson(res, 200, { success: true, message: 'Document deleted' });
    });

    // Delete Many
    this.router.delete('/api/collections/:name', this._requireRole('read-write'), (req, res) => {
      if (!this.engine.hasCollection(req.params.name)) {
        return this._sendJson(res, 200, { success: true, data: { deletedCount: 0 } });
      }
      const col = this.engine.collection(req.params.name);
      const { filter = {} } = req.body || {};
      const deletedCount = col.deleteMany(filter);
      this._sendJson(res, 200, { success: true, data: { deletedCount } });
    });

    // Clear collection
    this.router.post('/api/collections/:name/clear', this._requireRole('admin'), (req, res) => {
      if (!this.engine.hasCollection(req.params.name)) {
        return this._sendJson(res, 200, { success: true, message: `Collection ${req.params.name} cleared` });
      }
      const col = this.engine.collection(req.params.name);
      col.clear();
      this._sendJson(res, 200, { success: true, message: `Collection ${req.params.name} cleared` });
    });

    // Create Index
    this.router.post('/api/collections/:name/index', this._requireRole('admin'), (req, res) => {
      const { field } = req.body || {};
      if (!field) return this._sendError(res, 400, 'Field name is required for index');
      const col = this.engine.collection(req.params.name);
      col.createIndex(field);
      this._sendJson(res, 200, { success: true, message: `Index created for field: ${field}` });
    });

    // 9. Execute Raw SQL
    this.router.post('/api/sql', this._requireRole('admin'), (req, res) => {
      const { sql, params = [] } = req.body || {};
      if (!sql) return this._sendError(res, 400, 'SQL string is required');
      try {
        const result = this.engine.rawSql(sql, params);
        this._sendJson(res, 200, { success: true, data: result });
      } catch (err) {
        this._sendError(res, 400, `SQL Execution Error: ${err.message}`);
      }
    });
  }

  _extractApiKey(req) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    if (req.headers['x-api-key']) {
      return req.headers['x-api-key'].trim();
    }
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      const paramKey = parsedUrl.searchParams.get('api_key');
      if (paramKey) return paramKey;
    } catch {
      // ignore
    }
    return null;
  }

  _requireRole(minRole) {
    const roleRank = { 'read-only': 1, 'read-write': 2, 'admin': 3 };

    return (req, res, next) => {
      if (this.allowAnonymous) {
        req.auth = { role: 'admin' };
        return next();
      }

      const apiKey = this._extractApiKey(req);
      if (!apiKey) {
        return this._sendError(res, 401, 'Unauthorized: API Key required');
      }

      const record = this.engine.validateApiKey(apiKey);
      if (!record) {
        return this._sendError(res, 401, 'Unauthorized: Invalid API Key');
      }

      const userRank = roleRank[record.role] || 0;
      const requiredRank = roleRank[minRole] || 1;

      if (userRank < requiredRank) {
        return this._sendError(res, 403, `Forbidden: Requires '${minRole}' role (current: '${record.role}')`);
      }

      req.auth = record;
      next();
    };
  }

  _sendJson(res, status, payload) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
    });
    res.end(JSON.stringify(payload));
  }

  _sendError(res, status, message) {
    this._sendJson(res, status, {
      success: false,
      error: {
        code: `ERR_${status}`,
        message
      }
    });
  }

  _handleStatic(req, res, pathname) {
    if (!this.staticDir || !fs.existsSync(this.staticDir)) {
      return false;
    }

    let filePath = path.join(this.staticDir, pathname === '/' ? 'index.html' : pathname);
    
    // Normalize and prevent path traversal
    filePath = path.normalize(filePath);
    if (!filePath.startsWith(path.normalize(this.staticDir))) {
      return false;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(this.staticDir, 'index.html');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
      };

      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
      return true;
    }

    return false;
  }

  start(callback) {
    this.server = http.createServer((req, res) => {
      // 1. CORS Preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
          'Access-Control-Max-Age': '86400'
        });
        return res.end();
      }

      let pathname = '/';
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        pathname = parsedUrl.pathname;
      } catch {
        pathname = '/';
      }

      // 2. Read Request Body
      let bodyData = '';
      req.on('data', (chunk) => {
        bodyData += chunk;
        if (bodyData.length > 50 * 1024 * 1024) { // 50MB limit
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
          req.destroy();
        }
      });

      req.on('end', () => {
        req.body = {};
        if (bodyData) {
          try {
            req.body = JSON.parse(bodyData);
          } catch {
            req.body = bodyData;
          }
        }

        // 3. Match Route
        const match = this.router.match(req.method, pathname);
        if (match) {
          req.params = match.params;
          
          // Execute middleware & handlers chain
          const executeChain = (idx) => {
            if (idx >= match.handlers.length) return;
            const handler = match.handlers[idx];
            try {
              handler(req, res, () => executeChain(idx + 1));
            } catch (err) {
              this._sendError(res, 500, `Internal Server Error: ${err.message}`);
            }
          };

          executeChain(0);
          return;
        }

        // 4. Fallback to static files (e.g. Studio UI)
        if (this._handleStatic(req, res, pathname)) {
          return;
        }

        // 404
        this._sendError(res, 404, `Route ${req.method} ${pathname} not found`);
      });
    });

    this.server.listen(this.port, this.host, () => {
      if (callback) callback();
    });

    return this.server;
  }

  stop(callback) {
    if (this.server) {
      this.server.close(() => {
        this.engine.close();
        if (callback) callback();
      });
    }
  }
}
