# ⚡ LiteDB Studio

> **专为前端与轻量桌面端打造的超轻量自包含数据库解决方案**
>
> 🚀 **极低内存占用（常驻 ~15MB）** • 🎨 **现代 Vue 3 + Vite Studio 控制台（支持 OLED 纯黑与明亮自适应主题）** • 🌐 **前后端同构 SDK 规范** • 🛡️ **单文件 SQLite WAL 强力底层** • 📦 **开箱即用**

---

## 🌟 为什么选择 LiteDB？

在日常开发个人项目、前端展示应用、轻量级全栈或简易桌面端（Electron / Tauri）时，搭建传统的 MySQL / PostgreSQL / MongoDB 往往非常繁重：
- **服务器配置有限**：在 1核1G / 1核2G 等轻量 VPS 上，MySQL 常驻占用 300MB~800MB 内存，极大挤占系统宝贵资源。
- **前后端重复造轮子**：为了存取几个业务实体，需要反复手写建表迁移、ORM 配置与增删改查 REST 接口。
- **桌面端适配困难**：桌面端项目如果不希望强依赖远程网络，往往需要写另外一套本地存储逻辑，前后端规范不统一。

**LiteDB 统一了这一切：**
1. **统一的 SDK 语法**：无论是在浏览器端通过 HTTP 访问，还是在桌面端直接嵌入读取本地 SQLite 文件，**调用语法 100% 完全同构一致**。
2. **纯数字自增主键与无模式文档存储**：像使用 MongoDB 一样随心所欲存取 JSON 对象，默认自动维护自增数字 ID（1, 2, 3...）、`created_at`、`updated_at`，无需手动建表与写迁移脚本。
3. **超高性能与事务安全**：底层基于 SQLite3 并发 WAL（Write-Ahead Logging）模式，单文件持久化，崩溃自动恢复，单表百万级数据毫秒级响应。
4. **自包含 Web 控制台（LiteDB Studio）**：
   - 基于 **Vite + Vue 3 + Lucide Icons** 现代化重构；
   - 支持 **OLED 纯黑 Dark Mode** 与 **清爽 Light Mode**，默认自动跟随操作系统外观，支持随时一键切换；
   - 具备数据集合可视化浏览与编辑、SQL 终端工作台、API 密钥分级管理、开箱即用的前端调用代码生成器、全量 JSON 快照备份与恢复；
   - 支持完整的 **URL Hash 路由持久化**，刷新页面始终保持当前栏目与数据集合状态。

---

## 🚀 极速上手 (Quick Start)

### 1. 启动 LiteDB 服务端

只需单命令即可启动服务：

```bash
# 安装依赖
npm install

# 启动 LiteDB 服务 (默认端口 3000，数据保存在 ./data/litedb.db)
node bin/litedb.js start

# 或者指定端口、数据库路径与管理员密钥
node bin/litedb.js start --port 3000 --db ./data/litedb.db --admin-key admin_litedb_master
```

启动后控制台将输出：
```text
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ⚡ LiteDB Server v1.0.0 is Running!                       │
│                                                             │
│   • Local Endpoint  : http://localhost:3000                 │
│   • REST API Root   : http://localhost:3000/api             │
│   • LiteDB Studio   : http://localhost:3000/                │
│   • Database File   : ./data/litedb.db                      │
│   • Admin API Key   : admin_litedb_master                   │
│   • Memory Overhead : ~15 MB                                │
│                                                             │
│   Ready for frontend & desktop connections!                 │
└─────────────────────────────────────────────────────────────┘
```

打开浏览器访问 **`http://localhost:3000`** 即可进入 **LiteDB Studio 可视化管理控制台**！

---

## 📦 统一客户端 SDK (`@litedb/client`) 与各框架使用指南

### 1. 基础 SDK 标准接入 (TypeScript / JavaScript)

```typescript
import { LiteDB } from '@litedb/client';

// 1. 初始化客户端
const db = new LiteDB({
  endpoint: 'http://localhost:3000',
  apiKey: 'your_api_key' // 可在 Studio 控制台中一键生成
});

const todos = db.collection('todos');

// 2. 增删改查标准操作
async function run() {
  // ① 插入单条文档 (自动维护从 1 递增的数字 ID)
  const item = await todos.insert({
    title: '学习 LiteDB 规范',
    completed: false,
    priority: 1,
    tags: ['dev', 'database']
  });
  console.log('创建成功，ID:', item.id); // 输出: 1

  // ② 批量插入
  await todos.insertMany([
    { title: '任务 A', completed: false },
    { title: '任务 B', completed: true }
  ]);

  // ③ 高级条件查询与分页 (默认按 ID 升序排列)
  const pageResult = await todos.paginate({
    completed: false,
    priority: { $gte: 1 }
  }, {
    page: 1,
    pageSize: 10,
    sort: { created_at: -1 }
  });
  console.log('当前页记录:', pageResult.data);
  console.log('总记录数:', pageResult.total);

  // ④ 根据 ID 查询单条
  const single = await todos.findById(item.id);

  // ⑤ 局部更新记录
  await todos.updateById(item.id, { completed: true });

  // ⑥ 批量更新
  await todos.updateMany({ completed: false }, { status: 'archived' });

  // ⑦ 删除记录
  await todos.deleteById(item.id);
}

run();
```

