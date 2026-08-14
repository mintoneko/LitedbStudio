<template>
  <div class="backup-restore-view">
    <div class="grid-2-cols">
      <!-- Export Card -->
      <div class="content-card">
        <div class="card-header">
          <h3>全量数据导出备份</h3>
          <p class="text-muted text-xs">将所有集合定义与文档导出为标准 JSON 快照</p>
        </div>
        <div class="card-body">
          <p class="text-sm text-muted mb-4">
            导出的 JSON 文件包含了所有集合的完整数据记录，可随时在其他 LiteDB 实例或开发环境中一键还原。
          </p>
          <button class="btn btn-primary" :disabled="downloading" @click="downloadBackup">
            <Download :size="16" />
            <span>{{ downloading ? '正在导出...' : '下载 JSON 备份快照' }}</span>
          </button>
        </div>
      </div>

      <!-- Import Card -->
      <div class="content-card">
        <div class="card-header">
          <h3>全量数据导入恢复</h3>
          <p class="text-muted text-xs">通过 JSON 快照文件或粘贴数据还原集合与记录</p>
        </div>
        <div class="card-body">
          <input
            ref="fileInput"
            type="file"
            accept=".json"
            style="display: none;"
            @change="handleFileChange"
          />
          <button class="btn btn-secondary" @click="triggerFileInput">
            <Upload :size="16" />
            <span>选择 JSON 文件导入</span>
          </button>

          <div class="mt-4">
            <label class="text-xs text-muted mb-2 block">或者直接在此粘贴 JSON 快照数据:</label>
            <textarea
              v-model="pasteJson"
              class="form-input"
              style="height: 100px; font-family: var(--font-mono); font-size: 0.8rem;"
              placeholder="{ &quot;version&quot;: &quot;1.0.0&quot;, &quot;collections&quot;: { ... } }"
            ></textarea>
            <button
              class="btn btn-secondary btn-sm mt-2"
              :disabled="!pasteJson.trim() || importing"
              @click="importPastedData"
            >
              {{ importing ? '导入中...' : '立即导入粘贴的数据' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Download, Upload } from 'lucide-vue-next';
import { useLiteDB } from '../composables/useLiteDB.js';

const { apiRequest, refreshCollections, refreshStats, showToast, showConfirm } = useLiteDB();

const fileInput = ref(null);
const pasteJson = ref('');
const downloading = ref(false);
const importing = ref(false);

const downloadBackup = async () => {
  downloading.value = true;
  try {
    const snapshot = await apiRequest('/api/system/export');
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `litedb-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('备份快照下载完成!', 'success');
  } catch (err) {
    showToast(`导出失败: ${err.message}`, 'error');
  } finally {
    downloading.value = false;
  }
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const json = JSON.parse(evt.target.result);
      await executeImport(json);
    } catch (err) {
      showToast(`解析文件失败: ${err.message}`, 'error');
    }
  };
  reader.readAsText(file);
};

const importPastedData = async () => {
  try {
    const json = JSON.parse(pasteJson.value.trim());
    await executeImport(json);
    pasteJson.value = '';
  } catch (err) {
    showToast(`JSON 解析失败: ${err.message}`, 'error');
  }
};

const executeImport = async (snapshot) => {
  const confirmed = await showConfirm({
    title: '导入数据快照',
    message: '确定要导入该 JSON 快照吗？导入将恢复快照中包含的集合与文档记录。',
    confirmText: '确认导入',
    cancelText: '取消',
    type: 'warning'
  });
  if (!confirmed) return;

  importing.value = true;
  try {
    await apiRequest('/api/system/import', {
      method: 'POST',
      body: snapshot
    });
    showToast('数据恢复成功！', 'success');
    await refreshCollections();
    await refreshStats();
  } catch (err) {
    showToast(`导入失败: ${err.message}`, 'error');
  } finally {
    importing.value = false;
  }
};
</script>

<style scoped>
.grid-2-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.block {
  display: block;
}

@media (max-width: 900px) {
  .grid-2-cols {
    grid-template-columns: 1fr;
  }
}
</style>
