<template>
  <div v-if="isCreateCollectionOpen" class="modal-overlay" @click.self="close">
    <div class="modal-card" role="dialog" aria-modal="true">
      <div class="modal-header flex-between">
        <div class="flex-center gap-2">
          <div class="modal-icon-badge">
            <FolderPlus :size="18" />
          </div>
          <h3>新建数据集合</h3>
        </div>
        <button class="btn-close" aria-label="关闭" @click="close">
          <X :size="18" />
        </button>
      </div>

      <form @submit.prevent="handleCreate">
        <div class="modal-body">
          <div class="form-group">
            <label for="collection-name-input">
              集合名称
              <span class="required-star">*</span>
            </label>
            <input
              id="collection-name-input"
              ref="inputRef"
              v-model="collectionName"
              type="text"
              class="form-input"
              placeholder="输入集合名称"
              autocomplete="off"
              :disabled="submitting"
              @input="errorMessage = ''"
            />
            <span class="form-hint">
              仅支持英文字母、数字和下划线，创建后可直接存储同类 JSON 文档。
            </span>
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
            <span>{{ submitting ? '创建中...' : '确定创建' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { FolderPlus, X } from 'lucide-vue-next';
import { useLiteDB } from '../composables/useLiteDB.js';

const emit = defineEmits(['created']);
const {
  isCreateCollectionOpen,
  closeCreateCollection,
  collections,
  apiRequest,
  refreshCollections,
  showToast
} = useLiteDB();

const inputRef = ref(null);
const collectionName = ref('');
const errorMessage = ref('');
const submitting = ref(false);

watch(isCreateCollectionOpen, (open) => {
  if (open) {
    collectionName.value = '';
    errorMessage.value = '';
    submitting.value = false;
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});

const close = () => {
  if (submitting.value) return;
  closeCreateCollection();
};

const handleCreate = async () => {
  const name = collectionName.value.trim();
  if (!name) {
    errorMessage.value = '请输入集合名称';
    inputRef.value?.focus();
    return;
  }

  const validNameRegex = /^[a-zA-Z0-9_]+$/;
  if (!validNameRegex.test(name)) {
    errorMessage.value = '集合名称仅支持字母、数字和下划线组合 (a-z, A-Z, 0-9, _)';
    inputRef.value?.focus();
    return;
  }

  if (collections.value.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    errorMessage.value = `集合 "${name}" 已存在，请使用其他名称`;
    inputRef.value?.focus();
    return;
  }

  submitting.value = true;
  errorMessage.value = '';

  try {
    await apiRequest('/api/collections', {
      method: 'POST',
      body: { name }
    });

    showToast(`集合 "${name}" 创建成功!`, 'success');
    await refreshCollections();
    emit('created', name);
    closeCreateCollection();
  } catch (err) {
    errorMessage.value = `创建失败: ${err.message}`;
  } finally {
    submitting.value = false;
  }
};

const handleKeydown = (e) => {
  if (!isCreateCollectionOpen.value) return;
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
  max-width: 480px;
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

.form-hint {
  display: block;
  font-size: 0.75rem;
  color: var(--text-dim);
  margin-top: 6px;
  line-height: 1.4;
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
