<template>
  <div v-if="isSettingsOpen" class="modal-overlay">
    <div class="modal-card">
      <div class="modal-header flex-between">
        <h3>LiteDB 连接设置</h3>
        <button class="btn-close" @click="isSettingsOpen = false">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>服务端 API 基础地址 (Endpoint):</label>
          <input
            v-model="tempEndpoint"
            type="text"
            class="form-input"
            placeholder="http://localhost:3000"
          />
        </div>
        <div class="form-group">
          <label>管理员 API 密钥 (Admin API Key):</label>
          <input
            v-model="tempApiKey"
            type="password"
            class="form-input"
            placeholder="admin_..."
          />
          <span class="text-xs text-muted mt-1 block">
            默认管理员Key服务端启动时可在控制台查看。
          </span>
        </div>
      </div>
      <div class="modal-footer flex-end gap-2">
        <button class="btn btn-ghost" @click="isSettingsOpen = false">取消</button>
        <button class="btn btn-primary" @click="saveSettings">保存并验证连接</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useLiteDB } from '../composables/useLiteDB.js';

const { endpoint, apiKey, isSettingsOpen, setEndpointAndKey } = useLiteDB();

const tempEndpoint = ref(endpoint.value);
const tempApiKey = ref(apiKey.value);

watch(isSettingsOpen, (open) => {
  if (open) {
    tempEndpoint.value = endpoint.value;
    tempApiKey.value = apiKey.value;
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
  border: none;
  color: #94a3b8;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}
.btn-close:hover {
  color: #fff;
}

.block {
  display: block;
}
</style>
