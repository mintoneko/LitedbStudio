import { SQLiteAdapter } from '../packages/core/src/db-adapter.js';

const dbPath = process.argv[2] || './data/litedb.db';
const db = new SQLiteAdapter(dbPath);

const result = db.adapter.prepare(`
  UPDATE "_litedb_keys"
  SET name = '管理员密钥'
  WHERE name = 'Default Admin Key' OR name LIKE '%?%'
`).run();

console.log(`Updated ${result.changes} key(s) to '管理员密钥' in ${dbPath}`);
db.close();