---

### 2. Vue 3 (组合式 API / `<script setup>`)

```vue
<template>
  <div class="todo-app">
    <h2>LiteDB 待办列表</h2>
    
    <!-- 输入框 -->
    <div class="input-row">
      <input v-model="newTitle" placeholder="输入待办标题" @keydown.enter="addTodo" />
      <button @click="addTodo">添加</button>
    </div>

    <!-- 列表 -->
    <ul>
      <li v-for="item in todos" :key="item.id">
        <span :class="{ done: item.completed }">{{ item.title }}</span>
        <button @click="toggleTodo(item)">{{ item.completed ? '未完成' : '完成' }}</button>
        <button @click="deleteTodo(item.id)">删除</button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { LiteDB } from '@litedb/client';

const db = new LiteDB({
  endpoint: 'http://localhost:3000',
  apiKey: 'key_frontend_webapp_live'
});

const todoCol = db.collection('todos');
const todos = ref([]);
const newTitle = ref('');

const loadTodos = async () => {
  todos.value = await todoCol.find({}, { sort: { id: -1 } });
};

const addTodo = async () => {
  if (!newTitle.value.trim()) return;
  await todoCol.insert({ title: newTitle.value, completed: false });
  newTitle.value = '';
  loadTodos();
};

const toggleTodo = async (item) => {
  await todoCol.updateById(item.id, { completed: !item.completed });
  loadTodos();
};

const deleteTodo = async (id) => {
  await todoCol.deleteById(id);
  loadTodos();
};

onMounted(loadTodos);
</script>
```

---

### 3. React (Hooks)

```tsx
import React, { useEffect, useState } from 'react';
import { LiteDB } from '@litedb/client';

const db = new LiteDB({
  endpoint: 'http://localhost:3000',
  apiKey: 'key_frontend_webapp_live'
});
const usersCol = db.collection('users');

export function UserList() {
  const [users, setUsers] = useState<any[]>([]);

  const loadUsers = async () => {
    const list = await usersCol.find({}, { sort: { id: -1 } });
    setUsers(list);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div>
      <h3>用户列表 ({users.length})</h3>
      <ul>
        {users.map(u => (
          <li key={u.id}>
            <strong>#{u.id} {u.name}</strong> - {u.email} ({u.role})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

### 4. 桌面端 / 本地脚本嵌入式模式 (Embedded Mode)

在 Electron、Tauri 或 Node.js 离线脚本中，**无需启动 HTTP 端口**，直接零开销读写本地 SQLite 文件，**语法与远程模式 100% 保持完全同构**：

```typescript
import { LiteDB } from '@litedb/client';

// 开启 embedded 模式，指定本地 db 文件路径即可
const db = new LiteDB({
  mode: 'embedded',
  dbPath: './data/desktop_app.db'
});

const notes = db.collection('notes');

// 语法完全相同！
const note = await notes.insert({ title: '本地离线笔记', content: '秒级读写' });
const allNotes = await notes.find({ title: { $like: '%笔记%' } });
console.log(allNotes);
```

---

### 5. 纯原生 Fetch 方式（前端零依赖）

```javascript
const BASE_URL = 'http://localhost:3000/api';
const API_KEY = 'key_frontend_webapp_live';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`
};

// 插入文档
fetch(`${BASE_URL}/collections/todos/insert`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ title: '纯原生 Fetch 极速调用', views: 100 })
}).then(r => r.json()).then(console.log);

// 高级条件查询
fetch(`${BASE_URL}/collections/todos/query`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    filter: { views: { $gte: 50 } },
    sort: { id: -1 },
    page: 1,
    pageSize: 20
  })
}).then(r => r.json()).then(res => console.log('查询结果:', res.data));
```

---

### 6. Python 与 cURL 脚本接入

#### Python 示例 (`requests`):
```python
import requests

BASE_URL = "http://localhost:3000/api"
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": "Bearer key_frontend_webapp_live"
}

# 1. 插入文档
doc = {"name": "张三", "age": 26, "city": "北京"}
r = requests.post(f"{BASE_URL}/collections/users/insert", json=doc, headers=HEADERS)
print("插入返回:", r.json())

# 2. 查询列表
query_payload = {
    "filter": {"age": {"$gte": 18}},
    "sort": {"id": -1}
}
res = requests.post(f"{BASE_URL}/collections/users/query", json=query_payload, headers=HEADERS)
print("用户列表:", res.json()["data"])
```

#### cURL 示例:
```bash
# 查询 users 集合
curl -X POST http://localhost:3000/api/collections/users/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer key_frontend_webapp_live" \
  -d '{"filter": {"role": "admin"}}'
```

---

## 🔍 查询操作符规范 (Query Operators)

LiteDB 查询引擎完全支持类 MongoDB 的强大操作符：

