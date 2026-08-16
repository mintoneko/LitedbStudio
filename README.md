<h1 align="center">
  <img src="packages/studio/public/favicon.svg" alt="LiteDB Studio Logo" width="72" height="72" valign="middle">
  LiteDB Studio
</h1>

<p align="center">
  面向前端、轻量全栈项目和桌面应用的轻量级 JSON 文档数据库。
</p>

<p align="center">
  LiteDB 将 SQLite WAL 存储引擎、HTTP REST 服务、同构 JavaScript SDK 与 Vue 3 管理控制台组合在一个 monorepo 中，既可以作为本地嵌入式数据库使用，也可以作为独立的轻量 API 服务运行。
</p>

<p align="center">
  <a href="https://github.com/mintoneko/LitedbStudio">GitHub 仓库</a>
  ·
  <a href="LICENSE">MIT License</a>
</p>

## 项目定位

LiteDB 适合以下场景：

- 个人项目、原型、内部工具和轻量 SaaS 的数据持久化；
- 只有一个 Node.js 服务、但仍希望通过 HTTP 被浏览器或其他进程调用的应用；
- Electron、Tauri 或 Node.js 本地脚本中的离线数据存储；
- 希望直接查看、编辑、备份 JSON 文档，而不想额外维护数据库管理后台的项目。

它不是分布式数据库，也不提供集群、复制、复杂关系模型或完整的迁移系统。项目的核心取舍是：用 SQLite 文件和 JSON 文档降低部署、运维与开发成本。

## 核心能力

| 能力 | 说明 |
| --- | --- |
| SQLite 存储 | 以 SQLite 文件保存数据，初始化 WAL、外键、同步模式、缓存和内存临时表等运行参数。 |
| 无固定 Schema | 每个集合保存 JSON 文档，不需要先写建表迁移；每条记录自动带有 `id`、`created_at`、`updated_at`。 |
| 双运行模式 | `@litedb/client` 同时支持远程 HTTP 模式和本地 embedded 模式，两种模式使用同一套集合 API。 |
| 查询与分页 | 支持比较、集合、模糊匹配、逻辑组合、字段选择、排序、limit/skip 和分页。 |
| REST 服务 | 内置 Node.js HTTP 服务，提供集合、文档、API 密钥、统计、快照和原生 SQL 接口。 |
| API 密钥分级 | 支持 `read`、`write`、`admin` 三种角色（兼容旧名 `read-only`/`read-write`）。 |
| Studio 控制台 | 提供概览、集合数据、API 密钥和备份恢复四个工作区，并支持响应式布局。 |
| 快照备份 | 可将所有集合和文档导出为 JSON，也可以从 JSON 快照导入。 |

## 架构与数据流

LiteDB 的两种使用方式都落到同一个 `LiteDBEngine` 和 SQLite 适配层：

~~~text
浏览器 / Vue / React / Python / cURL
                │
                │ REST API 或 @litedb/client HTTP 模式
                ▼
        @litedb/server · LiteDBServer
                │
                ▼
        @litedb/core · LiteDBEngine
                │
                ▼
          SQLite 文件 + WAL

Electron / Tauri / Node.js
                │
                │ @litedb/client embedded 模式
                ▼
        @litedb/core · LiteDBEngine
                │
                ▼
          本地 SQLite 文件
~~~

Studio 本身是 `packages/studio` 下的 Vue 3 应用。生产构建后，LiteDB CLI 会自动寻找 `packages/studio/dist` 并由 HTTP 服务托管静态文件。

## 环境要求

- Node.js 22 或更高版本（Dockerfile 使用 Node.js 22；核心适配器优先使用 `node:sqlite`）；
- npm；
- 浏览器（使用 LiteDB Studio 时）；
- Docker 和 Docker Compose（仅 Docker 部署时需要）。

建议在项目根目录执行所有 npm 命令。首次安装依赖：

~~~bash
npm install
~~~

## 快速开始

### 1. 构建 Studio

如果需要通过 LiteDB 服务打开可视化控制台，先构建前端：

~~~bash
npm --workspace=packages/studio run build
~~~

构建产物位于 `packages/studio/dist`，该目录会被 LiteDB 服务自动托管。只使用 REST API 或 SDK 时可以跳过这一步。

### 2. 启动服务

最小启动命令：

