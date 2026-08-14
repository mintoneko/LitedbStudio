import { LiteDBEngine } from '../packages/core/src/index.js';

const db = new LiteDBEngine({
  path: './data/litedb.db',
  adminKey: 'admin_litedb_master'
});

console.log('🌱 正在为 LiteDB 初始化包含数字 ID 与字符串 ID 的初始演示数据...');

// 1. 初始化 users 集合 (使用自增数字 ID: 1, 2, 3, 4)
const users = db.collection('users', { idType: 'auto-increment' });
users.clear();
users.insertMany([
  { id: 1, name: '张伟', email: 'zhangwei@example.com', role: 'admin', age: 28, city: '北京', tags: ['前端开发', '全栈'] },
  { id: 2, name: '李娜', email: 'lina@example.com', role: 'user', age: 24, city: '上海', tags: ['Vue3', 'UI设计'] },
  { id: 3, name: '王强', email: 'wangqiang@example.com', role: 'user', age: 31, city: '深圳', tags: ['Node.js', '架构'] },
  { id: 4, name: '赵敏', email: 'zhaomin@example.com', role: 'user', age: 22, city: '杭州', tags: ['React', '桌面端'] }
]);

// 2. 初始化 todos 集合 (支持自增数字 ID)
const todos = db.collection('todos', { idType: 'auto-increment' });
todos.clear();
todos.insertMany([
  { title: '测试 LiteDB Studio 可视化控制台', completed: true, priority: 1, category: 'work' },
  { title: '在前端项目中引入 @litedb/client SDK', completed: false, priority: 2, category: 'dev' },
  { title: '尝试在桌面端项目中使用嵌入式本地模式', completed: false, priority: 1, category: 'dev' },
  { title: '为 LiteDB 编写一个轻量个人博客后台', completed: false, priority: 3, category: 'personal' }
]);

// 3. 初始化 notes 集合
const notes = db.collection('notes');
notes.clear();
notes.insertMany([
  {
    id: 'note_arch_01',
    title: 'LiteDB 架构核心设计备忘',
    summary: '单文件 SQLite WAL 模式，内存常驻仅 15MB，零运维负担。',
    likes: 42,
    published: true
  },
  {
    id: 'note_phil_02',
    title: '轻量化开发哲学',
    summary: '少即是多，能用单文件解决的问题绝不搭繁重的集群。',
    likes: 88,
    published: true
  }
]);

// 4. 创建一个前端专用的 Read-Write 密钥
const existingKeys = db.listApiKeys();
if (!existingKeys.some(k => k.name === '前端应用只读/写入密钥')) {
  db.createApiKey('前端应用只读/写入密钥', 'read-write', 'key_frontend_webapp_live');
}

console.log('✅ 演示数据初始化完成！');
db.close();
