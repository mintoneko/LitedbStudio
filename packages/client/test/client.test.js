import test from 'node:test';
import assert from 'node:assert/strict';
import { LiteDBServer } from '@litedb/server';
import { LiteDB } from '../src/index.js';

test('LiteDB Universal Client SDK Tests', async (t) => {
  // Setup test server for HTTP Mode
  const server = new LiteDBServer({
    port: 4999,
    dbPath: ':memory:',
    adminKey: 'sdk_test_admin_key'
  });
  await new Promise((resolve) => server.start(resolve));

  await t.test('HTTP Mode: CRUD, pagination, and query operators', async () => {
    const db = new LiteDB({
      endpoint: 'http://localhost:4999',
      apiKey: 'sdk_test_admin_key'
    });

    const articles = db.collection('articles');

    // 1. Insert single & batch
    const a1 = await articles.insert({ title: 'Intro to LiteDB', views: 100, isDraft: false });
    assert.ok(a1.id);
    assert.equal(a1.title, 'Intro to LiteDB');
    assert.equal(a1.views, 100);

    const aBatch = await articles.insertMany([
      { title: 'Vue Integration Guide', views: 250, isDraft: false },
      { title: 'Draft Notes', views: 10, isDraft: true }
    ]);
    assert.equal(aBatch.length, 2);

    // 2. Query with operators
    const published = await articles.find({ isDraft: false, views: { $gte: 200 } });
    assert.equal(published.length, 1);
    assert.equal(published[0].title, 'Vue Integration Guide');

    // 3. Paginate
    const pag = await articles.paginate({}, { page: 1, pageSize: 2, sort: { views: -1 } });
    assert.equal(pag.total, 3);
    assert.equal(pag.totalPages, 2);
    assert.equal(pag.data.length, 2);
    assert.equal(pag.data[0].views, 250);

    // 4. UpdateById
    const updated = await articles.updateById(a1.id, { views: 120 });
    assert.equal(updated.views, 120);

    // 5. Count
    const count = await articles.count({ isDraft: false });
    assert.equal(count, 2);

    // 6. DeleteById
    const del = await articles.deleteById(a1.id);
    assert.equal(del, true);

    const countAfter = await articles.count();
    assert.equal(countAfter, 2);

    // 7. System stats
    const stats = await db.getStats();
    assert.ok(stats.totalDocuments >= 2);
  });

  await t.test('Embedded Local Mode: Zero-network execution with identical API', async () => {
    const db = new LiteDB({
      mode: 'embedded',
      dbPath: ':memory:'
    });

    const todos = db.collection('todos');

    // Insert
    const t1 = await todos.insert({ text: 'Build awesome frontend', done: false, priority: 1 });
    assert.ok(t1.id);

    // Query
    const results = await todos.find({ done: false });
    assert.equal(results.length, 1);
    assert.equal(results[0].text, 'Build awesome frontend');

    // Update
    const u = await todos.updateById(t1.id, { done: true });
    assert.equal(u.done, true);

    // Count
    assert.equal(await todos.count({ done: true }), 1);

    // Delete
    assert.equal(await todos.deleteById(t1.id), true);
    assert.equal(await todos.count(), 0);

    db.close();
  });

  await new Promise((resolve) => server.stop(resolve));
});
