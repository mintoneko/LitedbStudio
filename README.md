<div align="center">

<h1>
  <img src="packages/studio/public/favicon.svg" alt="LiteDB Studio logo" width="42" height="42" valign="middle">
  LiteDB Studio
</h1>

面向前端、轻量全栈和桌面应用的 SQLite JSON 文档数据库。

<p>
  <a href="https://github.com/mintoneko/LitedbStudio">GitHub</a>
  ·
  <a href="#快速开始">快速开始</a>
  ·
  <a href="#javascript-sdk">JavaScript SDK</a>
  ·
  <a href="#部署">部署</a>
</p>

[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white&style=flat-square)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL-003B57?logo=sqlite&logoColor=white&style=flat-square)](https://www.sqlite.org/)
[![Vue 3](https://img.shields.io/badge/Studio-Vue%203-42B883?logo=vue.js&logoColor=white&style=flat-square)](https://vuejs.org/)
[![License](https://img.shields.io/github/license/mintoneko/LitedbStudio?style=flat-square)](LICENSE)

</div>

LiteDB Studio 将 SQLite 文件、JSON 文档模型、Node.js REST 服务、统一 JavaScript SDK 和 Vue 3 管理控制台组合在一个 monorepo 中。它可以作为本地嵌入式数据库运行，也可以作为独立的轻量 API 服务运行。

## 为什么选择 LiteDB

- **零额外数据库服务**：数据保存在单个 SQLite 文件中，适合原型、个人项目和内部工具。
- **两种运行模式**：同一套 SDK API 同时支持 HTTP 远程连接和本地 embedded 模式。
- **开箱即用的管理界面**：通过 Studio 查看集合、编辑 JSON 文档、管理 API Key 和导入导出快照。
- **贴近 JavaScript 开发习惯**：无固定 Schema，使用对象描述文档和类 MongoDB 查询条件。
- **可逐步扩展**：需要简单 CRUD 时使用 SDK，需要复杂分析时使用参数化查询或管理员 SQL。

LiteDB 的定位是单机、单实例的轻量数据层。当前版本不提供集群、复制、实时订阅、自动 Schema 校验或迁移系统。

### 适用边界与并发

这套方案对中小规模单实例够用，但不是“什么场景都完美”的数据库。

| 场景 | 结论 |
| --- | --- |
| 个人项目、内部工具、中小后台 | 适合。单文件 + WAL，部署简单。 |
| 中小并发、读多写少 | 可以坚持。单进程内请求串行访问 SQLite，WAL 适合读多写少。 |
| 多进程 / 多机同时写同一个库文件 | 不适合作为主方案。可能出现锁等待或 `SQLITE_BUSY`。 |
| 需要集群、复制、水平扩展 | 超出定位，应换用独立数据库服务。 |

单进程部署时，简单 CRUD 通常能稳定支撑几十到一两百 QPS 量级的中小流量。写入走 `BEGIN IMMEDIATE`，并设置了 `busy_timeout`，短时争用会等待而不是立刻失败。若流量继续上涨，应拆分写入、加缓存，或迁移到专用数据库。

## 核心能力

| 能力 | 说明 |
| --- | --- |
| SQLite 存储 | 单文件持久化，默认启用 WAL、外键、`busy_timeout`、缓存和内存临时表。 |
| JSON 文档 | 自定义字段存储在 JSON 数据列，每条记录自动带有 `id`、`created_at`、`updated_at`。 |
| 双运行模式 | `@litedb/client` 支持 HTTP 和 embedded，两种模式共用集合 API。 |
| 查询与分页 | 支持比较、集合、模糊匹配、逻辑组合、排序、字段选择、`limit/skip` 和分页。 |
| REST API | 提供健康检查、集合 CRUD、统计、快照、API Key 和管理员 SQL 接口。 |
| 权限控制 | `read`、`write`、`admin` 三种 API Key 角色，兼容旧角色名。 |
| Studio 控制台 | 概览、集合与数据、API 密钥授权、备份与导入，支持响应式布局和三种主题。 |
| SDK 类型声明 | `@litedb/client` 与 `@litedb/core` 提供 TypeScript 声明文件。 |

## 架构

```text
HTTP 模式
浏览器 / Node.js / cURL
          │
          │ @litedb/client 或 REST API
          ▼
   @litedb/server · LiteDBServer
          │
          ▼
   @litedb/core · LiteDBEngine
          │
          ▼
      SQLite 文件

Embedded 模式
Node.js / Electron / Tauri
          │
          │ @litedb/client
          ▼
   @litedb/core · LiteDBEngine
          │
          ▼
      本地 SQLite 文件
```

Studio 是 `packages/studio` 下的 Vue 3 应用。构建后，LiteDB CLI 会自动托管 `packages/studio/dist`，因此同一个服务可以同时提供 REST API 和管理页面。

## 快速开始

### 环境要求

- Node.js 22 或更高版本；
- npm；
- 使用 Studio 时需要浏览器；
- 使用 Docker 部署时需要 Docker Compose。

### 安装并启动

```bash
git clone https://github.com/mintoneko/LitedbStudio.git
cd LitedbStudio
npm ci

# 构建 Studio，生产服务会自动托管这个目录
npm --workspace=packages/studio run build

# 启动 LiteDB 服务
node bin/litedb.js \
  --port 3000 \
  --db ./data/litedb.db \
  --admin-key replace_with_a_long_secret
```

启动后访问：

- Studio：<http://localhost:3000/>
- REST API：<http://localhost:3000/api>
- 健康检查：<http://localhost:3000/api/ping>

在 Studio 的「连接设置」中填写服务地址 `http://localhost:3000` 和上面的管理员密钥即可进入控制台。

如果没有传入管理员密钥，且数据库中还没有 API Key，LiteDB 会自动生成管理员密钥并打印到启动日志。数据库已经存在管理员密钥时，后续启动不会用新的 `--admin-key` 覆盖它。

### 检查服务

健康检查不需要 API Key：

```bash
curl http://localhost:3000/api/ping
```

访问受保护的接口时，推荐使用 Bearer Token：

```bash
curl http://localhost:3000/api/system/stats \
  -H "Authorization: Bearer replace_with_a_long_secret"
```

## JavaScript SDK

`@litedb/client` 的集合 API 在 HTTP 和 embedded 模式下保持一致。下面的示例可在本仓库的 workspace 环境中使用。

### HTTP 模式

适用于浏览器、Node.js 服务、脚本和跨进程调用：

```js
import { LiteDB } from '@litedb/client';

const db = new LiteDB({
  endpoint: 'http://localhost:3000',
  apiKey: 'replace_with_a_long_secret'
});

const todos = db.collection('todos');

const todo = await todos.insert({
  title: '接入 LiteDB',
  completed: false,
  priority: 1
});

const page = await todos.paginate(
  { completed: false, priority: { $gte: 1 } },
  {
    page: 1,
    pageSize: 20,
    sort: { created_at: -1 },
    select: ['id', 'title', 'completed']
  }
);

await todos.updateById(todo.id, { completed: true });
console.log(page.data, page.total);
```

### Embedded 模式

适用于 Node.js、Electron 主进程、Tauri 后端和其他可以访问本地文件系统的运行环境。它不启动 HTTP 端口：

```js
import { LiteDB } from '@litedb/client';

const db = new LiteDB({
  mode: 'embedded',
  dbPath: './data/desktop_app.db'
});

const notes = db.collection('notes');
await notes.insert({
  title: '离线笔记',
  content: '直接写入本地 SQLite 文件'
});

const notesList = await notes.find(
  { title: { $contains: '笔记' } },
  { sort: { id: -1 } }
);

console.log(notesList);
db.close();
```

### 常用 API

| 对象 | 方法 |
| --- | --- |
| `db` | `collection`、`listCollections`、`createCollection`、`dropCollection` |
| `db` | `getStats`、`exportSnapshot`、`importSnapshot`、`rawSql`、`close` |
| `collection` | `insert`、`insertMany`、`findById`、`findOne`、`find`、`paginate`、`count` |
| `collection` | `updateById`、`updateMany`、`deleteById`、`deleteMany`、`clear`、`createIndex` |

### 查询操作符

普通字段默认使用 AND 组合；嵌套字段支持点路径，例如 `profile.email`。

| 类型 | 操作符 |
| --- | --- |
| 比较 | `$eq`、`$ne`、`$gt`、`$gte`、`$lt`、`$lte` |
| 集合 | `$in`、`$nin` |
| 文本 | `$like`、`$ilike`、`$contains`、`$startsWith`、`$endsWith` |
| 范围与存在性 | `$between`、`$exists` |
| 逻辑 | `$or`、`$and` |

示例：

```js
const result = await todos.find({
  $or: [
    { completed: false },
    { priority: { $gte: 3 } }
  ]
}, {
  sort: { created_at: -1 },
  limit: 20
});
```

默认 ID 为从 `1` 开始的数字 ID。更新操作只合并顶层自定义字段，不会修改 `id` 和 `created_at`，并会刷新 `updated_at`。

## LiteDB Studio

Studio 提供以下工作区：

- **概览与监控**：SQLite 驱动、数据库路径、文件大小、集合数量、文档总数和进程内存；
- **集合与数据**：创建/删除集合，JSON 查询，分页浏览，新增、编辑、复制和删除文档；
- **API 密钥授权**：创建自定义 Token，选择 `read`、`write` 或 `admin` 角色，查看使用时间；
- **备份与导入**：下载全量 JSON 快照，或将快照追加导入数据库；
- **连接与主题**：浏览器保存连接设置，支持系统、浅色、深色主题和响应式布局。

### 本地开发

终端 1：启动 API 服务到 `3001` 端口。

```bash
node bin/litedb.js \
  --port 3001 \
  --db ./data/litedb.db \
  --admin-key replace_with_a_long_secret
```

终端 2：启动 Studio Vite 服务。

```bash
npm run dev:studio
```

默认情况下，Studio 使用 `3000` 端口，并将 `/api` 代理到 `http://localhost:3001`。需要自定义端口时：

```bash
VITE_PORT=3100 \
VITE_API_TARGET=http://localhost:3101 \
npm run dev:studio
```

PowerShell：

```powershell
$env:VITE_PORT = '3100'
$env:VITE_API_TARGET = 'http://localhost:3101'
npm run dev:studio
```

## REST API

### 认证

服务支持以下三种 API Key 传递方式，生产环境推荐 Bearer Token：

```http
Authorization: Bearer your_api_key
```

也支持 `x-api-key` 请求头和 `api_key` 查询参数。查询参数可能出现在日志或浏览器历史记录中，不建议用于生产环境。

### 权限角色

| 角色 | 能力 |
| --- | --- |
| `read` | 健康状态、系统统计、集合列表、查询、按 ID 读取和计数。 |
| `write` | 包含 `read`，并可新增、更新和删除文档。 |
| `admin` | 包含全部能力，并可管理集合、API Key、索引、快照和原生 SQL。 |

系统创建的默认管理员密钥受到保护，不能通过 Studio 或 API 删除。建议为每个前端、脚本或桌面应用创建独立的低权限密钥。

### 常用端点

| 方法 | 路径 | 最低权限 | 用途 |
| --- | --- | --- | --- |
| `GET` | `/api/ping` | 公开 | 健康检查。 |
| `GET` / `POST` | `/api/auth/verify` | 根据请求 | 校验 API Key 并返回角色。 |
| `GET` | `/api/system/stats` | `read` | 获取数据库和进程统计。 |
| `GET` | `/api/collections` | `read` | 列出集合及文档数量。 |
| `POST` | `/api/collections/:name/insert` | `write` | 插入单条或批量文档。 |
| `POST` | `/api/collections/:name/query` | `read` | 查询、排序、字段选择和分页。 |
| `GET` | `/api/collections/:name/:id` | `read` | 按 ID 读取文档。 |
| `PUT` / `DELETE` | `/api/collections/:name/:id` | `write` | 更新或删除文档。 |
| `GET` | `/api/system/export` | `admin` | 导出 JSON 快照。 |
| `POST` | `/api/system/import` | `admin` | 导入 JSON 快照。 |
| `POST` | `/api/sql` | `admin` | 执行原生 SQL。 |

成功响应通常使用 `{ "success": true, "data": ... }`，错误响应使用 `{ "success": false, "error": { "code", "message" } }`。

## 配置

### LiteDB 服务

命令行参数优先级高于环境变量：

| 参数 | 环境变量 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `--port`、`-p` | `LITEDB_PORT` | `3000` | HTTP 监听端口。 |
| `--host`、`-h` | `LITEDB_HOST` | `0.0.0.0` | HTTP 监听地址。 |
| `--db`、`-d` | `LITEDB_PATH` | `./data/litedb.db` | SQLite 数据库文件路径。 |
| `--admin-key`、`-k` | `LITEDB_ADMIN_KEY` | 自动生成 | 首次初始化时使用的管理员密钥。 |
| `--allow-anonymous` | `LITEDB_ALLOW_ANONYMOUS=true` | `false` | 允许匿名请求，仅用于本地临时演示。 |

### Studio 开发服务器

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_PORT` | `3000` | Vite 开发服务器端口。 |
| `VITE_API_TARGET` | `http://localhost:3001` | `/api` 代理目标。 |

## 部署

### Docker Compose

构建镜像前先生成 Studio 静态文件。Dockerfile 不会在镜像构建过程中执行 Vite 构建：

```bash
npm ci
npm --workspace=packages/studio run build

# 运行前请先修改 docker-compose.yml 中的 LITEDB_ADMIN_KEY
docker compose up -d --build
docker compose logs -f litedb
```

默认配置会将宿主机 `./data` 挂载到容器 `/data`，并将服务暴露在 `3000` 端口。停止服务但保留数据库文件：

```bash
docker compose down
```

### 直接使用 Node.js 或进程管理器

```bash
npm --workspace=packages/studio run build
node bin/litedb.js \
  --host 0.0.0.0 \
  --port 3000 \
  --db ./data/litedb.db \
  --admin-key replace_with_a_long_secret
```

公网部署时，请在前面配置 HTTPS 反向代理和访问控制，并根据实际网络修改默认的 `0.0.0.0` 监听地址。

## 项目结构

```text
LitedbStudio/
├── bin/litedb.js                 # CLI 入口
├── packages/
│   ├── core/                     # SQLite 存储、文档集合和查询解析
│   ├── server/                   # HTTP 服务、REST 路由和认证
│   ├── client/                   # HTTP / embedded 统一 SDK
│   └── studio/                   # Vue 3 + Vite 管理控制台
├── examples/
│   ├── web-quickstart/           # 原生 HTML + Fetch 示例
│   └── desktop-quickstart/       # embedded 模式 Node.js 示例
├── scripts/                      # 演示数据和数据库维护脚本
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

## 开发与测试

常用命令：

| 命令 | 作用 |
| --- | --- |
| `npm run dev:studio` | 启动 Studio Vite 开发服务器。 |
| `npm run build` | 构建所有 workspace 中存在的构建目标，当前主要是 Studio。 |
| `npm test` | 运行 core 测试。 |
| `npm --workspace=packages/server test` | 运行 REST 服务测试。 |
| `npm --workspace=packages/client test` | 运行双模式 SDK 测试。 |
| `node examples/desktop-quickstart/index.js` | 运行 embedded 模式示例。 |
| `node scripts/seed.js` | 重建 `users`、`todos`、`notes` 演示数据。 |

运行 `scripts/seed.js` 会清空并重建演示集合，不要在重要数据库上执行。

完整测试：

```bash
npm test
npm --workspace=packages/server test
npm --workspace=packages/client test
```

## 安全与边界

- 默认监听地址是 `0.0.0.0`，同一网络中的其他设备可能可以访问服务；公网部署请使用防火墙、反向代理和 HTTPS。
- `--allow-anonymous` 会绕过角色检查并将请求视为管理员，只能用于本机临时演示。
- API Key 当前以明文存储在 `_litedb_keys` 表中，请保护数据库文件、快照和日志。
- `/api/sql` 只允许管理员访问，不要把管理员密钥交给不可信的浏览器客户端。
- 快照导入是追加式导入，不会自动清空目标数据库或去重；正式恢复前请先备份。
- 单次分页的 `pageSize` 最大为 1000，快照导出单个集合最多读取 100000 条文档。
- 文档没有自动 Schema 校验，当前也没有数据库迁移命令；结构变更应由应用代码或管理员 SQL 负责。

## 参与贡献

欢迎提交 Issue 或 Pull Request。提交前建议完成：

```bash
npm ci
npm test
npm --workspace=packages/server test
npm --workspace=packages/client test
npm run build
```

同时确认 Studio 在桌面端和窄屏布局下均可使用，并检查文档新增、编辑、删除、筛选和权限流程没有回归。

## 许可证

本项目采用 [MIT License](LICENSE) 开源许可证。
