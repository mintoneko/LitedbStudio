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
        <div class="table-responsive">
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
                  <span :class="['badge', k.role === 'admin' ? 'badge-primary' : 'badge-success']">
                    {{ k.role }}
                  </span>
                </td>
                <td class="text-dim text-xs">{{ formatDate(k.created_at) }}</td>
                <td class="text-dim text-xs">{{ k.last_used_at ? formatDate(k.last_used_at) : '从未使用' }}</td>
                <td class="text-right" style="white-space: nowrap;">
                  <div class="actions-group flex-end gap-2">
                    <button class="btn-icon-action btn-copy-action" @click="copyKey(k.key)">
                      <Copy :size="14" />
                    </button>
                    <button class="btn-icon-action btn-delete-action" @click="deleteKey(k.id)">
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
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

const deleteKey = async (id) => {
  const confirmed = await showConfirm({
    title: '注销 API 密钥',
    message: '确定要注销此 API 密钥吗？注销后使用此密钥的客户端和应用将立即无法再访问数据库！',
    confirmText: '确认注销',
    cancelText: '取消',
    type: 'danger'
  });
  if (!confirmed) return;

  try {
    await apiRequest(`/api/auth/keys/${id}`, { method: 'DELETE' });
    showToast('API 密钥已注销删除', 'success');
    loadKeys();
  } catch (err) {
    showToast(`删除失败: ${err.message}`, 'error');
  }
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
</style>
