<template>
  <div v-if="isCreateApiKeyOpen" class="modal-overlay" @click.self="close">
    <div class="modal-card" role="dialog" aria-modal="true">
      <div class="modal-header flex-between">
        <div class="flex-center gap-2">
          <div class="modal-icon-badge">
            <KeyRound :size="18" />
          </div>
          <h3>新建 API 访问密钥</h3>
        </div>
        <button class="btn-close" aria-label="关闭" @click="close">
          <X :size="18" />
        </button>
      </div>

      <form @submit.prevent="handleCreate">
        <div class="modal-body">
          <div class="form-group">
            <label for="key-name-input">
              密钥名称
              <span class="required-star">*</span>
            </label>
            <input
              id="key-name-input"
              ref="inputRef"
              v-model="keyName"
              type="text"
              class="form-input"
              placeholder="输入密钥名称或用途说明"
              autocomplete="off"
              :disabled="submitting"
              @input="errorMessage = ''"
            />
          </div>

          <div class="form-group">
            <label for="custom-key-input">
              自定义 API 密钥 Token
            </label>
            <input
              id="custom-key-input"
              v-model="customKey"
              type="text"
              class="form-input font-mono"
              placeholder="例如：my_custom_secret_key_2026"
              autocomplete="off"
              :disabled="submitting"
              @input="errorMessage = ''"
            />
          </div>

          <div class="form-group">
            <label>权限级别</label>
            <div class="role-selector-grid">
              <label
                :class="['role-card', selectedRole === 'write' ? 'selected' : '']"
                @click="selectedRole = 'write'"
              >
                <input
                  v-model="selectedRole"
                  type="radio"
                  name="role"
                  value="write"
                  class="sr-only"
                />
                <div class="role-card-header flex-between">
                  <span class="role-title">读写权限 (write)</span>
                  <span class="badge badge-success">推荐</span>
                </div>
                <p class="role-desc">允许对数据集合进行查询、新增、修改与删除文档。</p>
              </label>

              <label
                :class="['role-card', selectedRole === 'read' ? 'selected' : '']"
                @click="selectedRole = 'read'"
              >
                <input
                  v-model="selectedRole"
                  type="radio"
                  name="role"
                  value="read"
                  class="sr-only"
                />
                <div class="role-card-header flex-between">
                  <span class="role-title">只读权限 (read)</span>
                </div>
                <p class="role-desc">仅允许查询和读取集合数据，禁止任何写操作与数据修改。</p>
              </label>

              <label
                :class="['role-card', selectedRole === 'admin' ? 'selected' : '']"
                @click="selectedRole = 'admin'"
              >
                <input
                  v-model="selectedRole"
                  type="radio"
                  name="role"
                  value="admin"
                  class="sr-only"
                />
                <div class="role-card-header flex-between">
                  <span class="role-title">超级管理 (admin)</span>
                  <span class="badge badge-primary">最高权限</span>
                </div>
                <p class="role-desc">拥有全部权限，包括集合创建与删除、API 密钥管理及 SQL 执行。</p>
              </label>
            </div>
          </div>

          <div v-if="errorMessage" class="error-banner">
            {{ errorMessage }}
          </div>
        </div>

        <div class="modal-footer flex-end gap-2">
          <button type="button" class="btn btn-ghost" :disabled="submitting" @click="close">
            取消
          </button>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            <span v-if="submitting" class="loading-spinner"></span>
            <span>{{ submitting ? '创建中...' : '创建密钥' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { KeyRound, X } from 'lucide-vue-next';
import { useLiteDB } from '../composables/useLiteDB.js';

const emit = defineEmits(['created']);
const {
  isCreateApiKeyOpen,
  closeCreateApiKey,
  triggerApiKeyRefresh,
  apiRequest,
  showToast
} = useLiteDB();

const inputRef = ref(null);
const keyName = ref('');
const customKey = ref('');
const selectedRole = ref('write');
const errorMessage = ref('');
const submitting = ref(false);

watch(isCreateApiKeyOpen, (open) => {
  if (open) {
    keyName.value = '';
    customKey.value = '';
    selectedRole.value = 'write';
    errorMessage.value = '';
    submitting.value = false;
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});

const close = () => {
  if (submitting.value) return;
  closeCreateApiKey();
};

const handleCreate = async () => {
  const name = keyName.value.trim();
  if (!name) {
    errorMessage.value = '请输入密钥名称或用途说明';
    inputRef.value?.focus();
    return;
  }

  submitting.value = true;
  errorMessage.value = '';

  try {
    const res = await apiRequest('/api/auth/keys', {
      method: 'POST',
      body: {
        name,
        role: selectedRole.value,
        customKey: customKey.value.trim() || undefined
      }
    });

    showToast(`密钥 "${res.name}" 创建成功!`, 'success');
    triggerApiKeyRefresh();
    emit('created', res);
    closeCreateApiKey();
  } catch (err) {
    errorMessage.value = `创建失败: ${err.message}`;
  } finally {
    submitting.value = false;
  }
};

const handleKeydown = (e) => {
  if (!isCreateApiKeyOpen.value) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  animation: fadeIn 0.15s ease;
}

.modal-card {
  background: var(--bg-modal);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  width: 90%;
  max-width: 520px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
  animation: modalScale 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalScale {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-header {
  padding: 16px 22px;
  border-bottom: 1px solid var(--border-subtle);
}

.modal-header h3 {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.modal-icon-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(2, 132, 199, 0.15);
  color: #38bdf8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 22px;
}

.required-star {
  color: var(--color-danger);
  margin-left: 2px;
}

.role-selector-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
}

.role-card {
  display: block;
  padding: 12px 14px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.role-card:hover {
  border-color: rgba(56, 189, 248, 0.4);
  background: var(--table-hover-bg);
}

.role-card.selected {
  border-color: #38bdf8;
  background: rgba(2, 132, 199, 0.1);
}

.role-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main);
}

.role-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 4px;
  line-height: 1.4;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  margin-top: 14px;
}

.modal-footer {
  padding: 14px 22px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-modal-footer);
}

.btn-close {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-dim);
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: all 0.18s ease;
}

.btn-close:hover {
  color: var(--text-main);
  background: var(--table-hover-bg);
  border-color: var(--border-subtle);
  transform: rotate(90deg);
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
