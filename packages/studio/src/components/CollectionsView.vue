<template>
  <div class="collection-layout">
    <!-- Collections Sidebar -->
    <div class="collection-sidebar">
      <div class="collection-sidebar-header flex-between">
        <h4>集合清单</h4>
        <button class="btn btn-xs btn-primary" @click="promptCreateCollection">
          <Plus :size="12" /> 新建
        </button>
      </div>
      <div class="collection-list-nav">
        <div v-if="collections.length === 0" class="empty-state-sm text-center py-4 text-muted text-xs">
          暂无集合
        </div>
        <div
          v-for="c in collections"
          :key="c.name"
          :class="['collection-nav-item', c.name === activeCollection ? 'active' : '']"
          @click="selectCollection(c.name)"
        >
          <span class="collection-name">{{ c.name }}</span>
          <span class="collection-count-badge">{{ c.count }}</span>
        </div>
      </div>
    </div>

    <!-- Collection Data Main -->
    <div class="collection-data-main">
      <div class="data-toolbar flex-between">
        <div class="toolbar-left flex-center gap-2">
          <div class="current-collection-tag">{{ activeCollection || '请选择集合' }}</div>
          <div class="search-box">
            <Search :size="14" class="text-muted" />
            <input
              v-model="filterInput"
              type="text"
              placeholder="JSON过滤条件，例如: { &quot;age&quot;: { &quot;$gte&quot;: 18 } }"
              @keydown.enter="executeQuery"
            />
          </div>
          <button class="btn btn-secondary btn-sm" @click="executeQuery">查询</button>
          <button class="btn btn-ghost btn-sm" @click="resetQuery">重置</button>
        </div>

        <div class="toolbar-right flex-center gap-2">
          <button class="btn btn-success btn-sm" :disabled="!activeCollection" @click="openAddModal">
            <Plus :size="14" />
            <span>添加文档</span>
          </button>
          <button class="btn btn-danger-outline btn-sm" :disabled="!activeCollection" @click="clearCollection">
            <span>清空</span>
          </button>
          <button class="btn btn-danger-outline btn-sm" :disabled="!activeCollection" @click="dropCollection">
            <span>删除集合</span>
          </button>
        </div>
      </div>

      <!-- Data Table -->
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 140px;">ID</th>
              <th>文档内容</th>
              <th style="width: 160px;">创建时间</th>
              <th style="width: 160px;">更新时间</th>
              <th class="text-right" style="width: 130px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="text-center py-8 text-muted">加载数据中...</td>
            </tr>
            <tr v-else-if="!activeCollection">
              <td colspan="5" class="text-center py-8 text-muted">请从左侧选择一个集合</td>
            </tr>
            <tr v-else-if="records.length === 0">
              <td colspan="5" class="text-center py-8 text-muted">当前集合暂无匹配文档记录</td>
            </tr>
            <tr v-for="doc in records" :key="doc.id">
              <!-- ID Column: Supports Integer & String -->
              <td class="align-top">
                <div class="id-wrapper flex-center gap-1">
                  <span v-if="isNumericId(doc.id)" class="numeric-id-badge">
                    #{{ doc.id }}
                  </span>
                  <code v-else class="string-id-badge" :title="String(doc.id)">
                    {{ doc.id }}
                  </code>
                </div>
              </td>

              <!-- Document Content Column: High Contrast & Structured -->
              <td class="align-top">
                <div class="doc-fields-container">
                  <div class="fields-list">
                    <div
                      v-for="(val, key) in extractCustomFields(doc)"
                      :key="key"
                      class="field-item"
                    >
                      <span class="field-key">{{ key }}:</span>
                      <span :class="['field-value', getValTypeClass(val)]">
                        {{ formatFieldValue(val) }}
                      </span>
                    </div>
                  </div>
                  <button
                    class="btn-copy-doc"
                    title="复制完整 JSON"
                    @click="copyDocJson(doc)"
                  >
                    <Copy :size="12" />
                  </button>
                </div>
              </td>

              <!-- Time columns -->
              <td class="align-top text-dim text-xs">{{ formatDate(doc.created_at) }}</td>
              <td class="align-top text-dim text-xs">{{ formatDate(doc.updated_at) }}</td>

              <!-- Actions -->
              <td class="align-top text-right">
                <div class="actions-group flex-end gap-1">
                  <button class="btn btn-xs btn-secondary" @click="openEditModal(doc)">编辑</button>
                  <button class="btn btn-xs btn-danger-outline" @click="deleteDoc(doc.id)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Bar -->
      <div class="pagination-bar flex-between">
        <div class="pagination-info">
          共 <span class="text-primary">{{ totalRecords }}</span> 条记录，第 {{ currentPage }} / {{ Math.max(1, totalPages) }} 页
        </div>
        <div class="pagination-controls flex-center gap-2">
          <button class="btn btn-secondary btn-xs" :disabled="currentPage <= 1" @click="prevPage">
            <ChevronLeft :size="14" /> 上一页
          </button>
          <button class="btn btn-secondary btn-xs" :disabled="currentPage >= totalPages" @click="nextPage">
            下一页 <ChevronRight :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- Document Modal -->
    <DocumentModal
      :is-open="isDocModalOpen"
      :collection-name="activeCollection"
      :doc-id="String(editingDocId)"
      :initial-data="editingDocData"
      @close="isDocModalOpen = false"
      @saved="handleDocSaved"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { Plus, Search, ChevronLeft, ChevronRight, Copy } from 'lucide-vue-next';
