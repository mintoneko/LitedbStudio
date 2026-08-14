<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-card view-key-modal" role="dialog" aria-modal="true">
      <!-- Modal Header -->
      <div class="modal-header flex-between">
        <div class="flex-center gap-2">
          <div class="modal-icon-badge">
            <Key :size="18" />
          </div>
          <div class="modal-title-group">
            <h3>API 密钥详情</h3>
            <span v-if="keyData?.name" class="name-badge-inline">
              {{ keyData.name }}
            </span>
          </div>
        </div>
        <button class="btn-close" aria-label="关闭" @click="close">
          <X :size="18" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">
        <!-- Token Display Box -->
        <div class="token-display-box">
          <div class="token-header flex-between">
            <span class="token-label">API 访问令牌</span>
            <button class="btn btn-xs btn-secondary" @click="copyToken">
              <Copy :size="12" />
              <span>复制</span>
            </button>
          </div>
          <div class="token-content">
            <code class="token-code">{{ keyData?.key }}</code>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer flex-end gap-2">
        <button class="btn btn-ghost" @click="close">关闭</button>
        <button class="btn btn-primary" @click="copyToken">
          <Copy :size="14" />
          <span>复制密钥</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Key, Copy, X } from 'lucide-vue-next';
import { useLiteDB } from '../composables/useLiteDB.js';

const props = defineProps({
  isOpen: Boolean,
  keyData: Object
});

const emit = defineEmits(['close']);
const { showToast } = useLiteDB();

const close = () => {
  emit('close');
};

const copyToken = () => {
  if (!props.keyData?.key) return;
  navigator.clipboard.writeText(props.keyData.key).then(() => {
    showToast('API 密钥已复制到剪贴板', 'success');
  });
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

.view-key-modal {
  width: 90%;
  max-width: 520px;
  background: var(--bg-modal);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  animation: modalScale 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalScale {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-modal-header);
}

.modal-icon-badge {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: rgba(2, 132, 199, 0.15);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-title-group h3 {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.name-badge-inline {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(2, 132, 199, 0.12);
  color: var(--color-primary);
  border: 1px solid rgba(2, 132, 199, 0.25);
  font-weight: 500;
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

.modal-body {
  padding: 20px;
}

/* Token Display Box */
.token-display-box {
  background: var(--table-hover-bg);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 14px 16px;
}

.token-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-main);
}

.token-content {
  margin-top: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  word-break: break-all;
}

.token-code {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  color: var(--color-primary);
  letter-spacing: 0.04em;
  font-weight: 600;
  user-select: all;
}

/* Modal Footer */
.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-modal-footer);
}
</style>
