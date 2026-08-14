<template>
  <div class="codegen-view">
    <div class="content-card">
      <div class="card-header flex-between">
        <div>
          <h3>前端与桌面端接入代码生成器</h3>
          <p class="text-muted text-xs">开箱即用，复制即跑，统一标准规范</p>
        </div>
        <div class="flex-center gap-2">
          <label class="text-xs text-muted">选择目标集合:</label>
          <select v-model="selectedCollection" class="custom-select" style="width: 180px;">
            <option v-for="c in collections" :key="c.name" :value="c.name">{{ c.name }}</option>
            <option v-if="collections.length === 0" value="users">users</option>
          </select>
        </div>
      </div>
      <div class="card-body">
        <div class="code-tabs">
          <button
            v-for="t in tabs"
            :key="t.key"
            :class="['code-tab', activeTab === t.key ? 'active' : '']"
            @click="activeTab = t.key"
          >
            {{ t.label }}
          </button>
        </div>

        <div class="code-block-wrapper">
          <button class="btn-copy" @click="copyCode">
            <Copy :size="13" />
            <span>复制代码</span>
          </button>
          <pre><code>{{ generatedCode }}</code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Copy } from 'lucide-vue-next';
import { useLiteDB } from '../composables/useLiteDB.js';

const { endpoint, apiKey, collections, showToast } = useLiteDB();

const selectedCollection = ref(collections.value[0]?.name || 'users');
const activeTab = ref('sdk');

const tabs = [
  { key: 'sdk', label: 'LiteDB Client SDK (推荐)' },
  { key: 'vue', label: 'Vue 3 (组合式 API)' },
  { key: 'react', label: 'React Hooks' },
  { key: 'fetch', label: '原生 Fetch (零依赖)' },
  { key: 'desktop', label: 'Electron / 桌面端本地模式' }
];

const generatedCode = computed(() => {
  const col = selectedCollection.value || 'users';
  const ep = endpoint.value || 'http://localhost:3000';
  const key = apiKey.value || 'YOUR_API_KEY';

  if (activeTab.value === 'sdk') {
    return `import { LiteDB } from '@litedb/client';

// 1. 初始化 LiteDB 客户端
const db = new LiteDB({
  endpoint: '${ep}',
  apiKey: '${key}'
});

const ${col} = db.collection('${col}');

// 2. 增删改查标准操作
async function run() {
  // 插入单条
  const doc = await ${col}.insert({
    title: '学习 LiteDB 规范',
    status: 'active',
    priority: 1
  });
  console.log('创建成功 ID:', doc.id);

  // 条件查询与分页
  const result = await ${col}.paginate({ status: 'active' }, {
    page: 1,
    pageSize: 10,
    sort: { created_at: -1 }
  });
  console.log('列表记录:', result.data);
  console.log('总数:', result.total);

  // 局部更新
  await ${col}.updateById(doc.id, { status: 'completed' });

  // 删除
  await ${col}.deleteById(doc.id);
}

run();`;
  }

  if (activeTab.value === 'vue') {
    return `<template>
  <div class="container">
    <h2>集合: ${col}</h2>
    <ul>
      <li v-for="item in list" :key="item.id">
        {{ item.title || item.name || item.id }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { LiteDB } from '@litedb/client';

const db = new LiteDB({
  endpoint: '${ep}',
  apiKey: '${key}'
});

const list = ref([]);

onMounted(async () => {
  const docs = await db.collection('${col}').find();
  list.value = docs;
});
<\/script>`;
  }

  if (activeTab.value === 'react') {
    return `import React, { useEffect, useState } from 'react';
import { LiteDB } from '@litedb/client';

const db = new LiteDB({
  endpoint: '${ep}',
  apiKey: '${key}'
});

export default function ${col.charAt(0).toUpperCase() + col.slice(1)}List() {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function load() {
      const docs = await db.collection('${col}').find({}, { sort: { created_at: -1 } });
      setData(docs);
    }
    load();
  }, []);

  return (
    <div>
      <h2>${col} 列表</h2>
      {data.map(item => (
        <div key={item.id}>{JSON.stringify(item)}</div>
      ))}
    </div>
  );
}`;
  }

  if (activeTab.value === 'fetch') {
    return `// 原生标准 Fetch 请求 (前端零额外依赖)
const BASE_URL = '${ep}';
const API_KEY = '${key}';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ' + API_KEY
};

// 1. 插入文档
async function insertDoc(payload) {
  const res = await fetch(\`\${BASE_URL}/api/collections/${col}/insert\`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  return res.json();
}

// 2. 高级条件查询与分页
async function queryDocs(filter = {}, page = 1) {
  const res = await fetch(\`\${BASE_URL}/api/collections/${col}/query\`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      filter,
      page,
      pageSize: 20,
      sort: { created_at: -1 }
    })
  });
  return res.json();
}`;
  }

  if (activeTab.value === 'desktop') {
    return `// 桌面端 (Electron / Tauri / Node.js 本地嵌入式模式)
// 无需启动外部 HTTP 服务，直接读写本地 SQLite 文件，API 100% 同构！
import { LiteDB } from '@litedb/client';

const db = new LiteDB({
  mode: 'embedded',
  dbPath: './data/local_app.db'
});

const ${col} = db.collection('${col}');

async function runDesktop() {
  const item = await ${col}.insert({ note: '本地秒开零网络延迟' });
  const all = await ${col}.find();
  console.log('本地数据:', all);
}

runDesktop();`;
  }

  return '';
});

const copyCode = () => {
  navigator.clipboard.writeText(generatedCode.value).then(() => {
    showToast('代码已复制到剪贴板！', 'success');
  });
};
</script>

<style scoped>
.code-tabs {
  display: flex;
  gap: 6px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 14px;
  overflow-x: auto;
}

.code-tab {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.code-tab:hover {
  color: var(--text-main);
  background: var(--table-hover-bg);
}

.code-tab.active {
  background: rgba(2, 132, 199, 0.15);
  color: #38bdf8;
  font-weight: 700;
  border-bottom: 2px solid #38bdf8;
}

.code-block-wrapper {
  position: relative;
  background: #09090b;
  border: 1px solid var(--border-card);
  border-radius: var(--radius-sm);
  padding: 18px;
}

.code-block-wrapper pre {
  margin: 0;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.88rem;
  color: #f8fafc;
  line-height: 1.65;
}

.btn-copy {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #f8fafc;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
}

.btn-copy:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: #38bdf8;
  color: #38bdf8;
}
</style>