import { useLiteDB } from '../composables/useLiteDB.js';
import DocumentModal from './DocumentModal.vue';

const emit = defineEmits(['select-collection']);

const props = defineProps({
  initialCollection: String
});

const {
  collections,
  apiRequest,
  refreshCollections,
  showToast,
  showConfirm,
  openCreateCollection
} = useLiteDB();

const activeCollection = ref(props.initialCollection || '');
const filterInput = ref('');
const records = ref([]);
const totalRecords = ref(0);
const currentPage = ref(1);
const pageSize = ref(15);
const totalPages = ref(1);
const loading = ref(false);

const isDocModalOpen = ref(false);
const editingDocId = ref('');
const editingDocData = ref(null);

watch(() => props.initialCollection, (newVal) => {
  if (newVal && newVal !== activeCollection.value) {
    activeCollection.value = newVal;
    currentPage.value = 1;
    loadData();
  }
});

watch(collections, (newCols) => {
  if (newCols.length > 0 && !activeCollection.value) {
    activeCollection.value = newCols[0].name;
    emit('select-collection', activeCollection.value);
    loadData();
  }
}, { immediate: true });

const selectCollection = (name) => {
  if (activeCollection.value === name) return;
  activeCollection.value = name;
  emit('select-collection', name);
  currentPage.value = 1;
  loadData();
};

const loadData = async () => {
  if (!activeCollection.value) return;
  loading.value = true;

  let filter = {};
  if (filterInput.value.trim()) {
    try {
      filter = JSON.parse(filterInput.value.trim());
    } catch {
      showToast('JSON 过滤条件格式错误，请输入合法 JSON', 'error');
      loading.value = false;
      return;
    }
  }

  try {
    const res = await apiRequest(`/api/collections/${activeCollection.value}/query`, {
      method: 'POST',
      body: {
        filter,
        page: currentPage.value,
        pageSize: pageSize.value,
        sort: { id: 1 }
      }
    });

    records.value = res.data || [];
    totalRecords.value = res.total || 0;
    totalPages.value = Math.max(1, res.totalPages || 1);
  } catch (err) {
    showToast(`加载文档失败: ${err.message}`, 'error');
    records.value = [];
  } finally {
    loading.value = false;
  }
};

const executeQuery = () => {
  currentPage.value = 1;
  loadData();
};

const resetQuery = () => {
  filterInput.value = '';
  currentPage.value = 1;
  loadData();
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    loadData();
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    loadData();
  }
};

const promptCreateCollection = () => {
  openCreateCollection();
};

const clearCollection = async () => {
  if (!activeCollection.value) return;
  const confirmed = await showConfirm({
    title: '清空集合数据',
    message: `确定要清空集合 "${activeCollection.value}" 中的所有数据吗？此操作将永久删除该集合下的所有文档记录，不可恢复！`,
    confirmText: '确认清空',
    cancelText: '取消',
    type: 'danger'
  });
  if (!confirmed) return;

  try {
    await apiRequest(`/api/collections/${activeCollection.value}/clear`, { method: 'POST' });
    showToast('集合已清空', 'success');
    await refreshCollections();
    loadData();
  } catch (err) {
    showToast(`清空失败: ${err.message}`, 'error');
  }
};

const dropCollection = async () => {
  if (!activeCollection.value) return;
  const confirmed = await showConfirm({
    title: '删除数据集合',
    message: `确定要彻底删除集合 "${activeCollection.value}" 及其所有文档数据吗？删除后不可恢复！`,
    confirmText: '确认删除集合',
    cancelText: '取消',
    type: 'danger'
  });
  if (!confirmed) return;

  try {
    await apiRequest(`/api/collections/${activeCollection.value}`, { method: 'DELETE' });
    showToast(`集合 ${activeCollection.value} 已删除`, 'success');
    activeCollection.value = '';
    await refreshCollections();
    if (collections.value.length > 0) {
      activeCollection.value = collections.value[0].name;
      loadData();
    }
  } catch (err) {
    showToast(`删除失败: ${err.message}`, 'error');
  }
};

