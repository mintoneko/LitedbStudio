<template>
  <div class="collection-layout">
    <!-- Collections Sidebar -->
    <div class="collection-sidebar">
      <div class="collection-sidebar-header flex-between">
        <h4>集合清单</h4>
        <button v-if="isAdmin" class="btn btn-xs btn-primary" @click="promptCreateCollection">
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
          <div class="collection-nav-right flex-center gap-1">
            <span class="collection-count-badge">{{ c.count }}</span>
            <button
              v-if="isAdmin"
              class="btn-nav-delete"
              :aria-label="`删除集合 ${c.name}`"
              @click.stop="dropCollectionByName(c.name)"
            >
              <Trash2 :size="12" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Collection Data Main -->
    <div class="collection-data-main">
      <!-- Top Toolbar -->
      <div class="data-toolbar flex-between">
        <div class="toolbar-left flex-center gap-2">
          <div v-if="activeCollection" class="current-collection-tag">{{ activeCollection }}</div>
          <div class="search-box">
            <Search :size="14" class="text-muted" />
            <input
              v-model="filterInput"
              type="text"
              :disabled="!activeCollection"
              placeholder="输入 JSON 过滤条件"
              @keydown.enter="executeQuery"
            />
          </div>
          <button class="btn btn-secondary btn-sm" :disabled="!activeCollection" @click="executeQuery">查询</button>
          <button class="btn btn-ghost btn-sm" :disabled="!activeCollection" @click="resetQuery">重置</button>
        </div>

        <div class="toolbar-right flex-center gap-2">
          <button
            v-if="isWrite"
            class="btn-icon-action btn-add-action"
            aria-label="添加文档"
            :disabled="!activeCollection"
            @click="openAddModal"
          >
            <Plus :size="16" />
          </button>
          <button
            v-if="isAdmin"
            class="btn-icon-action btn-clear-action"
            aria-label="清空当前集合"
            :disabled="!activeCollection"
            @click="clearCollection"
          >
            <Eraser :size="16" />
          </button>
          <button
            v-if="isAdmin"
            class="btn-icon-action btn-delete-action"
            aria-label="删除当前集合"
            :disabled="!activeCollection"
            @click="dropCollectionByName(activeCollection)"
          >
            <FolderMinus :size="16" />
          </button>
        </div>
      </div>

      <div v-if="records.length > 0" class="table-scroll-note">
        可左右滑动查看完整字段
      </div>

      <!-- Data Table Area -->
      <div class="data-table-container">
        <table class="data-table" :class="{ 'has-records': records.length > 0 }">
          <thead>
            <tr>
              <th style="width: 90px;">ID</th>
              <th>文档数据</th>
              <th style="width: 160px;">创建时间</th>
              <th style="width: 160px;">更新时间</th>
              <th class="text-right" style="width: 150px; white-space: nowrap;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="text-center py-8 text-muted">加载数据中...</td>
            </tr>
            <tr v-else-if="!activeCollection || collections.length === 0">
              <td colspan="5" class="text-center py-8 text-muted">暂无选中集合，请在左侧新建或选择集合</td>
            </tr>
            <tr v-else-if="records.length === 0">
              <td colspan="5" class="text-center py-8 text-muted">当前集合暂无匹配文档记录</td>
            </tr>
            <tr v-for="doc in records" :key="doc.id" class="doc-row">
              <!-- ID Column -->
              <td>
                <span v-if="isNumericId(doc.id)" class="numeric-id-badge">
                  #{{ doc.id }}
                </span>
                <code v-else class="string-id-badge">
                  {{ doc.id }}
                </code>
              </td>

              <!-- Clean Document Action Button Column -->
              <td style="white-space: nowrap;">
                <button
                  class="btn-view-doc"
                  @click="openViewModal(doc)"
                >
                  <Eye :size="14" class="icon-eye" />
                  <span class="btn-text">查看文档</span>
                </button>
              </td>

              <!-- Timestamps -->
              <td class="text-dim text-xs">{{ formatDate(doc.created_at) }}</td>
              <td class="text-dim text-xs">{{ formatDate(doc.updated_at) }}</td>

              <!-- Actions -->
              <td class="text-right" style="white-space: nowrap;">
                <div class="actions-group flex-end gap-2">
                  <button
                    class="btn-icon-action btn-copy-action"
                    aria-label="复制文档 JSON"
                    @click="copyDocJson(doc)"
                  >
                    <Copy :size="14" />
                  </button>
                  <button
                    v-if="isWrite"
                    class="btn-icon-action btn-edit-action"
                    aria-label="编辑文档"
                    @click="openEditModal(doc)"
                  >
                    <Edit3 :size="14" />
                  </button>
                  <button
                    v-if="isWrite"
                    class="btn-icon-action btn-delete-action"
                    aria-label="删除文档"
                    @click="deleteDoc(doc.id)"
                  >
                    <Trash2 :size="14" />
                  </button>
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

    <!-- View Document Modal -->
    <ViewDocumentModal
      :is-open="isViewModalOpen"
      :collection-name="activeCollection"
      :doc-data="viewingDocData"
      @close="isViewModalOpen = false"
      @edit="handleEditFromView"
    />

    <!-- Edit/Add Document Modal -->
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
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Edit3,
  Trash2,
  Eraser,
  FolderMinus
} from 'lucide-vue-next';
import { useLiteDB } from '../composables/useLiteDB.js';
import DocumentModal from './DocumentModal.vue';
import ViewDocumentModal from './ViewDocumentModal.vue';

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
  openCreateCollection,
  isAdmin,
  isWrite,
  isReadOnly
} = useLiteDB();