~~~bash
node bin/litedb.js --port 3000 --db ./data/litedb.db --admin-key admin_litedb_master
~~~

也可以保留旧文档中的 `start` 参数；CLI 会忽略未知的子命令参数：

~~~bash
node bin/litedb.js start --port 3000 --db ./data/litedb.db --admin-key admin_litedb_master
~~~

启动后：

- REST API 根地址：`http://localhost:3000/api`；
- Studio 地址：`http://localhost:3000/`；
- 数据库文件：`./data/litedb.db`；
- 管理员密钥：首次创建数据库时使用 `--admin-key` 指定的值。

打开 `http://localhost:3000/`，在「连接设置」中填写服务地址和管理员 API Key，即可进入 Studio。

如果没有传入 `--admin-key` 或 `LITEDB_ADMIN_KEY`，并且数据库中还没有密钥，LiteDB 会自动生成一个管理员密钥并在启动日志中打印。密钥会写入数据库，后续再次启动不会因为重新传入 `--admin-key` 而覆盖已有密钥；已有密钥应通过 Studio 的「API 密钥授权」页面管理。

### 3. 检查服务是否正常

`/api/ping` 不需要 API Key：

~~~bash
curl http://localhost:3000/api/ping
~~~

预期返回：

~~~json
{
  "success": true,
  "message": "pong",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
~~~

检查数据库状态需要只读或更高权限的 API Key：

~~~bash
curl http://localhost:3000/api/system/stats \
  -H "Authorization: Bearer admin_litedb_master"
~~~

## CLI 与环境变量

入口文件是 `bin/litedb.js`，它会加载 `packages/server/src/cli.js`。

### 命令行参数

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `-p, --port <number>` | `3000` 或 `LITEDB_PORT` | HTTP 监听端口。 |
| `-h, --host <string>` | `0.0.0.0` 或 `LITEDB_HOST` | HTTP 监听地址。 |
| `-d, --db <path>` | `./data/litedb.db` 或 `LITEDB_PATH` | SQLite 数据库文件路径；目录不存在时会自动创建。 |
| `-k, --admin-key <string>` | `LITEDB_ADMIN_KEY` 或自动生成 | 数据库尚未创建 API Key 时使用的初始管理员密钥。 |
| `--allow-anonymous` | `false` | 允许匿名请求，并将匿名请求视为管理员权限。仅建议本地临时演示使用。 |
| `--help` | - | 输出帮助。 |

也可以使用环境变量启动：

~~~bash
LITEDB_PORT=3000 \
LITEDB_HOST=0.0.0.0 \
LITEDB_PATH=./data/litedb.db \
LITEDB_ADMIN_KEY=replace_with_a_long_secret \
node bin/litedb.js
~~~

PowerShell 写法：

~~~powershell
$env:LITEDB_PORT = "3000"
$env:LITEDB_HOST = "0.0.0.0"
$env:LITEDB_PATH = "./data/litedb.db"
$env:LITEDB_ADMIN_KEY = "replace_with_a_long_secret"
node bin/litedb.js
~~~

默认监听地址是 `0.0.0.0`，这意味着同一网络中的其他设备可能可以访问服务。生产环境应结合防火墙、反向代理和 HTTPS 使用。

## LiteDB Studio

### 端口约定

项目统一使用 `3000` 作为 Studio 访问入口，`5173` 不是默认端口。

- 生产或集成部署：构建 Studio 后，由 LiteDB 服务在 `3000` 端口同时提供 REST API 和静态页面；
- 源码开发：Vite 默认监听 `3000`，API 服务使用 `3001`，Vite 将 `/api` 代理到 API 服务；
- Vite 端口由 `VITE_PORT` 调整，API 代理地址由 `VITE_API_TARGET` 调整。

### 工作区说明

#### 概览与监控

显示当前数据库的：

- SQLite 驱动类型；
- 数据库文件路径和文件大小；
- 集合数量；
- 文档总数；
- API Key 数量；
- Node.js 进程内存统计；
- 集合快速列表及文档数量。

#### 集合与数据

支持：

- 创建集合、选择集合和删除集合；
- 以 JSON 过滤条件查询文档；
- 按页浏览数据，Studio 默认每页 15 条，按 ID 升序；
- 查看文档字段或完整 JSON；
- 复制文档 JSON；
- 新增和编辑 JSON 文档；
- 删除单条文档；
- 清空当前集合；
- 删除整个集合。

Studio 创建集合时只允许英文字母、数字和下划线，例如 `users`、`order_items`。服务端和 SDK 也会对集合名进行清洗，建议统一使用字母、数字和下划线。

过滤框需要输入合法 JSON，例如：

~~~json
{
  "status": "published",
  "views": {
    "$gte": 100
  }
}
~~~

#### API 密钥授权

只有管理员密钥可以打开完整的密钥管理能力。页面支持：

- 创建独立 API Key；
- 选择 `read` (只读)、`write` (读写) 或 `admin` (超级管理)；
- 查看并复制 Token；
- 查看创建时间和最后使用时间；
- 注销密钥。

推荐为每个前端、脚本或桌面应用创建单独密钥，不要在所有客户端中复用管理员密钥。

#### 备份与导入

支持：

- 下载全量 JSON 快照；
- 从 JSON 文件导入；
- 导入前弹窗确认，导入完成后刷新统计和集合列表。

导入操作是追加式导入，不会自动清空目标数据库，也不会自动去重。恢复到已有数据时可能遇到重复 ID，正式恢复前建议备份当前数据库，并优先导入到空数据库或临时实例。

#### 连接设置与主题

- 连接地址和 API Key 会保存在浏览器 `localStorage` 中；
- Studio 支持系统、浅色、深色三种主题；
- 桌面端和移动端均提供响应式布局；
- 当前工作区和选中集合会同步到 URL Hash，可直接保存或分享类似 `#/collections/users` 的地址；
- 未配置 API Key 或连接校验失败时，Studio 会打开连接设置并显示错误提示。

### 源码开发

终端 1：启动 API 服务到 `3001`：

~~~bash
node bin/litedb.js --port 3001 --db ./data/litedb.db --admin-key admin_litedb_master
~~~

终端 2：启动 Studio Vite 服务到 `3000`：

~~~bash
npm run dev:studio
~~~

访问 `http://localhost:3000/`。Vite 已在 `packages/studio/vite.config.js` 中配置 `/api` 代理，默认目标是 `http://localhost:3001`。

需要自定义端口时，macOS/Linux：

~~~bash
VITE_PORT=3100 VITE_API_TARGET=http://localhost:3101 npm run dev:studio
~~~

PowerShell：

~~~powershell
$env:VITE_PORT = "3100"
$env:VITE_API_TARGET = "http://localhost:3101"
npm run dev:studio
~~~

## 统一客户端 SDK：`@litedb/client`

`@litedb/client` 的 `LiteDB` 类根据配置选择 HTTP 或 embedded 适配器。集合层 API 保持一致，业务代码可以在远程服务和本地数据库之间迁移。

### HTTP 模式

适用于浏览器、Node.js 服务、脚本和跨进程调用：

~~~js
import { LiteDB } from "@litedb/client";

const db = new LiteDB({
  endpoint: "http://localhost:3000",
  apiKey: "admin_litedb_master",
  timeout: 15000
});

const todos = db.collection("todos");

const created = await todos.insert({
  title: "接入 LiteDB",
  completed: false,
  tags: ["node", "sqlite"]
});

const result = await todos.paginate(
  {
    completed: false,
    priority: { $gte: 1 }
  },
  {
    page: 1,
    pageSize: 20,
    sort: { created_at: -1 }
  }
);

console.log(created);
console.log(result.data, result.total);

await todos.updateById(created.id, { completed: true });
await todos.deleteById(created.id);
~~~

`endpoint` 末尾的 `/` 会自动去除。HTTP 请求默认超时时间为 15000 毫秒，可通过 `timeout` 调整。

### embedded 模式

适用于 Node.js、Electron 主进程、Tauri 后端或其他能够访问本地文件系统的运行环境。它不启动 HTTP 端口，也不经过网络：

~~~js
import { LiteDB } from "@litedb/client";

const db = new LiteDB({
  mode: "embedded",
  dbPath: "./data/desktop_app.db"
});

const notes = db.collection("notes");
const note = await notes.insert({
  title: "离线笔记",
  content: "直接写入本地 SQLite 文件"
});

const localNotes = await notes.find(
  { title: { $contains: "笔记" } },
  { sort: { id: -1 } }
);

console.log(note, localNotes);
db.close();
~~~

embedded 模式依赖 Node.js 文件系统和 SQLite 驱动，不能直接在普通浏览器页面中运行。

### 顶层 API

| 方法 | 说明 |
| --- | --- |
| `db.collection(name)` | 获取集合客户端。 |
| `db.listCollections()` | 获取集合及文档数量、创建时间、更新时间。 |
| `db.createCollection(name)` | 创建集合。 |
| `db.dropCollection(name)` | 删除集合及其中所有文档。 |
| `db.rawSql(sql, params)` | 执行原生 SQL，仅适合管理员或本地 embedded 场景。 |
| `db.getStats()` | 获取数据库路径、驱动、文件大小、集合数、文档数、Key 数和内存信息。 |
| `db.exportSnapshot()` | 导出所有集合的 JSON 快照。 |
| `db.importSnapshot(snapshot)` | 导入 JSON 快照。 |
| `db.close()` | 关闭 embedded 模式的 SQLite 连接。 |

### 集合 API

| 方法 | 返回值 | 说明 |
| --- | --- | --- |
| `insert(doc)` | 文档 | 插入一条文档。 |
| `insertMany(docs)` | 文档数组 | 在事务中批量插入。 |
| `findById(id, select)` | 文档或 `null` | 按 ID 查询。 |
| `findOne(filter, options)` | 文档或 `null` | 查询第一条匹配文档。 |
| `find(filter, options)` | 文档数组 | 查询全部匹配文档。 |
| `paginate(filter, options)` | 分页对象 | 查询并返回总数、页码和总页数。 |
| `count(filter)` | 数字 | 统计匹配文档数量。 |
| `updateById(id, patch)` | 更新后的文档或 `null` | 合并顶层字段。 |
| `updateMany(filter, patch)` | 数字 | 批量更新并返回更新数量。 |
| `deleteById(id)` | 布尔值 | 删除单条文档。 |
| `deleteMany(filter)` | 数字 | 批量删除并返回删除数量。 |
| `clear()` | `true` | 清空集合中的所有文档。 |
| `createIndex(field)` | `true` | 为 JSON 字段创建 SQLite 表达式索引。 |

### 文档格式和 ID 规则

每条返回的文档至少包含：

~~~json
{
  "id": 1,
  "created_at": "2026-01-01T00:00:00.000Z",
  "updated_at": "2026-01-01T00:00:00.000Z"
}
~~~

用户字段会存放在 SQLite 的 JSON 数据列中。当前实现的 ID 行为如下：

- 未传入 `id` 时，默认生成从 1 开始的整数 ID；
- 传入数字或可以转换为数字的字符串时，会使用该值；
- 任意非数字字符串不会作为稳定的字符串主键使用，通常会回退到下一个自动生成的数字 ID；
- 显式传入已经存在的 ID 会触发 SQLite 主键冲突；
- `updateById` 只合并顶层自定义字段，不会修改 `id` 和 `created_at`，并会刷新 `updated_at`。

因此，当前版本推荐使用默认数字 ID，不建议依赖任意字符串主键。

## 查询、排序与分页

### 支持的过滤操作符

过滤对象会被转换为参数化 SQLite 条件。普通字段之间默认是 AND 关系。

| 操作符 | 含义 | 示例 |
| --- | --- | --- |
| 直接值 | 等于 | `{ "role": "admin" }` |
| `$eq` | 等于 | `{ "age": { "$eq": 18 } }` |
| `$ne` | 不等于 | `{ "status": { "$ne": "deleted" } }` |
| `$gt` | 大于 | `{ "score": { "$gt": 80 } }` |
| `$gte` | 大于等于 | `{ "age": { "$gte": 18 } }` |
| `$lt` | 小于 | `{ "price": { "$lt": 100 } }` |
| `$lte` | 小于等于 | `{ "price": { "$lte": 99.9 } }` |
| `$in` | 在列表中 | `{ "role": { "$in": ["admin", "editor"] } }` |
| `$nin` | 不在列表中 | `{ "status": { "$nin": ["deleted"] } }` |
| `$like` | SQLite LIKE 匹配 | `{ "name": { "$like": "张%" } }` |
| `$ilike` | 不区分大小写的 LIKE | `{ "name": { "$ilike": "%litedb%" } }` |
| `$contains` | 包含子串 | `{ "title": { "$contains": "LiteDB" } }` |
| `$startsWith` | 以指定内容开头 | `{ "name": { "$startsWith": "A" } }` |
| `$endsWith` | 以指定内容结尾 | `{ "email": { "$endsWith": ".com" } }` |
| `$between` | 闭区间 | `{ "age": { "$between": [18, 35] } }` |
| `$exists` | 字段存在或为空 | `{ "nickname": { "$exists": false } }` |
| `$or` | 满足任一子条件 | `{ "$or": [{ "role": "admin" }, { "vip": true }] }` |
| `$and` | 同时满足所有子条件 | `{ "$and": [{ "age": { "$gte": 18 } }, { "active": true }] }` |

嵌套字段可以使用点路径，例如 `profile.email` 会读取 JSON 中的 `profile.email`。数组、对象等复杂值会通过 SQLite JSON 提取结果参与比较或 LIKE 匹配，复杂查询建议使用原生 SQL 验证结果。

### 排序和字段选择

支持三种排序写法：

~~~js
{ sort: { created_at: -1, name: 1 } }
{ sort: ["-created_at", "name"] }
{ sort: "-created_at" }
~~~

`1`、`asc` 和不带前缀表示升序；`-1`、`desc` 和 `-` 前缀表示降序。未指定排序时默认按 ID 升序。

只返回指定字段：

~~~js
await todos.find(
  { completed: false },
  { select: ["id", "title", "created_at"] }
);
~~~

### 分页返回值

~~~js
const page = await todos.paginate(
  { status: "published" },
  {
    page: 2,
    pageSize: 20,
    sort: { created_at: -1 },
    select: ["id", "title", "created_at"]
  }
);
~~~

返回结构：

~~~json
{
  "data": [],
  "total": 42,
  "page": 2,
  "pageSize": 20,
  "totalPages": 3
}
~~~

核心分页实现会将 `pageSize` 限制在 1 到 1000 之间。没有传入分页参数的普通查询返回文档数组。

## REST API

### 认证方式

推荐使用 Bearer Token：

~~~http
Authorization: Bearer your_api_key
~~~

服务端也支持以下方式：

~~~http
x-api-key: your_api_key
~~~

或在 URL 查询参数中传入 `api_key`。查询参数容易出现在日志和历史记录中，不建议生产使用。

### 权限角色

角色按权限从低到高排列：

| 角色 | 能力 | 说明 |
| --- | --- | --- |
| `read` | 健康状态、系统统计、集合列表、查询、按 ID 读取、计数。 | 只读（兼容 `read-only`） |
| `write` | 包含 `read` 能力，并可新增、更新、删除文档。 | 读写（兼容 `read-write`） |
| `admin` | 包含全部能力，并可创建/删除集合、清空集合、创建索引、管理 API Key、执行原生 SQL、导出/导入快照。 | 超级管理 |

### 接口速查

| 方法 | 路径 | 最低权限 | 说明 |
| --- | --- | --- | --- |
| `GET` | `/api/ping` | 公开 | 健康检查。 |
| `GET` / `POST` | `/api/auth/verify` | 根据请求 | 校验 API Key 并返回角色。 |
| `GET` | `/api/system/stats` | `read` | 返回数据库与进程统计。 |
| `GET` | `/api/system/export` | `admin` | 导出 JSON 快照。 |
| `POST` | `/api/system/import` | `admin` | 导入 JSON 快照。 |
| `GET` | `/api/auth/keys` | `admin` | 列出 API Key。 |
| `POST` | `/api/auth/keys` | `admin` | 创建 API Key。 |
| `DELETE` | `/api/auth/keys/:id` | `admin` | 删除 API Key。 |
| `GET` | `/api/collections` | `read` | 列出集合及文档数。 |
| `POST` | `/api/collections` | `admin` | 创建集合。 |
| `DELETE` | `/api/collections/:name` | `admin` | 删除集合。 |
| `POST` | `/api/collections/:name/insert` | `write` | 插入单条或批量文档。 |
| `POST` | `/api/collections/:name/query` | `read` | 条件查询、排序、字段选择、分页。 |
| `POST` | `/api/collections/:name/count` | `read` | 按条件统计数量。 |
| `GET` | `/api/collections/:name/:id` | `read` | 按 ID 读取文档。 |
| `PUT` | `/api/collections/:name/:id` | `write` | 按 ID 局部更新文档。 |
| `PUT` | `/api/collections/:name` | `write` | 批量更新文档。 |
| `DELETE` | `/api/collections/:name/:id` | `write` | 按 ID 删除文档。 |
| `POST` | `/api/collections/:name/clear` | `admin` | 清空集合。 |
| `POST` | `/api/collections/:name/index` | `admin` | 为 JSON 字段创建索引。 |
| `POST` | `/api/sql` | `admin` | 执行参数化原生 SQL。 |

注意：当前服务端同时注册了 `DELETE /api/collections/:name` 作为删除集合和批量删除文档的候选路径，而路由匹配会优先命中删除集合处理器。因此，远程模式下不要把该路径当作稳定的批量删除接口；删除集合前务必确认路径和权限。embedded 模式下的 `deleteMany(filter)` 直接调用核心引擎，不受该 HTTP 路由冲突影响。

### 插入文档

单条插入可以直接发送文档，也可以显式放在 `doc` 中：

~~~bash
curl -X POST http://localhost:3000/api/collections/todos/insert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_litedb_master" \
  -d "{\"title\":\"写文档\",\"completed\":false}"
~~~

批量插入：

~~~bash
curl -X POST http://localhost:3000/api/collections/todos/insert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_litedb_master" \
  -d "{\"docs\":[{\"title\":\"任务 A\"},{\"title\":\"任务 B\"}]}"
~~~

### 查询文档

请求体支持 `filter`、`sort`、`limit`、`skip`、`select`、`page` 和 `pageSize`：

~~~bash
curl -X POST http://localhost:3000/api/collections/todos/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_litedb_master" \
  -d "{\"filter\":{\"completed\":false},\"sort\":{\"id\":-1},\"page\":1,\"pageSize\":20}"
~~~

只提供 `filter`、`sort`、`limit` 或 `skip` 时，返回值中的 `data` 是文档数组：

~~~json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "写文档",
      "completed": false,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
~~~

带有 `page` 或 `pageSize` 时，`data` 会变成分页对象：

~~~json
{
  "success": true,
  "data": {
    "data": [],
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
~~~

### 更新、删除和计数

~~~js
const todos = db.collection("todos");

const updated = await todos.updateById(1, {
  completed: true
});

const pendingCount = await todos.count({
  completed: false
});

const removed = await todos.deleteById(1);
~~~

`updateById` 是顶层字段合并，不会替换整条文档。若需要批量更新，使用 `updateMany(filter, patch)`；服务端对应 `PUT /api/collections/:name`，请求体为：

~~~json
{
  "filter": {
    "completed": true
  },
  "patch": {
    "archived": true
  }
}
~~~

### API Key 管理

创建 Key：

~~~bash
curl -X POST http://localhost:3000/api/auth/keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_litedb_master" \
  -d "{\"name\":\"web-app\",\"role\":\"write\"}"
~~~

`role` 可选值为 `read`、`write` 和 `admin`（同时向下兼容 `read-only` 与 `read-write`）。服务端会记录 `last_used_at`，用于在 Studio 中查看最近使用时间。

### 原生 SQL

原生 SQL 只能由管理员调用。`params` 会作为参数数组传递给 SQLite：

~~~bash
curl -X POST http://localhost:3000/api/sql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_litedb_master" \
  -d "{\"sql\":\"SELECT COUNT(*) AS total FROM \\\"_litedb_meta\\\"\",\"params\":[]}"
~~~

以 `SELECT`、`PRAGMA` 或 `EXPLAIN` 开头的语句返回：

~~~json
{
  "success": true,
  "data": {
    "type": "select",
    "rows": []
  }
}
~~~

其他语句返回 `type: "execute"`、`changes` 和 `lastInsertRowid`。不要将用户输入直接拼接进 SQL 字符串，应使用 `params`。

### 错误格式

失败请求通常返回：

~~~json
{
  "success": false,
  "error": {
    "code": "ERR_401",
    "message": "Unauthorized: API Key required"
  }
}
~~~

HTTP 客户端适配器会将非 2xx 响应和 `success: false` 转换为带有 `status`、`code` 的 JavaScript Error。

## JSON 快照

导出快照结构如下：

~~~json
{
  "version": "1.0.0",
  "exported_at": "2026-01-01T00:00:00.000Z",
  "collections": {
    "todos": [
      {
        "id": 1,
        "title": "写文档",
        "completed": false,
        "created_at": "2026-01-01T00:00:00.000Z",
        "updated_at": "2026-01-01T00:00:00.000Z"
      }
    ]
  }
}
~~~

当前导出实现每个集合最多读取 100000 条文档。导入会遍历快照中的集合并执行 `insertMany`，不会清除目标集合，也不会删除快照中不存在的集合。

## 生产部署

### Docker Compose

仓库已经提供 `Dockerfile` 和 `docker-compose.yml`。由于 Dockerfile 不在镜像内部执行 Vite 构建，构建镜像前先生成 Studio 静态文件：

~~~bash
npm install
npm --workspace=packages/studio run build
docker compose up -d --build
~~~

默认配置会：

- 使用 `node:22-alpine`；
- 将容器的 `3000` 端口映射到宿主机 `3000`；
- 将 `./data` 挂载到容器的 `/data`；
- 使用 `/data/litedb.db` 保存数据库；
- 从 `LITEDB_ADMIN_KEY` 读取管理员密钥。

部署前请修改 `docker-compose.yml` 中的 `LITEDB_ADMIN_KEY`，不要使用示例值。查看日志：

~~~bash
docker compose logs -f litedb
~~~

停止服务但保留数据：

~~~bash
docker compose down
~~~

### Node.js 或 PM2

先构建 Studio，再使用进程管理器启动：

~~~bash
npm --workspace=packages/studio run build
pm2 start bin/litedb.js --name litedb -- --port 3000 --host 0.0.0.0 --db ./data/litedb.db --admin-key replace_with_a_long_secret
pm2 save
pm2 startup
~~~

### 部署注意事项

- `data/`、`*.db`、`*.db-wal` 和 `*.db-shm` 已加入 `.gitignore`，不要把数据库文件提交到 Git；
- 服务运行期间 SQLite 可能同时使用主数据库文件、WAL 文件和共享内存文件，物理复制数据库前应先停止服务，或使用 Studio/快照 API；
- `--allow-anonymous` 会绕过所有角色检查，并将请求视为管理员，不要在公网环境使用；
- API Key 当前按明文存储在 `_litedb_keys` 表中，必须保护数据库文件和备份文件；
- 服务默认开启 `Access-Control-Allow-Origin: *`，公网部署时应在反向代理或网络层增加访问控制；
- `/api/sql` 拥有管理员权限即可执行原生 SQL，不能把管理员密钥交给不可信客户端；
- 建议使用 HTTPS 反向代理保护 API Key 和文档内容传输。

## 项目结构

~~~text
LitedbStudio/
├── bin/
│   └── litedb.js                    # CLI 入口，转发到 server/src/cli.js
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── db-adapter.js        # node:sqlite / better-sqlite3 统一适配
│   │   │   ├── engine.js            # LiteDBEngine、系统表、统计和快照
│   │   │   ├── collection.js        # 集合 CRUD、分页和索引
│   │   │   ├── query-parser.js      # JSON 查询和排序转换
│   │   │   └── utils.js             # ID、时间戳、名称清洗工具
│   │   └── test/                    # 核心引擎测试
│   ├── server/
│   │   ├── src/
│   │   │   ├── cli.js               # 启动参数和环境变量解析
│   │   │   ├── server.js            # HTTP 服务、REST 路由和静态托管
│   │   │   └── router.js            # 轻量动态路由匹配器
│   │   └── test/                    # REST 与鉴权测试
│   ├── client/
│   │   ├── src/
│   │   │   ├── client.js            # LiteDB 顶层客户端
│   │   │   ├── collection-client.js # 集合 API
│   │   │   └── adapters/            # HTTP / embedded 适配器
│   │   └── test/                    # 双模式 SDK 测试
│   └── studio/
│       ├── src/
│       │   ├── App.vue              # Studio 布局、工作区和 Hash 路由
│       │   ├── composables/         # 连接、主题、全局状态
│       │   └── components/          # 概览、集合、密钥、备份和弹窗
│       ├── index.html
│       ├── vite.config.js
│       └── package.json
├── examples/
│   ├── web-quickstart/              # 原生 HTML + Fetch 前端示例
│   └── desktop-quickstart/          # embedded 模式 Node.js 示例
├── scripts/
│   └── seed.js                      # 初始化演示数据的脚本
├── data/                            # 运行时数据库目录，默认被 Git 忽略
├── Dockerfile
├── docker-compose.yml
├── package.json
├── package-lock.json
└── README.md
~~~

### 存储层约定

每个用户集合对应一张 `col_<collection_name>` 表，核心系统表为：

- `_litedb_meta`：集合名称、创建时间和更新时间；
- `_litedb_keys`：API Key、角色、创建时间和最后使用时间；
- `col_<name>`：记录 ID、JSON 数据、创建时间和更新时间。

集合中的自定义字段存储在 `_data` JSON 列，`id`、`created_at` 和 `updated_at` 是独立的系统字段。

## 开发脚本与测试

根目录 `package.json` 提供以下脚本：

| 命令 | 作用 |
| --- | --- |
| `npm run dev:server` | 以 Node watch 模式执行服务端入口；当前入口只导出服务类，不自动监听端口。开发 API 服务请直接运行 `node bin/litedb.js --port 3001 ...`。 |
| `npm run dev:studio` | 启动 Studio Vite 开发服务器，默认端口 3000。 |
| `npm run build` | 执行所有 workspace 中存在的 `build` 脚本，当前主要用于构建 Studio。 |
| `npm test` | 运行 core 测试。 |
| `npm --workspace=packages/studio run build` | 单独构建 Studio。 |
| `npm --workspace=packages/studio run preview` | 预览已构建的 Studio。 |

完整测试：

~~~bash
npm test
npm --workspace=packages/server test
npm --workspace=packages/client test
~~~

### 示例和演示数据

运行桌面端 embedded 示例：

~~~bash
node examples/desktop-quickstart/index.js
~~~

该脚本会在 `./data/desktop_app.db` 中创建笔记数据，不需要启动 HTTP 服务。

运行网页 Fetch 示例时，示例默认不附带 API Key，因此需要仅在本机临时使用匿名模式：

~~~bash
node bin/litedb.js --port 3000 --allow-anonymous
~~~

然后打开 `examples/web-quickstart/index.html`。生产或共享网络中请改为在示例代码中增加 API Key，并关闭匿名模式。

初始化演示数据：

~~~bash
node scripts/seed.js
~~~

该脚本会清空并重建 `users`、`todos`、`notes` 集合，同时创建演示 API Key。不要在生产数据库上运行。

## 当前边界与排障

### Studio 页面空白或返回 404

先构建 Studio：

~~~bash
npm --workspace=packages/studio run build
~~~

然后重新启动 LiteDB 服务。CLI 会优先托管 `packages/studio/dist`；如果没有构建产物，服务可能仍能提供 `/api`，但不能保证根路径有完整的 Studio 页面。

### Studio 无法连接

依次检查：

1. API 服务是否正在监听目标端口；
2. Studio 设置中的地址是否包含正确协议和端口；
3. API Key 是否有效，且没有把只读 Key 用于写操作；
4. 浏览器开发者工具中 `/api/auth/verify` 是否返回 401 或 403；
5. 如果复用了旧数据库，新的 `--admin-key` 不会覆盖已有密钥，请使用旧密钥或通过已有管理员 Key 创建新 Key。

### 端口被占用

源码开发时不要让 API 服务和 Vite 同时监听同一个端口。推荐 API 使用 `3001`、Studio 使用 `3000`，并通过 `VITE_API_TARGET` 代理。

### 示例返回 401

默认服务要求 API Key。网页示例为了保持纯原生 Fetch 而没有写入密钥，所以本地演示需要 `--allow-anonymous`，或自行在请求中增加：

~~~http
Authorization: Bearer your_api_key
~~~

### SQLite 驱动不可用

优先使用 Node.js 22 或更高版本运行。核心适配器会先尝试 `node:sqlite`，若不可用再尝试 `better-sqlite3`；如果两者都不可用，服务会提示缺少 SQLite 驱动。

### 数据量边界

- 单次分页的 `pageSize` 最大为 1000；
- 单个集合快照导出最多读取 100000 条文档；
- JSON 文档没有自动 Schema 校验；
- 物理 SQLite 文件备份需要同时考虑 WAL 和共享内存文件；
- 当前项目没有迁移命令，字段结构变更需要由应用代码或管理员 SQL 自行处理。

## 开源许可证

MIT License
