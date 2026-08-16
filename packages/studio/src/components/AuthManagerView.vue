<template>
  <div class="auth-manager-view">
    <div class="content-card">
      <div class="card-header flex-between">
        <div>
          <h3>API 密钥授权管理</h3>
          <p class="text-muted text-xs">为前端项目、轻量微服务或桌面端生成独立的安全访问令牌</p>
        </div>
        <button class="btn btn-primary btn-sm" @click="promptCreateKey">
          <Plus :size="14" />
          <span>新建 API 密钥</span>
        </button>
      </div>
      <div class="card-body no-padding">
        <div class="table-responsive desktop-key-table">
          <table class="data-table">
            <thead>
              <tr>
                <th>名称 / 用途</th>
                <th>API 密钥 Token</th>
                <th>权限级别</th>
                <th>创建时间</th>
                <th>最后使用</th>
                <th class="text-right" style="width: 110px; white-space: nowrap;">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="text-center py-6 text-muted">加载密钥列表中...</td>
              </tr>
              <tr v-else-if="keys.length === 0">
                <td colspan="6" class="text-center py-6 text-muted">暂无 API 密钥</td>
              </tr>
              <tr v-for="k in keys" :key="k.id">
                <td><strong>{{ k.name }}</strong></td>
                <td style="white-space: nowrap;">
                  <button
                    class="btn-view-doc"
                    @click="openViewKeyModal(k)"
                  >
                    <Key :size="14" class="icon-eye" />
                    <span class="btn-text">查看密钥</span>
                  </button>
                </td>
                <td>
                  <span :class="['badge', getRoleBadgeClass(k.role)]">
                    {{ k.role }}
                  </span>
                </td>
                <td class="text-dim text-xs">{{ formatDate(k.created_at) }}</td>
                <td class="text-dim text-xs">{{ k.last_used_at ? formatDate(k.last_used_at) : '从未使用' }}</td>
                <td class="text-right" style="white-space: nowrap;">
                  <div class="actions-group flex-end gap-2">
                    <button
                      class="btn-icon-action btn-copy-action"
                      aria-label="复制 API 密钥"
                      @click="copyKey(k.key)"
                    >
                      <Copy :size="14" />
                    </button>
                    <button
                      class="btn-icon-action btn-delete-action"
                      aria-label="注销 API 密钥"
                      @click="deleteKey(k)"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mobile-key-list">
          <div v-if="loading" class="mobile-key-state text-muted">加载密钥列表中...</div>
          <div v-else-if="keys.length === 0" class="mobile-key-state text-muted">暂无 API 密钥</div>
          <article v-for="k in keys" :key="k.id" class="mobile-key-card">
            <div class="mobile-key-card-header">
              <div class="mobile-key-card-title">
                <strong>{{ k.name }}</strong>
                <span :class="['badge', getRoleBadgeClass(k.role)]">
                  {{ k.role }}
                </span>
              </div>
              <button class="btn-view-doc" @click="openViewKeyModal(k)">
                <Key :size="14" class="icon-eye" />
                <span>查看密钥</span>
              </button>
            </div>

            <dl class="mobile-key-meta">
              <div>
                <dt>创建时间</dt>
                <dd>{{ formatDate(k.created_at) }}</dd>
              </div>
              <div>
                <dt>最后使用</dt>
                <dd>{{ k.last_used_at ? formatDate(k.last_used_at) : '从未使用' }}</dd>
              </div>
            </dl>

            <div class="mobile-key-actions">
              <button class="btn btn-secondary btn-sm" @click="copyKey(k.key)">
                <Copy :size="14" />
                <span>复制密钥</span>
              </button>
              <button class="btn btn-danger-outline btn-sm" @click="deleteKey(k)">
                <Trash2 :size="14" />
                <span>注销</span>
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>

    <!-- API Key Detail Modal -->
    <ViewApiKeyModal
      :is-open="isViewKeyModalOpen"
      :key-data="viewingKeyData"
      @close="isViewKeyModalOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { Plus, Copy, Trash2, Key } from 'lucide-vue-next';
import { useLiteDB } from '../composables/useLiteDB.js';
import ViewApiKeyModal from './ViewApiKeyModal.vue';

