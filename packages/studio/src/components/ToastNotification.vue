<template>
  <div class="toast-container">
    <transition-group name="toast-fade">
      <div
        v-for="t in toasts"
        :key="t.id"
        :class="['toast', t.type]"
      >
        <span class="toast-dot"></span>
        <span class="toast-msg">{{ t.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useLiteDB } from '../composables/useLiteDB.js';

const { toasts } = useLiteDB();
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 9999;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  background: var(--bg-toast);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  padding: 12px 18px;
  border-radius: 8px;
  box-shadow: var(--shadow-card);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 420px;
}

.toast-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #38bdf8;
  flex-shrink: 0;
}

.toast.success { border-color: #10b981; }
.toast.success .toast-dot { background: #10b981; }

.toast.error { border-color: #ef4444; }
.toast.error .toast-dot { background: #ef4444; }

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.25s ease;
}

.toast-fade-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(15px);
}
</style>
