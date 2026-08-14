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
                <th class="text-right">操作</th>
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
                <td>
                  <code class="key-token">{{ k.key }}</code>
                </td>
                <td>
                  <span :class="['badge', k.role === 'admin' ? 'badge-primary' : 'badge-success']">
                    {{ k.role }}
                  </span>
                </td>
                <td class="text-dim text-xs">{{ formatDate(k.created_at) }}</td>
                <td class="text-dim text-xs">{{ k.last_used_at ? formatDate(k.last_used_at) : '从未使用' }}</td>
                <td class="text-right">
                  <button class="btn btn-xs btn-secondary mr-1" @click="copyKey(k.key)">
                    <Copy :size="12" /> 复制
                  </button>
                  <button class="btn btn-xs btn-danger-outline" @click="deleteKey(k.id)">
                    <Trash2 :size="12" /> 删除
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
import { ref, onMounted } from 'vue';
import { Plus, Copy, Trash2 } from 'lucide-vue-next';
import { useLiteDB } from '../composables/useLiteDB.js';

const { apiRequest, showToast, showConfirm, openCreateApiKey, isCreateApiKeyOpen } = useLiteDB();

const keys = ref([]);
const loading = ref(false);

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
.key-token {
  font-size: 0.8rem;
  color: #38bdf8;
  font-family: var(--font-mono);
  font-weight: 600;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.25);
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-block;
}

.mr-1 {
  margin-right: 4px;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}
</style>