const activeCollection = ref(props.initialCollection || '');
const filterInput = ref('');
const records = ref([]);
const totalRecords = ref(0);
const currentPage = ref(1);
const pageSize = ref(15);
const totalPages = ref(1);
const loading = ref(false);

// Modals state
const isViewModalOpen = ref(false);
const viewingDocData = ref(null);

const isDocModalOpen = ref(false);
const editingDocId = ref('');
const editingDocData = ref(null);

watch(() => props.initialCollection, (newVal) => {
  const target = newVal || '';
  if (target !== activeCollection.value) {
    activeCollection.value = target;
    currentPage.value = 1;
    if (activeCollection.value) {
      loadData();
    } else {
      records.value = [];
      totalRecords.value = 0;
    }
  }
});

watch(collections, (newCols) => {
  if (!newCols || newCols.length === 0) {
    if (activeCollection.value !== '') {
      activeCollection.value = '';
      records.value = [];
      totalRecords.value = 0;
      emit('select-collection', '');
    }
    return;
  }

  // If activeCollection is empty or does not exist in the new collections list
  if (!activeCollection.value || !newCols.some(c => c.name === activeCollection.value)) {
    activeCollection.value = newCols[0].name;
    emit('select-collection', activeCollection.value);
    currentPage.value = 1;
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

const dropCollectionByName = async (colName) => {
  const target = colName || activeCollection.value;
  if (!target) return;
  const confirmed = await showConfirm({
    title: '删除数据集合',
    message: `确定要彻底删除集合 "${target}" 及其所有文档数据吗？删除后不可恢复！`,
    confirmText: '确认删除集合',
    cancelText: '取消',
    type: 'danger'
  });
  if (!confirmed) return;

  try {
    await apiRequest(`/api/collections/${target}`, { method: 'DELETE' });
    showToast(`集合 ${target} 已删除`, 'success');
    await refreshCollections();
    if (!collections.value || collections.value.length === 0) {
      activeCollection.value = '';
      records.value = [];
      totalRecords.value = 0;
      emit('select-collection', '');
    } else if (activeCollection.value === target) {
      selectCollection(collections.value[0].name);
    }
  } catch (err) {
    showToast(`删除失败: ${err.message}`, 'error');
  }
};

// View Modal
const openViewModal = (doc) => {
  viewingDocData.value = doc;
  isViewModalOpen.value = true;
};

const handleEditFromView = (doc) => {
  isViewModalOpen.value = false;
  openEditModal(doc);
};

// Edit / Add Modal
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

const getCustomFieldCount = (doc) => {
  if (!doc) return 0;
  return Object.keys(extractCustomFields(doc)).length;
};

const getDocSnippet = (doc) => {
  if (!doc) return '{}';
  const custom = extractCustomFields(doc);
  const entries = Object.entries(custom);
  if (entries.length === 0) return '{ (空内容) }';
  
  const preview = entries.slice(0, 3).map(([k, v]) => {
    let strVal = '';
    if (typeof v === 'string') {
      strVal = `"${v.length > 20 ? v.slice(0, 20) + '...' : v}"`;
    } else if (typeof v === 'object' && v !== null) {
      strVal = Array.isArray(v) ? `[...${v.length}]` : '{...}';
    } else {
      strVal = String(v);
    }
    return `${k}: ${strVal}`;
  }).join(', ');

  return `{ ${preview}${entries.length > 3 ? ', ...' : ''} }`;
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
  color: var(--color-primary);
  font-weight: 600;
}

.collection-count-badge {
  font-size: 0.7rem;
  background: rgba(128, 128, 128, 0.1);
  padding: 2px 6px;
  border-radius: 10px;
}

.collection-nav-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-nav-delete {
  background: transparent;
  border: none;
  color: var(--text-dim);
  width: 22px;
  height: 22px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
  padding: 0;
}

.collection-nav-item:hover .btn-nav-delete {
  opacity: 1;
}

.btn-nav-delete:hover {
  color: #ffffff;
  background: var(--color-danger);
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
  gap: 12px;
}

.current-collection-tag {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-primary);
  background: rgba(2, 132, 199, 0.1);
  border: 1px solid rgba(2, 132, 199, 0.2);
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

.table-scroll-note {
  display: none;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.doc-row {
  transition: background-color 0.15s ease;
}

.doc-row:hover {
  background-color: var(--table-hover-bg);
}

/* Document View Button */
.btn-view-doc {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-main);
  font-size: 0.82rem;
  font-weight: 500;
  padding: 6px 14px;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.btn-view-doc span {
  white-space: nowrap;
}

.btn-view-doc:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(2, 132, 199, 0.08);
  box-shadow: 0 2px 6px rgba(2, 132, 199, 0.15);
  transform: translateY(-1px);
}

.icon-eye {
  color: var(--color-primary);
}

.badge-field-count {
  font-size: 0.72rem;
  font-family: var(--font-mono);
  background: rgba(2, 132, 199, 0.1);
  color: var(--color-primary);
  border: 1px solid rgba(2, 132, 199, 0.2);
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}

/* ID Badges */
.numeric-id-badge {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-primary);
  background: rgba(2, 132, 199, 0.12);
  border: 1px solid rgba(2, 132, 199, 0.25);
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
}

.string-id-badge {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-primary);
  background: rgba(2, 132, 199, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
}

.actions-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.btn-icon-action {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--bg-input);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.btn-icon-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.btn-copy-action:hover:not(:disabled) {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: rgba(2, 132, 199, 0.12);
  transform: translateY(-1px);
}

.btn-add-action {
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.35);
  background: rgba(16, 185, 129, 0.08);
}

.btn-add-action:hover:not(:disabled) {
  color: #ffffff;
  border-color: #10b981;
  background: #10b981;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.btn-clear-action {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.08);
}

.btn-clear-action:hover:not(:disabled) {
  color: #ffffff;
  border-color: #f59e0b;
  background: #f59e0b;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.btn-edit-action:hover:not(:disabled) {
  color: #f59e0b;
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
  transform: translateY(-1px);
}

.btn-delete-action {
  color: var(--color-danger);
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.08);
}

