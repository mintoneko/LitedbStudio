<template>
  <div v-if="confirmState.isOpen" class="modal-overlay" @click.self="handleCancel">
    <div class="modal-card confirm-card" role="dialog" aria-modal="true">
      <div class="modal-header flex-between">
        <div class="header-title flex-center gap-2">
          <div :class="['type-badge', confirmState.type]">
            <AlertTriangle v-if="confirmState.type === 'danger'" :size="18" />
            <AlertCircle v-else-if="confirmState.type === 'warning'" :size="18" />
            <Info v-else :size="18" />
          </div>
          <h3>{{ confirmState.title }}</h3>
        </div>
        <button class="btn-close" aria-label="关闭" @click="handleCancel">
          <X :size="18" />
        </button>
      </div>

      <div class="modal-body">
        <p class="confirm-message">{{ confirmState.message }}</p>
      </div>

      <div class="modal-footer flex-end gap-2">
        <button class="btn btn-ghost" @click="handleCancel">
          {{ confirmState.cancelText || '取消' }}
        </button>
        <button
          :class="['btn', confirmState.type === 'danger' ? 'btn-danger' : 'btn-primary']"
          @click="handleConfirm"
        >
          {{ confirmState.confirmText || '确定' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-vue-next';
import { useLiteDB } from '../composables/useLiteDB.js';

const { confirmState, resolveConfirm } = useLiteDB();

const handleCancel = () => {
  resolveConfirm(false);
};

const handleConfirm = () => {
  resolveConfirm(true);
};

const handleKeydown = (e) => {
  if (!confirmState.value.isOpen) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    handleCancel();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    handleConfirm();
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
  z-index: 1100;
  animation: fadeIn 0.15s ease;
}

.confirm-card {
  background: var(--bg-modal);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  width: 90%;
  max-width: 440px;
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
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-subtle);
}

.header-title h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
}

.type-badge {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.type-badge.danger {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-danger);
}

.type-badge.warning {
  background: rgba(245, 158, 11, 0.15);
  color: var(--color-warning);
}

.type-badge.info {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.modal-body {
  padding: 20px;
}

.confirm-message {
  font-size: 0.9rem;
  color: var(--text-main);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.modal-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-modal-footer);
}

.btn-danger {
  background: var(--color-danger);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.btn-danger:hover {
  background: #dc2626;
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
</style>
