import test from 'node:test';
import assert from 'node:assert/strict';
import { LiteDBEngine } from '../src/index.js';

test('LiteDB Engine & Collection - in-memory CRUD & operators', async (t) => {
  const db = new LiteDBEngine({ path: ':memory:' });

  await t.test('Insert single & bulk documents', () => {
    const users = db.collection('users');
    const u1 = users.insert({ name: 'Alice', age: 25, tags: ['frontend', 'react'], role: 'admin' });
    const u2 = users.insert({ name: 'Bob', age: 30, tags: ['backend', 'node'], role: 'user' });
    const u3 = users.insert({ name: 'Charlie', age: 19, tags: ['fullstack'], role: 'user' });

    assert.ok(u1.id, 'u1 should have an id');
    assert.equal(u1.name, 'Alice');
    assert.equal(u1.age, 25);
    assert.ok(u1.created_at, 'u1 should have created_at');

    const total = users.count();
    assert.equal(total, 3);
  });

  await t.test('Find by ID & findOne', () => {
    const users = db.collection('users');
    const alice = users.findOne({ name: 'Alice' });
    assert.ok(alice);
    assert.equal(alice.role, 'admin');

    const byId = users.findById(alice.id);
    assert.deepEqual(byId, alice);
  });

  await t.test('Advanced query operators ($gte, $in, $like, $or, $and)', () => {
    const users = db.collection('users');

    // $gte
    const older = users.find({ age: { $gte: 25 } });
    assert.equal(older.length, 2);

    // $in
    const names = users.find({ name: { $in: ['Alice', 'Charlie'] } });
    assert.equal(names.length, 2);

    // $like
    const charlie = users.find({ name: { $like: 'Char%' } });
    assert.equal(charlie.length, 1);
    assert.equal(charlie[0].name, 'Charlie');

    // $or
    const orResult = users.find({
      $or: [
        { age: { $lt: 20 } },
        { role: 'admin' }
      ]
    });
    assert.equal(orResult.length, 2); // Charlie (19) and Alice (admin)
  });

  await t.test('Sorting & Pagination', () => {
    const users = db.collection('users');
    
    // Sort descending by age
    const sorted = users.find({}, { sort: { age: -1 } });
    assert.equal(sorted[0].name, 'Bob'); // 30
    assert.equal(sorted[1].name, 'Alice'); // 25
    assert.equal(sorted[2].name, 'Charlie'); // 19

    // Pagination
    const pageResult = users.paginate({}, { page: 1, pageSize: 2, sort: { age: 1 } });
    assert.equal(pageResult.page, 1);
    assert.equal(pageResult.pageSize, 2);
    assert.equal(pageResult.total, 3);
    assert.equal(pageResult.totalPages, 2);
    assert.equal(pageResult.data.length, 2);
    assert.equal(pageResult.data[0].name, 'Charlie'); // 19
  });

  await t.test('UpdateById and UpdateMany', () => {
    const users = db.collection('users');
    const bob = users.findOne({ name: 'Bob' });
    
    const updatedBob = users.updateById(bob.id, { age: 31, location: 'Shenzhen' });
    assert.equal(updatedBob.age, 31);
    assert.equal(updatedBob.location, 'Shenzhen');
    assert.equal(updatedBob.name, 'Bob');

    // Update many
    const updatedCount = users.updateMany({ role: 'user' }, { verified: true });
    assert.equal(updatedCount, 2);

    const verifiedUsers = users.find({ verified: true });
    assert.equal(verifiedUsers.length, 2);
  });

  await t.test('DeleteById and DeleteMany', () => {
    const users = db.collection('users');
    const charlie = users.findOne({ name: 'Charlie' });
    
    const deleted = users.deleteById(charlie.id);
    assert.equal(deleted, true);
    assert.equal(users.count(), 2);

    const deleteCount = users.deleteMany({ role: 'user' });
    assert.equal(deleteCount, 1); // Bob
    assert.equal(users.count(), 1); // Only Alice remains
  });

  await t.test('API Keys Management & Protection', () => {
    const keyRecord = db.createApiKey('Test Client', 'write');
    assert.ok(keyRecord.key);
    assert.equal(keyRecord.role, 'write');

    const legacyKeyRecord = db.createApiKey('Legacy Client', 'read-write');
    assert.equal(legacyKeyRecord.role, 'write');

    const readKeyRecord = db.createApiKey('Read Client', 'read');
    assert.equal(readKeyRecord.role, 'read');

    // Test custom API Key token
    const customKeyRecord = db.createApiKey('Custom Token Client', 'write', 'my_custom_token_123');
    assert.equal(customKeyRecord.key, 'my_custom_token_123');

    // Test duplicate custom token throws error
    assert.throws(() => {
      db.createApiKey('Duplicate Custom Token', 'read', 'my_custom_token_123');
    });

    const valid = db.validateApiKey(keyRecord.key);
    assert.ok(valid);
    assert.equal(valid.name, 'Test Client');
    assert.equal(valid.role, 'write');

    const invalid = db.validateApiKey('invalid_key_123');
    assert.equal(invalid, null);

    const list = db.listApiKeys();
    assert.ok(list.length >= 2); // 管理员密钥 + test clients
    const adminKey = list.find(k => k.name === '管理员密钥');
    assert.ok(adminKey);

    // Deleting non-admin key succeeds
    assert.equal(db.deleteApiKey(customKeyRecord.id), true);

    // Deleting the last admin key throws error
    assert.throws(() => {
      db.deleteApiKey(adminKey.id);
    });

    // Create a second admin key, now deleting one admin key succeeds
    const secondAdmin = db.createApiKey('Second Admin', 'admin', 'admin_secondary_key_999');
    assert.equal(db.deleteApiKey(secondAdmin.id), true);

    // Now only 1 admin key remains, deleting it should throw error again
    assert.throws(() => {
      db.deleteApiKey(adminKey.id);
    });
  });

  await t.test('Raw SQL Execution', () => {
    const res = db.rawSql('SELECT COUNT(*) as c FROM "_litedb_meta"');
    assert.equal(res.type, 'select');
    assert.ok(res.rows[0].c >= 1);
  });

  await t.test('System Stats & Export Snapshot', () => {
    const stats = db.getStats();
    assert.equal(stats.collectionsCount, 1);
    assert.equal(stats.totalDocuments, 1);

    const snapshot = db.exportSnapshot();
    assert.ok(snapshot.collections.users);
    assert.equal(snapshot.collections.users.length, 1);
  });

  db.close();
});
