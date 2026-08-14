<template>
  <div class="dashboard-view">
    <!-- Stat Cards Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">数据库文件大小</span>
          <div class="stat-icon emerald">
            <Database :size="18" />
          </div>
        </div>
        <div class="stat-value">{{ stats.fileSizeFormatted || '0 B' }}</div>
        <div class="stat-footer">路径: {{ stats.path }}</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">数据集合数</span>
          <div class="stat-icon cyan">
            <Folder :size="18" />
          </div>
        </div>
        <div class="stat-value">{{ stats.collectionsCount }}</div>
        <div class="stat-footer">当前已注册分类</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">存储文档总记录</span>
          <div class="stat-icon amber">
            <FileText :size="18" />
          </div>
        </div>
        <div class="stat-value">{{ stats.totalDocuments }}</div>
        <div class="stat-footer">总 JSON 文档记录数</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">常驻内存占用 (RSS)</span>
          <div class="stat-icon violet">
            <Activity :size="18" />
          </div>
        </div>
        <div class="stat-value">{{ formattedRss }}</div>
        <div class="stat-footer">引擎: {{ stats.driver }}</div>
      </div>
    </div>

    <!-- Collections Quick Table -->
    <div class="content-card mt-6">
      <div class="card-header flex-between">
        <h3>快捷集合列表</h3>
        <div class="flex-center gap-2">
          <button class="btn btn-sm btn-secondary" @click="refreshAll">
            <RotateCw :size="14" />
            <span>刷新</span>
          </button>
        </div>
      </div>
      <div class="card-body no-padding">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>集合名称</th>
                <th>记录总数</th>
                <th>创建时间</th>
                <th>最近更新</th>
                <th class="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="collections.length === 0">
                <td colspan="5" class="text-center py-6 text-muted">
                  暂无任何集合，点击右上角「新建集合」开启
                </td>
              </tr>
              <tr v-for="c in collections" :key="c.name">
                <td>
                  <strong class="collection-tag">{{ c.name }}</strong>
                </td>
                <td>
                  <span class="badge badge-primary">{{ c.count }} 篇文档</span>
                </td>
                <td class="text-dim text-xs">{{ formatDate(c.created_at) }}</td>
                <td class="text-dim text-xs">{{ formatDate(c.updated_at) }}</td>
                <td class="text-right">
                  <button class="btn btn-xs btn-secondary" @click="emit('goto-collection', c.name)">
                    进入管理
                  </button>
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
import { computed } from 'vue';
import { Database, Folder, FileText, Activity, RotateCw } from 'lucide-vue-next';
import { useLiteDB } from '../composables/useLiteDB.js';

const emit = defineEmits(['goto-collection']);
const { stats, collections, refreshStats, refreshCollections, showToast } = useLiteDB();

const formattedRss = computed(() => {
  if (!stats.value?.memoryUsage?.rss) return '-';
  const mb = (stats.value.memoryUsage.rss / (1024 * 1024)).toFixed(1);
  return `${mb} MB`;
});

const refreshAll = async () => {
  await refreshStats();
  await refreshCollections();
  showToast('数据已刷新', 'success');
};

const formatDate = (isoStr) => {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('zh-CN', { hour12: false });
  } catch {
    return isoStr;
  }
};
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  padding: 20px;
  box-shadow: var(--shadow-card);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-title {
  font-size: 0.82rem;
  color: var(--text-muted);
  font-weight: 600;
}

.stat-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.emerald { background: rgba(16, 185, 129, 0.18); color: #10b981; }
.stat-icon.cyan { background: rgba(6, 182, 212, 0.18); color: #06b6d4; }
.stat-icon.amber { background: rgba(245, 158, 11, 0.18); color: #f59e0b; }
.stat-icon.violet { background: rgba(139, 92, 246, 0.18); color: #a78bfa; }

.stat-value {
  font-size: 1.85rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 12px 0 6px;
  letter-spacing: -0.03em;
}

.stat-footer {
  font-size: 0.78rem;
  color: var(--text-dim);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collection-tag {
  color: #38bdf8;
  font-family: var(--font-mono);
  font-size: 0.88rem;
  font-weight: 600;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}
</style>
