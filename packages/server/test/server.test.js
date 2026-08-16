import test from 'node:test';
import assert from 'node:assert/strict';
import { LiteDBServer } from '../src/index.js';

test('LiteDB Server REST API & Auth', async (t) => {
  const server = new LiteDBServer({
    port: 3999,
    dbPath: ':memory:',
    adminKey: 'test_admin_secret_key'
  });

  await new Promise((resolve) => server.start(resolve));
  const baseUrl = 'http://localhost:3999';

  const request = async (path, options = {}) => {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test_admin_secret_key',
        ...(options.headers || {})
      },
      ...options
    });
    return {
      status: res.status,
      json: await res.json()
    };
  };

  await t.test('Ping health check', async () => {
    const res = await request('/api/ping');
    assert.equal(res.status, 200);
    assert.equal(res.json.message, 'pong');
  });

  await t.test('Auth verify valid & invalid key', async () => {
    const valid = await request('/api/auth/verify');
    assert.equal(valid.status, 200);
    assert.equal(valid.json.data.role, 'admin');

    const invalid = await fetch(`${baseUrl}/api/auth/verify`, {
      headers: { 'Authorization': 'Bearer wrong_key' }
    });
    assert.equal(invalid.status, 401);
  });

  await t.test('Create and list collections', async () => {
    const create = await request('/api/collections', {
      method: 'POST',
      body: JSON.stringify({ name: 'products' })
    });
    assert.equal(create.status, 201);
    assert.equal(create.json.data.name, 'products');

    const list = await request('/api/collections');
    assert.equal(list.status, 200);
    assert.ok(list.json.data.some(c => c.name === 'products'));
  });

  await t.test('Insert documents & query with pagination', async () => {
    // Insert single
    const ins1 = await request('/api/collections/products/insert', {
      method: 'POST',
      body: JSON.stringify({ title: 'Keyboard', price: 99, inStock: true })
    });
    assert.equal(ins1.status, 201);
    assert.ok(ins1.json.data.id);
    const prodId = ins1.json.data.id;

    // Insert batch
    const insBatch = await request('/api/collections/products/insert', {
      method: 'POST',
      body: JSON.stringify({
        docs: [
          { title: 'Mouse', price: 49, inStock: true },
          { title: 'Monitor', price: 299, inStock: false },
          { title: 'Headset', price: 79, inStock: true }
        ]
      })
    });
    assert.equal(insBatch.status, 201);
    assert.equal(insBatch.json.count, 3);

    // Query with filter
    const q1 = await request('/api/collections/products/query', {
      method: 'POST',
      body: JSON.stringify({
        filter: { price: { $gte: 50 }, inStock: true },
        sort: { price: -1 }
      })
    });
    assert.equal(q1.status, 200);
    assert.equal(q1.json.data.length, 2); // Keyboard (99), Headset (79)
    assert.equal(q1.json.data[0].title, 'Keyboard');

    // Paginate
    const pag = await request('/api/collections/products/query', {
      method: 'POST',
      body: JSON.stringify({
        page: 1,
        pageSize: 2
      })
    });
    assert.equal(pag.status, 200);
    assert.equal(pag.json.data.total, 4);
    assert.equal(pag.json.data.totalPages, 2);
    assert.equal(pag.json.data.data.length, 2);

    // Update by ID
    const updateRes = await request(`/api/collections/products/${prodId}`, {
      method: 'PUT',
      body: JSON.stringify({ price: 119 })
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.json.data.price, 119);

    // Delete by ID
    const delRes = await request(`/api/collections/products/${prodId}`, {
      method: 'DELETE'
    });
    assert.equal(delRes.status, 200);

    const countRes = await request('/api/collections/products/count', {
      method: 'POST'
    });
    assert.equal(countRes.json.data.count, 3);
  });

  await t.test('API Keys creation & deletion', async () => {
    const createKey = await request('/api/auth/keys', {
      method: 'POST',
      body: JSON.stringify({ name: 'Web Client Key', role: 'write' })
    });
    assert.equal(createKey.status, 201);
    assert.equal(createKey.json.data.role, 'write');
    const keyId = createKey.json.data.id;

    const listKeys = await request('/api/auth/keys');
    assert.ok(listKeys.json.data.length >= 2);
    assert.ok(listKeys.json.data.some(k => k.name === '管理员密钥'));

    const delKey = await request(`/api/auth/keys/${keyId}`, {
      method: 'DELETE'
    });
    assert.equal(delKey.status, 200);
  });

  await t.test('Raw SQL Execution endpoint', async () => {
    const sqlRes = await request('/api/sql', {
      method: 'POST',
      body: JSON.stringify({ sql: 'SELECT 1 + 1 as sum' })
    });
    assert.equal(sqlRes.status, 200);
    assert.equal(sqlRes.json.data.rows[0].sum, 2);
  });

  await new Promise((resolve) => server.stop(resolve));
});