const { apiRequest, showToast, showConfirm, openCreateApiKey, isCreateApiKeyOpen } = useLiteDB();

const keys = ref([]);
const loading = ref(false);

const isViewKeyModalOpen = ref(false);
const viewingKeyData = ref(null);

const openViewKeyModal = (key) => {
  viewingKeyData.value = key;
  isViewKeyModalOpen.value = true;
};

const loadKeys = async () => {
  loading.value = true;
  try {
    const res = await apiRequest('/api/auth/keys');
    keys.value = res || [];
  } catch (err) {
    showToast(`加载密钥失败: ${err.message}`, 'error');
  } finally {
    loading.value = false;
  }
};

const promptCreateKey = () => {
  openCreateApiKey();
};

watch(isCreateApiKeyOpen, (open) => {
  if (!open) {
    loadKeys();
  }
});

const copyKey = (token) => {
  navigator.clipboard.writeText(token).then(() => {
    showToast('API 密钥已复制到剪贴板', 'success');
  });
};

const deleteKey = async (targetKey) => {
  const isTargetAdmin = targetKey.role === 'admin';
  const adminCount = keys.value.filter(k => k.role === 'admin').length;

  if (isTargetAdmin && adminCount <= 1) {
    showToast('无法注销：系统中至少需要保留一个管理员密钥 (admin)！', 'warning');
    return;
  }

  const confirmed = await showConfirm({
    title: '注销 API 密钥',
    message: `确定要注销 API 密钥 "${targetKey.name}" 吗？注销后使用此密钥的客户端和应用将立即无法再访问数据库！`,
    confirmText: '确认注销',
    cancelText: '取消',
    type: 'danger'
  });
  if (!confirmed) return;

  try {
    await apiRequest(`/api/auth/keys/${targetKey.id}`, { method: 'DELETE' });
    showToast('API 密钥已注销删除', 'success');
    loadKeys();
  } catch (err) {
    showToast(`删除失败: ${err.message}`, 'error');
  }
};

const getRoleBadgeClass = (role) => {
  if (role === 'admin') return 'badge-primary';
  if (role === 'write' || role === 'read-write') return 'badge-success';
  return 'badge-warning';
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

onMounted(() => {
  loadKeys();
});
</script>

<style scoped>
.btn-view-doc {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-main);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.btn-view-doc span {
  white-space: nowrap;
}

.btn-view-doc:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(2, 132, 199, 0.08);
  box-shadow: 0 2px 6px rgba(2, 132, 199, 0.15);
  transform: translateY(-1px);
}

.icon-eye {
  color: var(--color-primary);
}

.actions-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.btn-icon-action {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--bg-input);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.btn-copy-action:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: rgba(2, 132, 199, 0.12);
  transform: translateY(-1px);
}

.btn-delete-action {
  color: var(--color-danger);
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.08);
}

.btn-delete-action:hover {
  color: #ffffff;
  border-color: var(--color-danger);
  background: var(--color-danger);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.mobile-key-list {
  display: none;
}

@media (max-width: 640px) {
  .desktop-key-table {
    display: none;
  }

  .mobile-key-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
  }

  .mobile-key-state {
    padding: 24px 12px;
    text-align: center;
    font-size: 0.82rem;
  }

  .mobile-key-card {
    padding: 14px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--bg-input);
  }

  .mobile-key-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .mobile-key-card-title {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    min-width: 0;
  }

  .mobile-key-card-title strong {
    min-width: 0;
    color: var(--text-main);
    font-size: 0.88rem;
    overflow-wrap: anywhere;
  }

  .mobile-key-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 14px 0;
  }

  .mobile-key-meta div {
    min-width: 0;
  }

  .mobile-key-meta dt {
    margin-bottom: 3px;
    color: var(--text-dim);
    font-size: 0.7rem;
  }

  .mobile-key-meta dd {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.76rem;
    overflow-wrap: anywhere;
  }

  .mobile-key-actions {
    display: flex;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid var(--border-subtle);
  }

  .mobile-key-actions .btn {
    flex: 1;
  }
}
</style>
