<template>
  <div class="sql-console-view">
    <div class="content-card">
      <div class="card-header flex-between">
        <div>
          <h3>SQL 终端控制台</h3>
          <p class="text-muted text-xs">直接执行 SQLite 查询与分析 (快捷键: Ctrl / Cmd + Enter)</p>
        </div>
        <div class="flex-center gap-2">
          <button class="btn btn-secondary btn-xs" @click="setSql('SELECT name, created_at FROM _litedb_meta')">
            查看集合元数据
          </button>
          <button class="btn btn-secondary btn-xs" @click="setSql('SELECT * FROM col_users LIMIT 10')">
            查询 users 表
          </button>
          <button class="btn btn-secondary btn-xs" @click="setSql('SELECT name, role, created_at FROM _litedb_keys')">
            查询 API Keys
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="sql-editor-container">
          <textarea
            v-model="sqlQuery"
            placeholder="输入 SQL 语句，例如: SELECT * FROM _litedb_meta"
            @keydown="handleKeydown"
          ></textarea>
        </div>
        <div class="flex-between mt-3">
          <div class="text-xs text-muted">{{ statusText }}</div>
          <button class="btn btn-primary" :disabled="executing" @click="runSql">
            <Play :size="14" />
            <span>{{ executing ? '执行中...' : '执行 SQL' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- SQL Results Card -->
    <div class="content-card mt-4">
      <div class="card-header flex-between">
        <h4>查询结果</h4>
        <span class="badge badge-primary">{{ executionTime }}</span>
      </div>
      <div class="card-body no-padding">
        <div class="table-responsive" style="max-height: 420px; overflow-y: auto;">
          <table class="data-table">
            <thead>
              <tr v-if="columns.length > 0">
                <th v-for="col in columns" :key="col">{{ col }}</th>
              </tr>
              <tr v-else>
                <th>结果状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="resultRows.length === 0 && !hasExecuted">
                <td class="text-center py-6 text-muted">输入 SQL 并点击「执行 SQL」查看结果</td>
              </tr>
              <tr v-else-if="resultRows.length === 0 && hasExecuted">
                <td :colspan="Math.max(1, columns.length)" class="text-center py-6 text-muted">
                  查询结果为空 (0 rows)
                </td>
              </tr>
              <tr v-for="(row, idx) in resultRows" :key="idx">
                <td v-for="col in columns" :key="col">
                  {{ formatCell(row[col]) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Play } from 'lucide-vue-next';
import { useLiteDB } from '../composables/useLiteDB.js';

const { apiRequest, showToast } = useLiteDB();

const sqlQuery = ref('SELECT name, created_at FROM _litedb_meta');
const statusText = ref('就绪');
const executionTime = ref('0 ms');
const columns = ref([]);
const resultRows = ref([]);
const hasExecuted = ref(false);
const executing = ref(false);

const setSql = (sql) => {
  sqlQuery.value = sql;
  runSql();
};

const handleKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runSql();
  }
};

const runSql = async () => {
  const sql = sqlQuery.value.trim();
  if (!sql) return;

  executing.value = true;
  statusText.value = '正在执行...';
  const start = performance.now();

  try {
    const res = await apiRequest('/api/sql', {
      method: 'POST',
      body: { sql }
    });

    const duration = (performance.now() - start).toFixed(1);
    executionTime.value = `${duration} ms`;
    hasExecuted.value = true;

    if (res.type === 'select') {
      const rows = res.rows || [];
      resultRows.value = rows;
      statusText.value = `查询完成，共返回 ${rows.length} 行`;
      if (rows.length > 0) {
        columns.value = Object.keys(rows[0]);
      } else {
        columns.value = ['Result'];
      }
    } else {
      columns.value = ['Status', 'Changes', 'LastInsertId'];
      resultRows.value = [{
        Status: 'OK',
        Changes: res.changes || 0,
        LastInsertId: res.lastInsertRowid ?? '-'
      }];
      statusText.value = `执行完成，受影响行数: ${res.changes || 0}`;
    }
  } catch (err) {
    statusText.value = `错误: ${err.message}`;
    showToast(`SQL 执行错误: ${err.message}`, 'error');
  } finally {
    executing.value = false;
  }
};

const formatCell = (val) => {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
};
</script>

<style scoped>
.sql-editor-container {
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 10px;
  transition: border-color 0.15s;
}
.sql-editor-container:focus-within {
  border-color: var(--border-focus);
}

.sql-editor-container textarea {
  width: 100%;
  height: 120px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-main);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  line-height: 1.6;
  resize: vertical;
}

.sql-editor-container textarea::placeholder {
  color: var(--text-dim);
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.cell-null {
  color: var(--text-dim);
  font-style: italic;
}
</style>
