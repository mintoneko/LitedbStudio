<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-card view-doc-modal" role="dialog" aria-modal="true">
      <!-- Modal Header -->
      <div class="modal-header flex-between">
        <div class="flex-center gap-2">
          <div class="modal-icon-badge">
            <Eye :size="18" />
          </div>
          <div class="modal-title-group">
            <h3>文档详情</h3>
            <span class="collection-badge-inline">{{ collectionName }}</span>
          </div>
        </div>
        <button class="btn-close" aria-label="关闭" @click="close">
          <X :size="18" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">
        <!-- Meta Info Bar -->
        <div class="doc-meta-bar flex-between">
          <div class="meta-item">
            <span class="meta-label">主键 ID:</span>
            <span v-if="isNumericId(docData?.id)" class="numeric-id-badge">
              #{{ docData?.id }}
            </span>
            <code v-else class="string-id-badge">
              {{ docData?.id }}
            </code>
          </div>

          <div class="meta-item">
            <span class="meta-label">创建时间:</span>
            <span class="meta-val">{{ formatDate(docData?.created_at) }}</span>
          </div>

          <div class="meta-item">
            <span class="meta-label">更新时间:</span>
            <span class="meta-val">{{ formatDate(docData?.updated_at) }}</span>
          </div>

          <div class="meta-item">
            <span class="meta-label">字段数:</span>
            <span class="meta-val highlight">{{ customFieldsCount }} 个</span>
          </div>
        </div>

        <!-- View Tabs -->
        <div class="view-tabs flex-between">
          <div class="tabs-group">
            <button
              :class="['tab-btn', activeTab === 'fields' ? 'active' : '']"
              @click="activeTab = 'fields'"
            >
              <TableProperties :size="14" />
              <span>结构化属性</span>
            </button>
            <button
              :class="['tab-btn', activeTab === 'json' ? 'active' : '']"
              @click="activeTab = 'json'"
            >
              <FileJson :size="14" />
              <span>原始 JSON</span>
            </button>
          </div>

          <button class="btn btn-xs btn-secondary" @click="copyAllJson">
            <Copy :size="12" />
            <span>复制 JSON</span>
          </button>
        </div>

        <!-- Tab 1: Key-Value Structured Fields Table -->
        <div v-if="activeTab === 'fields'" class="fields-table-wrapper">
          <table class="fields-table">
            <thead>
              <tr>
                <th style="width: 140px;">字段名</th>
                <th style="width: 90px;">类型</th>
                <th>字段值</th>
                <th class="text-right" style="width: 60px;">复制</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="customFieldsCount === 0">
                <td colspan="4" class="text-center py-6 text-muted">暂无自定义字段</td>
              </tr>
              <tr v-for="(val, key) in customFields" :key="key">
                <!-- Key -->
                <td>
                  <span class="key-pill">{{ key }}</span>
                </td>

                <!-- Type -->
                <td>
                  <span :class="['type-tag', `type-${getFieldType(val)}`]">
                    {{ getFieldType(val) }}
                  </span>
                </td>

                <!-- Value -->
                <td class="val-cell">
                  <!-- Boolean -->
                  <span
                    v-if="typeof val === 'boolean'"
                    :class="['bool-badge', val ? 'is-true' : 'is-false']"
                  >
                    {{ val ? '✔ true' : '✖ false' }}
                  </span>

                  <!-- Number -->
                  <span v-else-if="typeof val === 'number'" class="val-number">
                    {{ val }}
                  </span>

                  <!-- Array -->
                  <div v-else-if="Array.isArray(val)" class="array-tag-group">
                    <span v-for="(item, idx) in val" :key="idx" class="tag-pill">
                      {{ typeof item === 'object' ? JSON.stringify(item) : item }}
                    </span>
                  </div>

                  <!-- Object -->
                  <pre v-else-if="typeof val === 'object' && val !== null" class="obj-block"><code>{{ JSON.stringify(val, null, 2) }}</code></pre>

                  <!-- Null -->
                  <span v-else-if="val === null" class="val-null">null</span>

                  <!-- String / Other -->
                  <span v-else class="val-string-full">{{ val }}</span>
                </td>

                <!-- Single Copy -->
                <td class="text-right">
                  <button
                    class="btn-copy-field"
                    title="复制该字段值"
                    @click="copyValue(val)"
                  >
                    <Copy :size="12" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Tab 2: Raw Formatted JSON -->
        <div v-else-if="activeTab === 'json'" class="json-code-container">
          <pre class="json-view-pre"><code>{{ formattedJson }}</code></pre>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer flex-end gap-2">
        <button class="btn btn-ghost" @click="close">关闭</button>
        <button class="btn btn-primary" @click="onEdit">
          <Edit3 :size="14" />
          <span>编辑文档</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Eye, Copy, Edit3, TableProperties, FileJson, X } from 'lucide-vue-next';
import { useLiteDB } from '../composables/useLiteDB.js';

const props = defineProps({
  isOpen: Boolean,
  collectionName: String,
  docData: Object
});

const emit = defineEmits(['close', 'edit']);
const { showToast } = useLiteDB();

const activeTab = ref('fields');

const isNumericId = (id) => {
  if (typeof id === 'number') return true;
  return typeof id === 'string' && /^\d+$/.test(id);
};