const openAddModal = () => {
  editingDocId.value = '';
  editingDocData.value = null;
  isDocModalOpen.value = true;
};

const openEditModal = (doc) => {
  editingDocId.value = doc.id;
  editingDocData.value = doc;
  isDocModalOpen.value = true;
};

const handleDocSaved = async ({ id, data }) => {
  try {
    if (id) {
      await apiRequest(`/api/collections/${activeCollection.value}/${id}`, {
        method: 'PUT',
        body: data
      });
      showToast('文档更新成功!', 'success');
    } else {
      await apiRequest(`/api/collections/${activeCollection.value}/insert`, {
        method: 'POST',
        body: data
      });
      showToast('文档添加成功!', 'success');
    }
    isDocModalOpen.value = false;
    await refreshCollections();
    loadData();
  } catch (err) {
    showToast(`保存失败: ${err.message}`, 'error');
  }
};

const deleteDoc = async (docId) => {
  const confirmed = await showConfirm({
    title: '删除文档记录',
    message: `确定删除文档记录 (${docId}) 吗？此操作无法撤销。`,
    confirmText: '确认删除',
    cancelText: '取消',
    type: 'danger'
  });
  if (!confirmed) return;

  try {
    await apiRequest(`/api/collections/${activeCollection.value}/${docId}`, { method: 'DELETE' });
    showToast('文档已删除', 'success');
    await refreshCollections();
    loadData();
  } catch (err) {
    showToast(`删除失败: ${err.message}`, 'error');
  }
};

// Check if ID is a pure integer number
const isNumericId = (id) => {
  if (typeof id === 'number') return true;
  return typeof id === 'string' && /^\d+$/.test(id);
};

// Extract user custom fields excluding id, created_at, updated_at
const extractCustomFields = (doc) => {
  if (!doc) return {};
  const { id, created_at, updated_at, ...custom } = doc;
  return custom;
};

// Value type styling
const getValTypeClass = (val) => {
  if (typeof val === 'string') return 'val-string';
  if (typeof val === 'number') return 'val-number';
  if (typeof val === 'boolean') return 'val-boolean';
  if (val === null || val === undefined) return 'val-null';
  return 'val-object';
};

const formatFieldValue = (val) => {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
};

const copyDocJson = (doc) => {
  const custom = extractCustomFields(doc);
  navigator.clipboard.writeText(JSON.stringify(custom, null, 2)).then(() => {
    showToast('文档 JSON 已复制到剪贴板', 'success');
  });
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
  if (activeCollection.value) {
    loadData();
  }
});
</script>

<style scoped>
.collection-layout {
  display: flex;
  gap: 20px;
  height: calc(100vh - 160px);
}

.collection-sidebar {
  width: 240px;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.collection-sidebar-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.collection-sidebar-header h4 {
  font-size: 0.85rem;
  font-weight: 600;
}

.collection-list-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.collection-nav-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 4px;
}

.collection-nav-item:hover {
  background: var(--table-hover-bg);
  color: var(--text-main);
}

.collection-nav-item.active {
  background: rgba(2, 132, 199, 0.15);
  color: #38bdf8;
  font-weight: 600;
}

.collection-count-badge {
  font-size: 0.7rem;
  background: rgba(128, 128, 128, 0.1);
  padding: 2px 6px;
  border-radius: 10px;
}

.collection-data-main {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.data-toolbar {
  padding: 12px 18px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--table-header-bg);
}

.current-collection-tag {
  font-size: 0.85rem;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  width: 320px;
}

.search-box input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-main);
  font-size: 0.8rem;
  width: 100%;
}

.data-table-container {
  flex: 1;
  overflow: auto;
}

.align-top {
  vertical-align: top;
}

/* ID Badges */
.numeric-id-badge {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.25);
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
}

.string-id-badge {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

/* Document High-Contrast Field Rendering */
.doc-fields-container {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.fields-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.6;
}

.field-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.field-key {
  color: var(--text-muted);
  font-weight: 600;
}

.field-value {
  font-weight: 500;
}

.val-string {
  color: #34d399; /* Clear emerald green for strings */
}

.val-number {
  color: #fbbf24; /* Amber yellow for numbers */
}

.val-boolean {
  color: #c084fc; /* Bright purple for booleans */
}

.val-null {
  color: #94a3b8;
  font-style: italic;
}

.val-object {
  color: #38bdf8;
}

.btn-copy-doc {
  background: transparent;
  border: 1px solid var(--border-subtle);
  color: var(--text-dim);
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}

.btn-copy-doc:hover {
  color: var(--text-main);
  background: var(--table-hover-bg);
  border-color: var(--border-focus);
}

.pagination-bar {
  padding: 10px 18px;
  border-top: 1px solid var(--border-subtle);
  background: var(--table-header-bg);
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>