.btn-delete-action:hover:not(:disabled) {
  color: #ffffff;
  border-color: var(--color-danger);
  background: var(--color-danger);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

/* Pagination */
.pagination-bar {
  padding: 10px 18px;
  border-top: 1px solid var(--border-subtle);
  background: var(--table-header-bg);
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Mobile & Tablet Adaptation */
@media (max-width: 860px) {
  .collection-layout {
    flex-direction: column;
    height: auto;
    min-height: calc(100vh - 120px);
    gap: 12px;
  }

  .collection-sidebar {
    width: 100%;
    border-radius: var(--radius-sm);
  }

  .collection-list-nav {
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    gap: 6px;
    padding: 8px 12px;
  }

  .collection-nav-item {
    margin-bottom: 0;
    white-space: nowrap;
    flex-shrink: 0;
    padding: 6px 12px;
    border-radius: 20px;
    background: var(--table-hover-bg);
  }

  .collection-nav-item.active {
    background: var(--color-primary);
    color: #ffffff;
  }

  .collection-nav-item.active .collection-count-badge {
    background: rgba(255, 255, 255, 0.25);
    color: #ffffff;
  }

  .data-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px;
  }

  .toolbar-left {
    flex-wrap: wrap;
    width: 100%;
    gap: 6px;
  }

  .search-box {
    width: 100%;
    order: 3;
  }

  .toolbar-right {
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 6px;
    border-top: 1px solid var(--border-subtle);
    padding-top: 8px;
  }

  .table-scroll-note {
    display: block;
    padding: 6px 12px;
    border-bottom: 1px solid var(--border-subtle);
    background: var(--table-header-bg);
    color: var(--text-dim);
    font-size: 0.7rem;
    text-align: right;
  }

  .collection-data-main .data-table.has-records {
    min-width: 680px;
  }

  .pagination-bar {
    flex-direction: column;
    gap: 10px;
    align-items: center;
  }
}
</style>