const customFields = computed(() => {
  if (!props.docData) return {};
  const { id, created_at, updated_at, ...custom } = props.docData;
  return custom;
});

const customFieldsCount = computed(() => {
  return Object.keys(customFields.value).length;
});

const formattedJson = computed(() => {
  if (!props.docData) return '{}';
  return JSON.stringify(props.docData, null, 2);
});

const getFieldType = (val) => {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val;
};

const copyValue = (val) => {
  const text = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
  navigator.clipboard.writeText(text).then(() => {
    showToast('已复制字段内容', 'success');
  });
};

const copyAllJson = () => {
  navigator.clipboard.writeText(formattedJson.value).then(() => {
    showToast('完整文档 JSON 已复制到剪贴板', 'success');
  });
};

const close = () => {
  emit('close');
};

const onEdit = () => {
  emit('edit', props.docData);
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

.view-doc-modal {
  background: var(--bg-modal);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  width: 90%;
  max-width: 680px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
  animation: modalScale 0.2s ease;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

@keyframes modalScale {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-subtle);
}

.modal-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-title-group h3 {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.collection-badge-inline {
  font-size: 0.75rem;
  font-family: var(--font-mono);
  background: rgba(2, 132, 199, 0.1);
  color: var(--color-primary);
  border: 1px solid rgba(2, 132, 199, 0.25);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.modal-icon-badge {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: rgba(2, 132, 199, 0.12);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

/* Meta Bar */
.doc-meta-bar {
  background: var(--table-header-bg);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 10px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
}

.meta-label {
  color: var(--text-muted);
  font-weight: 500;
}

.meta-val {
  color: var(--text-main);
  font-family: var(--font-mono);
  font-weight: 600;
}

.meta-val.highlight {
  color: var(--color-primary);
}

/* Tabs */
.view-tabs {
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 12px;
  padding-bottom: 8px;
}

.tabs-group {
  display: flex;
  gap: 6px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  color: var(--text-main);
  background: var(--table-hover-bg);
}

.tab-btn.active {
  background: var(--color-primary);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 1px 6px rgba(2, 132, 199, 0.25);
}

/* Fields Table */
.fields-table-wrapper {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.fields-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.83rem;
}

.fields-table th {
  padding: 10px 14px;
  background: var(--table-header-bg);
  color: var(--text-muted);
  font-weight: 600;
  border-bottom: 1px solid var(--border-subtle);
  text-align: left;
}

.fields-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--table-border);
  vertical-align: middle;
}

.fields-table tr:last-child td {
  border-bottom: none;
}

.key-pill {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--text-main);
  background: var(--table-hover-bg);
  border: 1px solid var(--border-subtle);
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 0.8rem;
  display: inline-block;
}

.type-tag {
  font-size: 0.7rem;
  font-family: var(--font-mono);
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 3px;
  text-transform: uppercase;
}
.type-string { color: #10b981; background: rgba(16, 185, 129, 0.1); }
.type-number { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
.type-boolean { color: #8b5cf6; background: rgba(139, 92, 246, 0.1); }
.type-array { color: #0284c7; background: rgba(2, 132, 199, 0.1); }
.type-object { color: #ec4899; background: rgba(236, 72, 153, 0.1); }
.type-null { color: var(--text-dim); background: rgba(128, 128, 128, 0.1); }

.val-cell {
  font-family: var(--font-mono);
}

.val-string-full {
  color: #10b981;
  font-weight: 500;
  white-space: pre-wrap;
  word-break: break-word;
}

.val-number {
  color: #f59e0b;
  font-weight: 600;
}

.val-null {
  color: var(--text-dim);
  font-style: italic;
}

.bool-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
}
.bool-badge.is-true {
  color: #059669;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.bool-badge.is-false {
  color: #dc2626;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.array-tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-pill {
  font-size: 0.7rem;
  padding: 1px 6px;
  background: rgba(2, 132, 199, 0.1);
  color: var(--color-primary);
  border: 1px solid rgba(2, 132, 199, 0.25);
  border-radius: 3px;
}

.obj-block {
  margin: 0;
  background: var(--bg-code);
  color: var(--text-code);
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  max-height: 120px;
  overflow-y: auto;
}

.btn-copy-field {
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-dim);
  border-radius: 4px;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-copy-field:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

/* JSON Code Tab */
.json-code-container {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.json-view-pre {
  margin: 0;
  padding: 14px 16px;
  background: var(--bg-code);
  color: var(--text-code);
  font-family: var(--font-mono);
  font-size: 0.83rem;
  line-height: 1.6;
  max-height: 380px;
  overflow-y: auto;
}

/* Modal Footer */
.modal-footer {
  padding: 14px 20px;
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

@media (max-width: 600px) {
  .view-doc-modal {
    width: 95%;
    max-height: 92vh;
  }

  .modal-header {
    padding: 12px 14px;
  }

  .modal-body {
    padding: 12px 14px;
  }

  .doc-meta-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 8px 10px;
  }

  .view-tabs {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }

  .tabs-group {
    width: 100%;
  }

  .tab-btn {
    flex: 1;
    justify-content: center;
  }

  .modal-footer {
    padding: 10px 14px;
    flex-direction: column-reverse;
    gap: 10px;
  }

  .modal-footer .flex-center {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