| 操作符 | 含义 | 示例 | 说明 |
| :--- | :--- | :--- | :--- |
| **直接值** | 等于 | `{ role: 'admin' }` | 字段值等于指定内容 |
| **`$eq`** | 等于 | `{ age: { $eq: 18 } }` | 精确匹配 |
| **`$ne`** | 不等于 | `{ status: { $ne: 'deleted' } }` | 不等于指定内容 |
| **`$gt`** | 大于 | `{ score: { $gt: 80 } }` | 严格大于 |
| **`$gte`** | 大于等于 | `{ age: { $gte: 18 } }` | 大于或等于 |
| **`$lt`** | 小于 | `{ price: { $lt: 100 } }` | 严格小于 |
| **`$lte`** | 小于等于 | `{ price: { $lte: 99.9 } }` | 小于或等于 |
| **`$in`** | 包含在列表中 | `{ tag: { $in: ['vue', 'react'] } }` | 多值包含 |
| **`$nin`** | 不在列表中 | `{ category: { $nin: ['trash'] } }` | 多值排除 |
| **`$like`** | 模糊匹配 | `{ name: { $like: '张%' } }` | SQL LIKE 语法 |
| **`$contains`** | 包含子串 | `{ title: { $contains: 'LiteDB' } }` | 快速包含搜索 |
| **`$between`** | 区间匹配 | `{ age: { $between: [18, 35] } }` | 闭区间范围 |
| **`$or`** | 逻辑或 | `{ $or: [{ role: 'admin' }, { vip: true }] }` | 满足任一条件 |
| **`$and`** | 逻辑与 | `{ $and: [{ age: { $gte: 18 } }, { active: true }] }` | 满足所有条件 |

---

## 🖥️ RESTful API 接口速查表

| 请求方法 | 路由路径 | 权限要求 | 说明 |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/ping` | 公开 | 服务健康状态检查 |
| `GET` | `/api/collections` | Read-Only | 列出所有集合与文档数（按创建时间排序） |
| `POST` | `/api/collections` | Admin | 创建新集合 |
| `DELETE` | `/api/collections/:name` | Admin | 删除整个集合及其数据 |
| `POST` | `/api/collections/:name/insert` | Read-Write | 插入单条或批量 JSON 文档（自增数字 ID） |
| `POST` | `/api/collections/:name/query` | Read-Only | 高级条件查询（带分页、排序） |
| `GET` | `/api/collections/:name/:id` | Read-Only | 根据主键 ID 查询单条记录 |
| `PUT` | `/api/collections/:name/:id` | Read-Write | 根据主键 ID 增量更新字段 |
| `DELETE` | `/api/collections/:name/:id` | Read-Write | 根据主键 ID 删除记录 |
| `POST` | `/api/collections/:name/count` | Read-Only | 统计符合条件的文档数量 |
| `POST` | `/api/collections/:name/clear` | Admin | 清空集合所有数据 |
| `POST` | `/api/sql` | Admin | 执行参数化原生 SQL |
| `GET` | `/api/system/stats` | Read-Only | 获取内存占用、文件大小、系统状态 |
| `GET` | `/api/system/export` | Admin | 导出全量 JSON 备份快照 |
| `POST` | `/api/system/import` | Admin | 通过 JSON 快照恢复数据 |

---

## 🛠️ 生产环境部署 (Production Deployment)

### 方案 1：Docker / Docker Compose（推荐）

直接在服务器创建 `docker-compose.yml`：

```yaml
services:
  litedb:
    image: node:22-alpine
    working_dir: /app
    volumes:
      - ./LiteDB:/app
      - ./data:/data
    environment:
      - LITEDB_PORT=3000
      - LITEDB_PATH=/data/litedb.db
      - LITEDB_ADMIN_KEY=your_secret_admin_key
    ports:
      - "3000:3000"
    command: ["node", "bin/litedb.js", "start"]
    restart: unless-stopped
```

运行：
```bash
docker compose up -d
```

### 方案 2：PM2 进程守护

```bash
# 全局安装 pm2
npm install -g pm2

# 启动 LiteDB 服务
pm2 start bin/litedb.js --name "litedb" -- start --port 3000 --db ./data/litedb.db

# 设置开机自启
pm2 save
pm2 startup
```

---

## 📂 项目模块结构

```text
LiteDB/
├── packages/
│   ├── core/                  # LiteDB 核心引擎 (SQLite3 + WAL + 查询解析器)
│   ├── server/                # LiteDB HTTP Server 服务端 (REST API + 鉴权 + 静态托管)
│   ├── client/                # 统一客户端 SDK (双模式: 远程 HTTP / 本地嵌入式)
│   └── studio/                # 内置可视化管理后台 (Vite + Vue 3 + Lucide Icons)
├── examples/
│   ├── web-quickstart/        # 前端页面直连示例
│   └── desktop-quickstart/    # 桌面端/本地脚本嵌入模式示例
├── bin/
│   └── litedb.js              # 全局/本地 CLI 执行入口
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 📄 开源许可证

MIT License
