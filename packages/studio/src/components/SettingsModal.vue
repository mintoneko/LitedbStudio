<template>
  <div v-if="isSettingsOpen" class="modal-overlay" @click.self="isSettingsOpen = false">
    <div class="modal-card" role="dialog" aria-modal="true">
      <div class="modal-header flex-between">
        <h3>LiteDB 连接设置</h3>
        <button class="btn-close" aria-label="关闭" @click="isSettingsOpen = false">
          <X :size="18" />
        </button>
      </div>

      <form @submit.prevent="saveSettings">
        <div class="modal-body">
          <div class="form-group">
            <label>服务端 API 基础地址:</label>
            <input
              v-model="tempEndpoint"
              type="text"
              class="form-input"
              placeholder="http://localhost:3000"
              @keydown.enter="saveSettings"
            />
          </div>
          <div class="form-group">
            <label>管理员 API 密钥:</label>
            <input
              ref="keyInputRef"
              v-model="tempApiKey"
              type="password"
              class="form-input"
              placeholder="输入管理员 API 密钥"
              @keydown.enter="saveSettings"
            />
          </div>
        </div>

        <div class="modal-footer flex-end gap-2">
          <button type="button" class="btn btn-ghost" @click="isSettingsOpen = false">取消</button>
          <button type="submit" class="btn btn-primary">保存并验证连接</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { X } from 'lucide-vue-next';
import { useLiteDB } from '../composables/useLiteDB.js';

const { endpoint, apiKey, isSettingsOpen, setEndpointAndKey } = useLiteDB();

const keyInputRef = ref(null);
const tempEndpoint = ref(endpoint.value);
const tempApiKey = ref(apiKey.value);

watch(isSettingsOpen, (open) => {
  if (open) {
    tempEndpoint.value = endpoint.value;
    tempApiKey.value = apiKey.value;
    nextTick(() => {
      keyInputRef.value?.focus();
    });
  }
});

const saveSettings = () => {
  setEndpointAndKey(tempEndpoint.value.trim(), tempApiKey.value.trim());
  isSettingsOpen.value = false;
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
  max-width: 520px;
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
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-main);
}

.modal-body {
  padding: 20px 24px;
}

.modal-footer {
  padding: 14px 24px;
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

.block {
  display: block;
}
</style>
