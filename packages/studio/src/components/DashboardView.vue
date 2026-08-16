<template>
  <div class="dashboard-view">
    <div
      v-if="!isConnected || isConnecting"
      :class="['connection-banner', isConnecting ? 'connecting' : '']"
    >
      <div class="connection-banner-icon">
        <Database :size="18" />
      </div>
      <div class="connection-banner-copy">
        <strong>{{ isConnecting ? '正在连接 LiteDB 服务' : '尚未连接 LiteDB 服务' }}</strong>
        <span>
          {{ isConnecting ? '正在读取数据库状态，请稍候。' : '连接服务后才能查看集合、文档和运行指标。' }}
        </span>
      </div>
      <button class="btn btn-secondary btn-sm" @click="isSettingsOpen = true">
        <Settings :size="14" />
        <span>连接设置</span>
      </button>
    </div>

    <!-- Stat Cards Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">数据库文件大小</span>
          <div class="stat-icon emerald">
            <Database :size="18" />
          </div>
        </div>
        <div class="stat-value">{{ isConnected ? (stats.fileSizeFormatted || '0 B') : '—' }}</div>
        <div class="stat-footer">{{ isConnected ? `路径: ${stats.path}` : '连接后显示数据库路径' }}</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">数据集合数</span>
          <div class="stat-icon cyan">
            <Folder :size="18" />
          </div>
        </div>
        <div class="stat-value">{{ isConnected ? stats.collectionsCount : '—' }}</div>
        <div class="stat-footer">当前已注册分类</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">存储文档总记录</span>
          <div class="stat-icon amber">
            <FileText :size="18" />
          </div>
        </div>
        <div class="stat-value">{{ isConnected ? stats.totalDocuments : '—' }}</div>
        <div class="stat-footer">总 JSON 文档记录数</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-title">常驻内存占用</span>
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
      <div v-if="collections.length" class="table-scroll-note">可左右滑动查看完整列表</div>
      <div class="card-body no-padding">
        <div class="table-responsive">
          <table class="data-table" :class="{ 'has-collection-rows': collections.length > 0 }">
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
              <tr v-if="isConnecting">
                <td colspan="5" class="text-center py-6 text-muted">正在读取数据库状态...</td>
              </tr>
              <tr v-else-if="!isConnected">
                <td colspan="5" class="text-center py-6">
                  <div class="empty-state-content">
                    <strong>连接服务后显示集合</strong>
                    <span>当前页面还没有读取到数据库数据。</span>
                    <button class="btn btn-secondary btn-sm" @click="isSettingsOpen = true">
                      打开连接设置
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-else-if="collections.length === 0">
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
import { Database, Folder, FileText, Activity, RotateCw, Settings } from 'lucide-vue-next';
import { useLiteDB } from '../composables/useLiteDB.js';

const emit = defineEmits(['goto-collection']);
const {
  stats,
  collections,
  isConnected,
  isConnecting,
  isSettingsOpen,
  refreshStats,
  refreshCollections,
  showToast
} = useLiteDB();

const formattedRss = computed(() => {
  if (!isConnected.value || !stats.value?.memoryUsage?.rss) return '—';
  const mb = (stats.value.memoryUsage.rss / (1024 * 1024)).toFixed(1);
  return `${mb} MB`;
});

const refreshAll = async () => {
  if (!isConnected.value) {
    isSettingsOpen.value = true;
    showToast('请先连接 LiteDB 服务', 'info');
    return;
  }

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
.connection-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
  background: var(--bg-card);
  border: 1px solid rgba(2, 132, 199, 0.35);
  border-left: 3px solid var(--color-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.connection-banner.connecting {
  border-left-color: var(--color-warning);
}

.connection-banner-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 8px;
  color: var(--color-primary);
  background: rgba(2, 132, 199, 0.12);
}

.connection-banner-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.connection-banner-copy strong {
  font-size: 0.88rem;
  color: var(--text-main);
}

.connection-banner-copy span {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.empty-state-content {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
}

.empty-state-content strong {
  color: var(--text-main);
  font-size: 0.86rem;
}

.empty-state-content span {
  font-size: 0.78rem;
}

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
  color: var(--color-accent-text);
  font-family: var(--font-mono);
  font-size: 0.88rem;
  font-weight: 600;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.table-scroll-note {
  display: none;
}

@media (max-width: 640px) {
  .connection-banner {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .connection-banner .btn {
    width: 100%;
  }

  .table-scroll-note {
    display: block;
    padding: 6px 12px;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--table-header-bg);
    color: var(--text-dim);
    font-size: 0.7rem;
    text-align: right;
  }

  .dashboard-view .data-table.has-collection-rows {
    min-width: 680px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .stat-card {
    padding: 12px 14px;
  }

  .stat-value {
    font-size: 1.4rem;
    margin: 8px 0 4px;
  }

  .stat-title {
    font-size: 0.75rem;
  }

  .stat-icon {
    width: 28px;
    height: 28px;
  }
}

@media (max-width: 380px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
