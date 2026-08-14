<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header flex-between">
        <h3>{{ docId ? `编辑文档 [${docId}]` : `添加新文档到 [${collectionName}]` }}</h3>
        <button class="btn-close" @click="close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <div class="flex-between mb-2">
            <label>JSON 文档数据 (ID 将自动从 1 开始递增):</label>
            <button class="btn btn-xs btn-secondary" @click="formatJson">格式化 JSON</button>
          </div>
          <textarea
            v-model="jsonContent"
            class="code-textarea"
            placeholder="{ ... }"
          ></textarea>
        </div>
        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>
      </div>
      <div class="modal-footer flex-end gap-2">
        <button class="btn btn-ghost" @click="close">取消</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? '保存中...' : '保存文档' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  collectionName: String,
  docId: String,
  initialData: Object
});

const emit = defineEmits(['close', 'saved']);

const jsonContent = ref('{}');
const errorMessage = ref('');
const saving = ref(false);

watch(() => props.isOpen, (open) => {
  if (open) {
    errorMessage.value = '';
    if (props.initialData) {
      const { id, created_at, updated_at, ...custom } = props.initialData;
      jsonContent.value = JSON.stringify(custom, null, 2);
    } else {
      jsonContent.value = JSON.stringify({
        title: '示例项目',
        status: 'active',
        priority: 1
      }, null, 2);
    }
  }
});

const formatJson = () => {
  try {
    const parsed = JSON.parse(jsonContent.value);
    jsonContent.value = JSON.stringify(parsed, null, 2);
    errorMessage.value = '';
  } catch (e) {
    errorMessage.value = `JSON 格式错误: ${e.message}`;
  }
};

const close = () => {
  emit('close');
};

const save = () => {
  errorMessage.value = '';
  try {
    const parsed = JSON.parse(jsonContent.value);
    emit('saved', { id: props.docId, data: parsed });
  } catch (e) {
    errorMessage.value = `JSON 解析错误: ${e.message}`;
  }
};
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
  z-index: 1000;
}

.modal-card {
  background: var(--bg-modal);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  width: 90%;
  max-width: 580px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
  animation: modalScale 0.2s ease;
}

@keyframes modalScale {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-subtle);
}

.modal-header h3 {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-main);
}

.modal-body {
  padding: 20px 24px;
}

.code-textarea {
  width: 100%;
  height: 260px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  color: var(--text-main);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  padding: 12px;
  outline: none;
  resize: vertical;
}
.code-textarea:focus {
  border-color: var(--border-focus);
}

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  margin-top: 10px;
}

.modal-footer {
  padding: 14px 24px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-modal-footer);
}

.btn-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}
</style>
